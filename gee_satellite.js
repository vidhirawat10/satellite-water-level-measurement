%%writefile gee_preprocess.js
// === MENTOR'S FINAL GEE SCRIPT (V6) ===

// STEP 1: DEFINE YOUR AREA OF INTEREST (AOI)
var tehri_dam_location = ee.Geometry.Point([78.4806, 30.3804]);
var analysis_area = tehri_dam_location.buffer(20000).bounds();

// STEP 2: DEFINE A ROBUST CLOUD MASKING FUNCTION
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
  return image.updateMask(mask);
}

// STEP 3: LOAD AND FILTER THE IMAGE COLLECTION
var imageCollection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                      .filterDate('2023-01-01', '2023-12-31')
                      .filterBounds(analysis_area)
                      .map(maskS2clouds);

// STEP 4: CREATE A FUNCTION TO CALCULATE WATER AREA
var calculateWaterArea = function(image) {
  var ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var waterMask = ndwi.gt(0);
  var waterArea = waterMask.multiply(ee.Image.pixelArea()).reduceRegion({
    reducer: ee.Reducer.sum(), geometry: analysis_area, scale: 30, maxPixels: 1e10
  });
  return ee.Feature(null, {
    'system:time_start': image.get('system:time_start'),
    'water_area_sq_m': waterArea.get('NDWI')
  });
};

// STEP 5: APPLY THE AREA CALCULATION
var featureCollection = imageCollection.map(calculateWaterArea);
var filteredCollection = featureCollection.filter(ee.Filter.notNull(['water_area_sq_m']));

// STEP 6: CREATE THE TIME-SERIES CHART
var chart = ui.Chart.feature.byFeature({
    features: filteredCollection, xProperty: 'system:time_start', yProperties: ['water_area_sq_m']
  }).setOptions({
    title: 'Water Surface Area in Tehri Dam (2023) - Cleaned Data',
    vAxis: {title: 'Area (square meters)'}, hAxis: {title: 'Date'},
    pointSize: 4, lineWidth: 0, legend: {position: 'none'}
  });

// STEP 7: PRINT THE CHART
print(chart);

// STEP 8: VISUALIZE THE RESULTS ON THE MAP
// Create a clean post-monsoon image to display the water mask
var postMonsoonImage = imageCollection
                        .filterDate('2023-09-01', '2023-11-30')
                        .median() // Create a single composite image
                        .clip(analysis_area);
var waterMaskVis = postMonsoonImage.normalizedDifference(['B3', 'B8']).gt(0);

Map.centerObject(tehri_dam_location, 11);
Map.addLayer(analysis_area, {color: 'black'}, 'Analysis Area Boundary'); // Black boundary
Map.addLayer(waterMaskVis.selfMask(), {palette: 'blue'}, 'Water Mask'); // Blue water area

// STEP 9: EXPORT THE DATA TO GOOGLE DRIVE AS A CSV
Export.table.toDrive({
  collection: filteredCollection,
  description: 'tehri_dam_area_timeseries',
  fileFormat: 'CSV',
  selectors: ['system:time_start', 'water_area_sq_m']
});

// === END OF SCRIPT ===