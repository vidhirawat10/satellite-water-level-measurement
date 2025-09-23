const express = require('express');
const router = express.Router();
const axios = require('axios');
const ee = require('@google/earthengine');
const { createClient } = require('@supabase/supabase-js');

const privateKey = require('../private-key.json');
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

// ==========================================================
// ROUTE 1: /api/search (FINAL REFINED VERSION)
// ==========================================================
router.post('/search', async (req, res) => {
    console.log('\n--- Received new request on /api/search ---');
    if (!geeInitialized) {
        console.error('Search failed: GEE not initialized.');
        return res.status(503).json({ error: 'GEE is not initialized.' });
    }
    
    const { damName } = req.body;
    console.log(`Searching for dam: "${damName}"`);

    try {
        // === FIX: Added &types=poi and &limit=1 to improve search accuracy ===
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(damName)}.json?country=IN&proximity=78.9629,20.5937&types=poi&limit=1&access_token=${process.env.MAPBOX_API_KEY}`;
        
        const geoResponse = await axios.get(geocodeUrl);
        if (!geoResponse.data.features || geoResponse.data.features.length === 0) {
            console.error('Geocoding failed: Location not found in India.');
            return res.status(404).json({ error: 'Could not find the location in India.' });
        }
        const [lon, lat] = geoResponse.data.features[0].center;
        console.log(`Step 1: Geocoded successfully to [Lon: ${lon}, Lat: ${lat}]`);
        
        const point = ee.Geometry.Point([lon, lat]);
        const analysisArea = point.buffer(20000);

        const maskS2clouds = function(image) {
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
        
        const visParams = { bands: ['B4', 'B3', 'B2'], min: 0, max: 0.3 };
        const mapId = compositeImage.getMap(visParams);

        largestPolygonFeature.geometry().evaluate(async (geometry, error) => {
            if (error || !geometry || (geometry.coordinates && geometry.coordinates.length === 0)) {
                console.error('CRITICAL FAILURE: No valid water polygon was found.');
                return res.status(500).json({ error: 'Could not find a distinct water body at this location.' });
            }

            console.log('Step 5: Successfully extracted polygon. Sending to client.');
            await supabase.from('searches').insert([{ dam_name: damName, lat: lat, lon: lon }]);
            res.json({ coords: { lat, lon }, tileUrl: mapId.urlFormat, waterPolygon: geometry });
        });

    } catch (error) {
        console.error("CRITICAL CRASH in /search route:", error);
        res.status(500).json({ error: 'An unexpected error occurred on the server.' });
    }
});


// ==========================================================
// ROUTE 2: /api/analyze (WITH LOGGING)
// ==========================================================
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

        const elevationMetrics = dem.reduceRegion({
            reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
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
            const surfaceHeight = metrics.elevation_mean;
            const depthLevels = ee.List([0, -2, -5, -10, -15, -20]);

            const areaCalculations = depthLevels.map((depth) => {
                const absoluteElevation = ee.Number(surfaceHeight).add(depth);
                const waterAtLevel = dem.lte(absoluteElevation).selfMask().clip(geometry);
                const area = waterAtLevel.multiply(ee.Image.pixelArea()).reduceRegion({
                    reducer: ee.Reducer.sum(), geometry: geometry, scale: 30, maxPixels: 1e9
                }).get('elevation');
                return ee.Dictionary({ 'depth': depth, 'area_sqm': area, 'elevation': absoluteElevation });
            });

            areaCalculations.evaluate((tieredResults, err) => {
                if (err) {
                    console.error('GEE ERROR during tiered area calculation:', err);
                    return res.status(500).json({ error: 'Failed to calculate area at levels.' });
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

// ==========================================================
// ROUTE 3: /api/history
// ==========================================================
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