const express = require('express');
const router = express.Router();
const axios = require('axios');
const ee = require('@google/earthengine');
const { createClient } = require('@supabase/supabase-js');

// --- [NEW ADDITIONS] ---
// Import the new decision logic function
const { decideGateAction } = require('../decision_logic.js'); 
// Import Node.js built-in modules for reading files
const fs = require('fs').promises; 
const path = require('path'); 
// --- [END NEW ADDITIONS] ---

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY; // prefer SUPABASE_KEY, fall back to older var

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase env variables missing. Make sure SUPABASE_URL and SUPABASE_KEY are set in server/.env');
  // Continue running, but DB operations will likely fail until vars are fixed
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Helper: compute prediction given currentLevel, rate (m/day), damCapacity (m), and reference date
 * Returns null if prediction cannot be computed (no capacity or non-positive rate)
 */
function computePrediction({ currentLevel, rate_m_per_day, damCapacityM, refDate }) {
  if (!damCapacityM || rate_m_per_day === null || rate_m_per_day === undefined) {
    return { message: 'Dam capacity or valid rate unavailable; cannot predict open date.' };
  }
  if (rate_m_per_day <= 0) {
    return { message: 'Level not rising in the provided data; no open predicted.' };
  }

  const remaining = damCapacityM - currentLevel;
  if (remaining <= 0) {
    return { message: 'Already at or above dam capacity.' };
  }

  const daysToOpen = Math.ceil(remaining / rate_m_per_day);
  const predictedDate = new Date(refDate);
  predictedDate.setDate(predictedDate.getDate() + daysToOpen);

  return {
    rate_of_change: parseFloat(rate_m_per_day.toFixed(4)), // m/day
    days_to_open: daysToOpen,
    predicted_open_date: predictedDate.toISOString().slice(0,10),
    predicted_level_at_open: parseFloat((currentLevel + rate_m_per_day * daysToOpen).toFixed(3))
  };
}

/**
 * Helper: safe month-insensitive fuzzy key match for dam_data.json keys vs a dam search string
 */
function findDamInfoFromDb(damDatabase, damName) {
  if (!damDatabase) return null;
  const damKey = Object.keys(damDatabase).find(key => 
    damName.toLowerCase().includes(key.replace(/_/g, " "))
  );
  return damKey ? damDatabase[damKey] : null;
}

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`✅ [SERVER LOG] A user connected with socket ID: ${socket.id}`);
        console.log(`[SERVER LOG] Now listening for a 'start-analysis' event from this user.`);

        socket.on('start-analysis', async (data) => {
            console.log(`[SERVER LOG] Received 'start-analysis' event! Starting process.`);
            
            const { damName } = data;
            console.log(`\n--- [Socket ${socket.id}] analysis for: "${damName}" ---`);

            try {
                const evaluatePromise = (eeObject) => {
                    return new Promise((resolve, reject) => {
                        eeObject.evaluate((result, error) => {
                            if (error) reject(new Error(error));
                            else resolve(result);
                        });
                    });
                };

                // --- STEP 1: Geocoding ---
                socket.emit('analysis-update', { 
                    stage: 1, 
                    message: `Geocoding location for "${damName}"...` 
                });
                const query = `${damName}, India`;
                const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.OPENCAGE_API_KEY}&limit=1&countrycode=in`;
                const geoResponse = await axios.get(geocodeUrl);

                if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
                    throw new Error('Could not find the location in India via OpenCage.');
                }
                const { lng, lat } = geoResponse.data.results[0].geometry;
                console.log(`[Socket ${socket.id}] Step 1: Geocoded to [Lon: ${lng}, Lat: ${lat}]`);


                // --- STEP 2: Analyzing Satellite Imagery ---
                socket.emit('analysis-update', { 
                    stage: 2, 
                    message: 'Analyzing satellite imagery...' 
                });
                const point = ee.Geometry.Point([lng, lat]);
                const analysisArea = point.buffer(20000);

                const maskS2clouds = (image) => {
                    const scl = image.select('SCL');
                    const mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9));
                    return image.updateMask(mask).divide(10000);
                };

                const imageCollection = ee.ImageCollection('COPERNICUS/S2_SR')
                    .filterDate(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10), new Date().toISOString().slice(0, 10))
                    .filterBounds(analysisArea)
                    .map(maskS2clouds);

                const compositeImage = imageCollection.median();
                const ndwi = compositeImage.normalizedDifference(['B3', 'B8']);
                const waterMask = ndwi.gt(0);
                const allWaterVectors = waterMask.selfMask().reduceToVectors({ geometry: analysisArea, scale: 90, maxPixels: 1e9 });

                // --- SAFETY CHECK: ensure the vector collection is not empty before proceeding ---
                let vectorCount;
                try {
                  vectorCount = await evaluatePromise(allWaterVectors.size()); // returns an integer
                } catch (vecErr) {
                  console.warn(`[Socket ${socket.id}] Warning: reduceToVectors returned an error when counting features:`, vecErr.message || vecErr);
                  throw new Error('Failed to process water polygons from satellite imagery.');
                }

                if (!vectorCount || vectorCount === 0) {
                  // No water vectors found — give a friendly error rather than a cryptic GEE error.
                  throw new Error('No water body detected at this location (or imagery is cloudy/unsuitable). Try a different date range or location.');
                }

                // Now compute largest polygon safely
                const largestPolygonFeature = allWaterVectors
                  .map(f => f.set('area', f.geometry().area(1)))
                  .sort('area', false)
                  .first();

                // Evaluate the feature object (not just its geometry) so we can inspect it
                let largestFeatureObj;
                try {
                  largestFeatureObj = await evaluatePromise(largestPolygonFeature);
                } catch (featErr) {
                  console.error(`[Socket ${socket.id}] Error evaluating largest polygon feature:`, featErr.message || featErr);
                  throw new Error('Unable to extract water polygon geometry from satellite vectors.');
                }

                // Defensive check: ensure we have a geometry
                if (!largestFeatureObj || !largestFeatureObj.geometry) {
                  throw new Error('Could not find a distinct water body polygon at this location.');
                }

                // Geometry extracted successfully (GeoJSON-like object)
                const geometry = largestFeatureObj.geometry;
                console.log(`[Socket ${socket.id}] Step 2: Identified largest water polygon.`);


                // --- STEP 3: Extracting Water Boundary ---
                socket.emit('analysis-update', { 
                    stage: 3, 
                    message: 'Extracting precise water boundary...' 
                });
                if (!geometry) {
                    throw new Error('Could not find a distinct water body at this location.');
                }
                console.log(`[Socket ${socket.id}] Step 3: Successfully extracted polygon geometry.`);


                // --- STEP 4: Calculating Elevation Profile ---
                socket.emit('analysis-update', { 
                    stage: 4, 
                    message: 'Calculating elevation profile...' 
                });
                const eeGeometry = ee.Geometry(geometry, null, false);
                const dem = ee.Image('USGS/SRTMGL1_003');
                const robustReducer = ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true).combine(ee.Reducer.percentile([10]), '', true);
                const elevationMetrics = await evaluatePromise(dem.reduceRegion({ reducer: robustReducer, geometry: eeGeometry, scale: 30, maxPixels: 1e9 }));
                
                if (!elevationMetrics || elevationMetrics.elevation_mean === null) {
                    throw new Error('Could not determine surface elevation from DEM.');
                }
                const summaryStats = { min: elevationMetrics.elevation_min, mean: elevationMetrics.elevation_mean, max: elevationMetrics.elevation_max };
                const surfaceHeight = elevationMetrics.elevation_p10;
                const depthLevels = ee.List([0, -2, -5, -10, -15, -20]);
                const areaCalculations = depthLevels.map((depth) => {
                    const absoluteElevation = ee.Number(surfaceHeight).add(depth);
                    const waterAtLevel = dem.lte(absoluteElevation).selfMask().clip(eeGeometry);
                    const area = waterAtLevel.multiply(ee.Image.pixelArea()).reduceRegion({ reducer: ee.Reducer.sum(), geometry: eeGeometry, scale: 30, maxPixels: 1e9 }).get('elevation');
                    return ee.Dictionary({ 'depth': depth, 'area_sqm': area, 'elevation': absoluteElevation });
                });
                const tieredResults = await evaluatePromise(areaCalculations);
                console.log(`[Socket ${socket.id}] Step 4: Calculated elevation metrics.`);


                // --- STEP 5: Compiling Historical Data ---
                socket.emit('analysis-update', { 
                    stage: 5, 
                    message: 'Compiling historical water levels...' 
                });
                const endDate = new Date();
                const startDate = new Date(new Date().setFullYear(endDate.getFullYear() - 5));
                
                const tsImageCollection = ee.ImageCollection('COPERNICUS/S2_SR').filterBounds(eeGeometry).filterDate(ee.Date(startDate), ee.Date(endDate));
                const calculateWaterLevel = (image) => {
                    const scl = image.select('SCL');
                    const mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9));
                    const ndwi = image.normalizedDifference(['B3', 'B8']).updateMask(mask);
                    const waterMask = ndwi.gt(0);
                    const waterElevation = dem.updateMask(waterMask).reduceRegion({ reducer: ee.Reducer.percentile([10]), geometry: eeGeometry, scale: 30, maxPixels: 1e9 }).get('elevation');
                    return image.set({ 'waterLevel': waterElevation, 'date': image.date().format('YYYY-MM-dd') });
                };
                const timeSeries = tsImageCollection.map(calculateWaterLevel);
                const filteredTimeSeries = await evaluatePromise(timeSeries.filter(ee.Filter.notNull(['waterLevel'])));

                const cleanData = filteredTimeSeries.features
                    .map(f => ({
                        date: f.properties.date,
                        waterLevel: f.properties.waterLevel ? parseFloat(f.properties.waterLevel.toFixed(2)) : null
                    }))
                    .filter(item => item.waterLevel !== null)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                console.log(`[Socket ${socket.id}] Step 5: Time-series complete. Found ${cleanData.length} points.`);


                // --- [MODIFIED SECTION START] ---

                // --- [NEW] STEP 5b: Run Decision Logic ---
                let decisionInfo = null; // Default to null
                let damInfo = null;
                if (cleanData && cleanData.length >= 2) {
                    try {
                        // 1. Get the levels from the data we just calculated
                        const todayLevel = cleanData[cleanData.length - 1].waterLevel;
                        const yesterdayLevel = cleanData[cleanData.length - 2].waterLevel;

                        // 2. Load our new dam database
                        const damDataPath = path.resolve(__dirname, '../dam_data.json');
                        const damDataFile = await fs.readFile(damDataPath, 'utf8');
                        const damDatabase = JSON.parse(damDataFile);

                        // 3. Find the matching dam (this is a simple fuzzy match)
                        // It checks if the search "Tehri Dam" includes a key "tehri"
                        damInfo = findDamInfoFromDb(damDatabase, damName);

                        if (damInfo) {
                            // 4. Run the decision logic
                            const { action, info } = decideGateAction({
                                todayLevel: todayLevel,
                                yesterdayLevel: yesterdayLevel,
                                damCapacity: damInfo.capacityM,
                                warnFrac: damInfo.warnFrac,
                                rateThreshold: damInfo.rateThreshold
                            });
                            console.log(`[Socket ${socket.id}] Step 5b: Decision logic complete. Status: ${action}`);
                            decisionInfo = info; // This is the object we'll send to the client
                        } else {
                            console.warn(`[Socket ${socket.id}] No dam capacity info found for "${damName}". Skipping decision logic.`);
                        }
                    } catch (logicError) {
                        console.error(`[Socket ${socket.id}] Error during decision logic:`, logicError.message);
                        // Don't throw; allow the rest of the analysis to proceed
                    }
                } else {
                    console.warn(`[Socket ${socket.id}] Not enough data for decision logic (< 2 points).`);
                }

                // --- STEP 5c: Save to DB and send payload ---
                console.log(`[Socket ${socket.id}] Saving analysis to database...`);

                // Step 5c-1: Save the main search and get its ID
                const { data: searchData, error: searchError } = await supabase
                    .from('searches')
                    .insert([{ dam_name: damName, lat: lat, lon: lng }])
                    .select('id')
                    .single(); // We only inserted one, so get it back

                if (searchError) {
                    console.error('Supabase search insert error:', searchError);
                    throw new Error(`Failed to save search: ${searchError.message}`);
                }
                
                const newSearchId = searchData.id;

                // Step 5c-2: Prepare and save the time-series readings
                if (cleanData && cleanData.length > 0) {
                    const readingsToInsert = cleanData.map(reading => ({
                        search_id: newSearchId,
                        timestamp: reading.date, // 'date' is 'YYYY-MM-dd' string
                        water_level: reading.waterLevel
                    }));
            
                    // Bulk insert all readings
                    const { error: readingsError } = await supabase
                        .from('water_level_readings')
                        .insert(readingsToInsert);
            
                    if (readingsError) {
                        console.error('Supabase readings insert error:', readingsError);
                        console.warn(`[Socket ${socket.id}] Failed to save time-series data. Proceeding anyway.`);
                    } else {
                        console.log(`[Socket ${socket.id}] Saved ${readingsToInsert.length} time-series points.`);
                    }
                } else {
                    console.warn(`[Socket ${socket.id}] No time-series data to save.`);
                }

                // --- [MODIFIED] STEP 5d: Send the payload to the client ---
                // Compute a simple "current" prediction using the last two points (if damInfo available)
                let currentPrediction = null;
                try {
                    if (damInfo && cleanData && cleanData.length >= 2) {
                        const last = cleanData[cleanData.length - 1];
                        const prev = cleanData[cleanData.length - 2];
                        const daysBetween = Math.max(1, Math.round((new Date(last.date) - new Date(prev.date)) / 86400000));
                        const rate = (last.waterLevel - prev.waterLevel) / daysBetween; // m/day
                        currentPrediction = computePrediction({
                            currentLevel: last.waterLevel,
                            rate_m_per_day: rate,
                            damCapacityM: damInfo.capacityM,
                            refDate: new Date(last.date)
                        });
                    } else if (!damInfo) {
                        currentPrediction = { message: 'Dam capacity not found; cannot predict open date.' };
                    } else {
                        currentPrediction = { message: 'Not enough data to compute current prediction.' };
                    }
                } catch (predErr) {
                    console.error(`[Socket ${socket.id}] Error computing current prediction:`, predErr);
                    currentPrediction = { message: 'Error computing current prediction.' };
                }

                const finalPayload = {
                    coords: { lat, lon: lng },
                    waterPolygon: geometry,
                    analysis: { summaryStats, tieredResults },
                    timeSeriesData: cleanData,
                    decision: decisionInfo, // <-- YOUR NEW DATA IS ADDED HERE!
                    currentPrediction // <-- new field: prediction based on last two points
                };

                console.log(`[Socket ${socket.id}] Analysis complete. Sending 'analysis-complete' event.`);
                socket.emit('analysis-complete', { results: finalPayload });

                // --- [MODIFIED SECTION END] ---

            } catch (error) {
                console.error(`[Socket ${socket.id}] CRITICAL ERROR during analysis:`, error.message);
                socket.emit('analysis-error', { message: error.message || 'An unexpected error occurred.' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`❌ [SERVER LOG] User disconnected: ${socket.id}`);
        });
    });

    // --- [NEW] HTTP Route for Water Level Difference ---
// --- [UPDATED] HTTP Route for Water Level Difference ---
router.get('/water-level-difference', async (req, res) => {
  // We need a dam_name to know which dam's data to query
  const { dam_name, start, end } = req.query;

  if (!dam_name || !start || !end) {
    return res.status(400).json({
      error: "Missing 'dam_name', 'start', or 'end' query parameters."
    });
  }

  // Normalize start/end to date-only (YYYY-MM-DD) to match stored timestamps
  let startDateOnly, endDateOnly;
  try {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      throw new Error('Invalid date');
    }
    // Ensure start <= end (swap if needed)
    if (s > e) {
      const tmp = s;
      s.setTime(e.getTime());
      e.setTime(tmp.getTime());
    }
    startDateOnly = s.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    endDateOnly = e.toISOString().slice(0, 10);   // 'YYYY-MM-DD'
  } catch (err) {
    return res.status(400).json({ error: "Invalid 'start' or 'end' date format." });
  }

  try {
    // Step 1: Find the most recent search_id for this dam name.
    const { data: searchData, error: searchError } = await supabase
      .from('searches')
      .select('id')
      .eq('dam_name', dam_name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (searchError || !searchData) {
      throw new Error('Could not find a previous analysis for this dam. Please run a search first.');
    }

    const { id: search_id } = searchData;

    // Step 2: Fetch the water level data for that search_id
    const { data, error } = await supabase
      .from('water_level_readings')
      .select('timestamp, water_level')
      .eq('search_id', search_id)
      .gte('timestamp', startDateOnly) // use normalized date-only
      .lte('timestamp', endDateOnly)   // use normalized date-only
      .order('timestamp', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No data found for the selected range." });
    }

    // Step 3: Calculate the difference
    const start_level = data[0].water_level;
    const end_level = data[data.length - 1].water_level;

    // Compute days between first and last timestamps (avoid zero)
    const startDateObj = new Date(data[0].timestamp);
    const endDateObj = new Date(data[data.length - 1].timestamp);
    let daysBetween = Math.round((endDateObj - startDateObj) / 86400000);
    if (!daysBetween || daysBetween <= 0) daysBetween = 1;

    const difference = end_level - start_level;
    const rate_of_change = difference / daysBetween; // m/day

    // Try to get dam capacity from dam_data.json
    let damCapacityM = null;
    try {
      const damDataPath = path.resolve(__dirname, '../dam_data.json');
      const damDataFile = await fs.readFile(damDataPath, 'utf8');
      const damDatabase = JSON.parse(damDataFile);
      const damInfoRange = findDamInfoFromDb(damDatabase, dam_name);
      if (damInfoRange) damCapacityM = damInfoRange.capacityM;
    } catch (e) {
      // ignore - damCapacityM remains null
    }

    // Build prediction object for the requested range using the rate derived from the range
    const prediction = computePrediction({
      currentLevel: end_level,
      rate_m_per_day: rate_of_change,
      damCapacityM,
      refDate: endDateObj
    });

    // Step 4: Return the full response
    res.json({
      start_level: start_level,
      end_level: end_level,
      difference: parseFloat(difference.toFixed(3)),
      days: daysBetween,
      rate_of_change: parseFloat(rate_of_change.toFixed(4)),
      data: data, // The full array for the chart
      prediction
    });

  } catch (error) {
    console.error("Error fetching water level difference:", error.message);
    res.status(500).json({ error: error.message || "Could not fetch water level data." });
  }
});



    // --- Regular HTTP Routes ---
    // This route is unmodified
    router.get('/history', async (req, res) => {
        try {
            const { data, error } = await supabase.from('searches').select('*').order('created_at', { ascending: false }).limit(10);
            if (error) throw error;
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: 'Could not fetch search history.' });
        }
    });

    return router;
};
