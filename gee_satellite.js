%%writefile gee_preprocess.js

var tehri_dam_location = ee.Geometry.Point([78.4806, 30.3804]);
var analysis_area = tehri_dam_location.buffer(20000).bounds();

//  CLOUD MASKING FUNCTION
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var mask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10)).and(scl.neq(11));
  return image.updateMask(mask);
}

//  FILTERING IMAGE COLLECTION ( datawise filtering - recent data )
var imageCollection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                      .filterDate('2023-01-01', '2023-12-31')
                      .filterBounds(analysis_area)
                      .map(maskS2clouds);

// FUNCTION TO CALCULATE WATER AREA
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

// APPLYING THE AREA CALCULATION
var featureCollection = imageCollection.map(calculateWaterArea);
var filteredCollection = featureCollection.filter(ee.Filter.notNull(['water_area_sq_m']));

// CREATING THE TIME-SERIES CHART
var chart = ui.Chart.feature.byFeature({
    features: filteredCollection, xProperty: 'system:time_start', yProperties: ['water_area_sq_m']
  }).setOptions({
    title: 'Water Surface Area in Tehri Dam (2023) - Cleaned Data',
    vAxis: {title: 'Area (square meters)'}, hAxis: {title: 'Date'},
    pointSize: 4, lineWidth: 0, legend: {position: 'none'}
  });

//  PRINTING THE CHART
print(chart);

// VISUALIZING THE RESULTS ON THE MAP
var postMonsoonImage = imageCollection
                        .filterDate('2023-09-01', '2023-11-30')
                        .median()
                        .clip(analysis_area);
var waterMaskVis = postMonsoonImage.normalizedDifference(['B3', 'B8']).gt(0);

Map.centerObject(tehri_dam_location, 11);
Map.addLayer(analysis_area, {color: 'black'}, 'Analysis Area Boundary'); // Black boundary
Map.addLayer(waterMaskVis.selfMask(), {palette: 'blue'}, 'Water Mask'); // Blue water area

// EXPORTING THE DATA
Export.table.toDrive({
  collection: filteredCollection,
  description: 'tehri_dam_area_timeseries',
  fileFormat: 'CSV',
  selectors: ['system:time_start', 'water_area_sq_m']
});
