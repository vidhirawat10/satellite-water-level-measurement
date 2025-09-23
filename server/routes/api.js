const express = require('express');
const router = express.Router();
const axios = require('axios');
const ee = require('@google/earthengine');
const { createClient } = require('@supabase/supabase-js');

let geeInitialized = false;

// Authenticate and initialize Google Earth Engine
const initializeGEE = () => {
    ee.data.authenticateViaPrivateKey(privateKey, () => {
        ee.initialize(null, null, () => {
            geeInitialized = true;
            console.log('GEE Initialized Successfully.');
        }, (err) => { console.error('GEE Initialization Error:', err); });
    }, (err) => { console.error('GEE Authentication Error:', err); });
};
initializeGEE();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


// ROUTE 1: /api/search (Uses OpenCage Geocoder)
router.post('/search', async (req, res) => {
    console.log('\n--- Received new request on /api/search ---');
    if (!geeInitialized) {
        return res.status(503).json({ error: 'GEE is not initialized.' });
    }
    
    const { damName } = req.body;
    console.log(`Searching for dam: "${damName}"`);

    try {
        const query = `${damName}, India`;
        const geocodeUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${process.env.OPENCAGE_API_KEY}&limit=1&countrycode=in`;
        
        console.log("Requesting URL:", geocodeUrl);
        const geoResponse = await axios.get(geocodeUrl);

        if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
            console.error('Geocoding failed: Location not found via OpenCage.');
            return res.status(404).json({ error: 'Could not find the location in India.' });
        }

        const { lng, lat } = geoResponse.data.results[0].geometry;
        console.log(`Step 1: Geocoded successfully to [Lon: ${lng}, Lat: ${lat}]`);
        
        const point = ee.Geometry.Point([lng, lat]);
        const analysisArea = point.buffer(20000); // 20km buffer

        // --- GEE Image Processing (No changes here) ---
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
        console.log('Step 2: Created a clean composite satellite image.');
        
        const ndwi = compositeImage.normalizedDifference(['B3', 'B8']);
        const waterMask = ndwi.gt(0);
        console.log('Step 3: Calculated NDWI and created water mask.');

        const allWaterVectors = waterMask.selfMask().reduceToVectors({
            geometry: analysisArea, scale: 90, maxPixels: 1e9
        });
        
        const largestPolygonFeature = allWaterVectors
            .map(f => f.set('area', f.geometry().area(1)))
            .sort('area', false)
            .first();
        console.log('Step 4: Identified the largest potential water polygon.');

        // --- START: ASYNCHRONOUS EVALUATION WITH PROMISES ---

        // Promise to get the map tile URL
        const getMapIdPromise = new Promise((resolve, reject) => {
            const visParams = { bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3 };
            compositeImage.getMap(visParams, (mapIdObject, error) => {
                if (error) {
                    return reject(new Error(`GEE getMapId Error: ${error}`));
                }
                resolve(mapIdObject);
            });
        });

        // Promise to get the polygon geometry
        const getGeometryPromise = new Promise((resolve, reject) => {
            // Use an ee.Algorithms.If to handle cases where no polygon is found
            const feature = ee.Algorithms.If(
                largestPolygonFeature,
                largestPolygonFeature,
                // Create a placeholder if no feature exists to avoid errors
                ee.Feature(null, {'no_polygon_found': true}) 
            );

            feature.evaluate((evaluatedFeature, error) => {
                if (error) {
                    return reject(new Error(`GEE Geometry Evaluation Error: ${error}`));
                }
                if (evaluatedFeature.properties.no_polygon_found || !evaluatedFeature.geometry) {
                    return reject(new Error('Could not find a distinct water body at this location.'));
                }
                resolve(evaluatedFeature.geometry);
            });
        });

        const [mapId, geometry] = await Promise.all([getMapIdPromise, getGeometryPromise]);

        console.log('Step 5: Successfully extracted polygon and mapId. Sending to client.');
        
        await supabase.from('searches').insert([{ dam_name: damName, lat: lat, lon: lng }]);
        
        res.json({
            coords: { lat, lon: lng },
            tileUrl: mapId.urlFormat, 
            waterPolygon: geometry
        });

    } catch (error) {
        console.error("CRITICAL CRASH in /search route:", error.message);
        res.status(500).json({ error: error.message || 'An unexpected error occurred on the server.' });
    }
});


// ROUTE 2: /api/analyze 
router.post('/analyze', (req, res) => {
    console.log('\n--- Received new request on /api/analyze ---');
    if (!geeInitialized) {
        console.error('Analyze failed: GEE not initialized.');
        return res.status(503).json({ error: 'GEE is not initialized.' });
    }
    try {
        const { waterPolygon } = req.body;
        console.log('Step 6: Received polygon for analysis.');
        const geometry = ee.Geometry(waterPolygon, null, false);
        const dem = ee.Image('USGS/SRTMGL1_003');

        const robustReducer = ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true).combine(ee.Reducer.percentile([10]), '', true);

        const elevationMetrics = dem.reduceRegion({
            reducer: robustReducer,
            geometry: geometry, scale: 30, maxPixels: 1e9
        });

        elevationMetrics.evaluate((metrics, error) => {
            if (error) {
                console.error('GEE ERROR during elevation analysis:', error);
                return res.status(500).json({ error: 'Failed to analyze elevation.' });
            }
            if (!metrics || (metrics.elevation_mean === null)) {
                console.error('CRITICAL FAILURE: Could not calculate elevation. Metrics were null.', metrics);
                return res.status(500).json({ error: 'Could not determine surface elevation.' });
            }
            console.log('Step 7: Calculated elevation metrics:', metrics);
            
            const summaryStats = { min: metrics.elevation_min, mean: metrics.elevation_mean, max: metrics.elevation_max };
            
            const surfaceHeight = metrics.elevation_p10; 
            const depthLevels = ee.List([0, -2, -5, -10, -15, -20]);

            const areaCalculations = depthLevels.map((depth) => {
                const absoluteElevation = ee.Number(surfaceHeight).add(depth);
                const waterAtLevel = dem.lte(absoluteElevation).selfMask().clip(geometry);
                
                const area = waterAtLevel.multiply(ee.Image.pixelArea()).reduceRegion({
                    reducer: ee.Reducer.sum(),
                    geometry: geometry,
                    scale: 30,
                    maxPixels: 1e9
                }).get('elevation');

                return ee.Dictionary({ 'depth': depth, 'area_sqm': area, 'elevation': absoluteElevation });
            });

            areaCalculations.evaluate((tieredResults, err) => {
                if (err) {
                    console.error('GEE ERROR during tiered area calculation:', err);
                    return res.status(500).json({ error: 'Failed to analyze area at levels.' });
                }
                console.log('Step 8: Calculated tiered results. Sending to client.');
                res.json({ analysis: { summaryStats, tieredResults } });
            });
        });
    } catch (error) {
        console.error("CRITICAL CRASH in /analyze route:", error);
        res.status(500).json({ error: 'An error occurred during analysis.' });
    }
});


// ROUTE: /api/timeseries
router.post('/timeseries', (req, res) => {
    console.log('\n--- Received new request on /api/timeseries ---');
    if (!geeInitialized) {
        return res.status(503).json({ error: 'GEE is not initialized.' });
    }

    const { waterPolygon, startDate, endDate } = req.body;
    if (!waterPolygon || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }
    
    try {
        const aoi = ee.Geometry(waterPolygon, null, false);
        const dem = ee.Image('USGS/SRTMGL1_003');
        
        const imageCollection = ee.ImageCollection('COPERNICUS/S2_SR')
            .filterBounds(aoi)
            .filterDate(ee.Date(startDate), ee.Date(endDate));

        const calculateWaterLevel = function(image) {
            const scl = image.select('SCL');
            const mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9));

            const ndwi = image.normalizedDifference(['B3', 'B8']).updateMask(mask);
            const waterMask = ndwi.gt(0);

            const robustReducer = ee.Reducer.percentile([10]);
            
            const waterElevation = dem.updateMask(waterMask).reduceRegion({
                reducer: robustReducer,
                geometry: aoi,
                scale: 30,
                maxPixels: 1e9
            }).get('elevation');

            return image.set({
                'waterLevel': waterElevation,
                'date': image.date().format('YYYY-MM-dd')
            });
        };

        const timeSeries = imageCollection.map(calculateWaterLevel);
        const filteredTimeSeries = timeSeries.filter(ee.Filter.notNull(['waterLevel']));

        filteredTimeSeries.evaluate((result, error) => {
            if (error) {
                console.error('GEE ERROR during time-series analysis:', error);
                return res.status(500).json({ error: 'Failed to perform time-series analysis.' });
            }
            
            const cleanData = result.features.map(f => ({
                date: f.properties.date,
                waterLevel: parseFloat(f.properties.waterLevel.toFixed(2))
            }));
            
            cleanData.sort((a, b) => new Date(a.date) - new Date(b.date));

            console.log(`Time-series analysis complete. Found ${cleanData.length} data points.`);
            res.json({ timeSeriesData: cleanData });
        });

    } catch (error) {
        console.error("CRITICAL CRASH in /timeseries route:", error);
        res.status(500).json({ error: 'An error occurred during time-series analysis.' });
    }
});


// ROUTE 4: /api/history
router.get('/history', async (req, res) => {
    try {
        const { data, error } = await supabase.from('searches').select('*').order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch search history.' });
    }
});

module.exports = router;