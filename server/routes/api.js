
const express = require('express');
const router = express.Router();
const axios = require('axios');
const ee = require('@google/earthengine');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
                const largestPolygonFeature = allWaterVectors.map(f => f.set('area', f.geometry().area(1))).sort('area', false).first();
                console.log(`[Socket ${socket.id}] Step 2: Identified largest water polygon.`);


                // --- STEP 3: Extracting Water Boundary ---
                socket.emit('analysis-update', { 
                    stage: 3, 
                    message: 'Extracting precise water boundary...' 
                });
                const geometry = await evaluatePromise(largestPolygonFeature.geometry());
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


                // --- [MODIFIED] FINAL STEP: Save to DB and send payload ---
                console.log(`[Socket ${socket.id}] Saving analysis to database...`);

                // Step 5a: Save the main search and get its ID
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

                // Step 5b: Prepare and save the time-series readings
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
                        // Don't throw an error, just log it. The main analysis was still successful.
                        console.warn(`[Socket ${socket.id}] Failed to save time-series data. Proceeding anyway.`);
                    } else {
                        console.log(`[Socket ${socket.id}] Saved ${readingsToInsert.length} time-series points.`);
                    }
                } else {
                    console.warn(`[Socket ${socket.id}] No time-series data to save.`);
                }

                // Step 5c: Send the payload to the client
                const finalPayload = {
                    coords: { lat, lon: lng },
                    waterPolygon: geometry,
                    analysis: { summaryStats, tieredResults },
                    timeSeriesData: cleanData
                };

                console.log(`[Socket ${socket.id}] Analysis complete. Sending 'analysis-complete' event.`);
                socket.emit('analysis-complete', { results: finalPayload });

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
    router.get('/water-level-difference', async (req, res) => {
      // We need a dam_name to know which dam's data to query
      const { dam_name, start, end } = req.query;

      if (!dam_name || !start || !end) {
        return res.status(400).json({ 
          error: "Missing 'dam_name', 'start', or 'end' query parameters." 
        });
      }

      try {
        // Step 1: Find the most recent search_id for this dam name.
        // This ensures we are querying data for the correct (and latest) analysis.
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

        // Step 2: Fetch the water level data for that search_id within the date range.
        const { data, error } = await supabase
          .from('water_level_readings')
          .select('timestamp, water_level')
          .eq('search_id', search_id)
          .gte('timestamp', start) // Greater than or equal to start time
          .lte('timestamp', end)   // Less than or equal to end time
          .order('timestamp', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
          return res.status(404).json({ error: "No data found for the selected range." });
        }

        // Step 3: Calculate the difference
        const start_level = data[0].water_level;
        const end_level = data[data.length - 1].water_level;
        const difference = end_level - start_level;

        // Step 4: Return the full response
        res.json({
          start_level: start_level,
          end_level: end_level,
          difference: parseFloat(difference.toFixed(2)),
          data: data, // The full array for the chart
        });

      } catch (error) {
        console.error("Error fetching water level difference:", error.message);
        res.status(500).json({ error: error.message || "Could not fetch water level data." });
      }
    });


    // --- Regular HTTP Routes ---
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