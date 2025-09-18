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
// ROUTE 1: /api/search
// ==========================================================
router.post('/search', async (req, res) => {
    if (!geeInitialized) return res.status(503).json({ error: 'GEE is not initialized.' });
    
    const { damName } = req.body;
    try {
        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(damName)}.json?access_token=${process.env.MAPBOX_API_KEY}`;
        const geoResponse = await axios.get(geocodeUrl);
        if (!geoResponse.data.features || geoResponse.data.features.length === 0) {
            return res.status(404).json({ error: 'Could not find the location.' });
        }
        const [lon, lat] = geoResponse.data.features[0].center;
        const point = ee.Geometry.Point([lon, lat]);

        const image = ee.ImageCollection('COPERNICUS/S2_SR')
            .filterBounds(point).filterDate('2023-01-01', '2025-12-31')
            .sort('CLOUDY_PIXEL_PERCENTAGE').first();
        const visParams = { bands: ['B4', 'B3', 'B2'], min: 0, max: 3000 };
        const mapId = image.getMap(visParams);

        const jrcWater = ee.Image('JRC/GSW1_4/GlobalSurfaceWater').select('max_extent');
        const waterMask = jrcWater.eq(1);
        const vectors = waterMask.selfMask().reduceToVectors({
            geometry: point.buffer(20000), scale: 30, maxPixels: 1e9
        });
        
        vectors.geometry().evaluate(async (geometry, error) => {
            if (error || !geometry) {
                return res.status(500).json({ error: 'Could not extract water body polygon.' });
            }
            await supabase.from('searches').insert([{ dam_name: damName, lat: lat, lon: lon }]);
            res.json({ coords: { lat, lon }, tileUrl: mapId.urlFormat, waterPolygon: geometry });
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred on the server.' });
    }
});

// ==========================================================
// ROUTE 2: /api/analyze (SIMPLIFIED & COMBINED)
// ==========================================================
router.post('/analyze', (req, res) => {
    if (!geeInitialized) return res.status(503).json({ error: 'GEE is not initialized.' });
    try {
        const { waterPolygon } = req.body;
        const geometry = ee.Geometry(waterPolygon);
        const dem = ee.Image('USGS/SRTMGL1_003');

        // Calculate both Min/Mean/Max stats AND the tiered levels
        const elevationMetrics = dem.reduceRegion({
            reducer: ee.Reducer.minMax().combine(ee.Reducer.mean(), '', true),
            geometry: geometry, scale: 30, maxPixels: 1e9
        });

        elevationMetrics.evaluate((metrics, error) => {
            if (error || !metrics || (!metrics.elevation_max && !metrics.elevation_mean)) {
                return res.status(500).json({ error: 'Could not determine surface elevation.' });
            }
            
            const summaryStats = {
                min: metrics.elevation_min,
                mean: metrics.elevation_mean,
                max: metrics.elevation_max
            };

            const surfaceHeight = metrics.elevation_max || metrics.elevation_mean;
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
                    return res.status(500).json({ error: 'Failed to calculate area at levels.' });
                }
                // Send BOTH sets of data back to the frontend
                res.json({ analysis: { summaryStats, tieredResults } });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred during analysis.' });
    }
});

// ==========================================================
// ROUTE 3: /api/history
// ==========================================================
router.get('/history', async (req, res) => {
    try {
        const { data, error } = await supabase.from('searches')
            .select('*').order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Could not fetch search history.' });
    }
});

// ROUTE 4: /api/timeseries has been removed.

module.exports = router;