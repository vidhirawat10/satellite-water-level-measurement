import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});
const MapUpdater = ({ polygon }) => {
  const map = useMap();

  useEffect(() => {
    if (polygon && polygon.coordinates) {
      try {
        const geoJsonLayer = L.geoJSON(polygon);
        const bounds = geoJsonLayer.getBounds();

        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50] });
        }
      } catch (e) {
        console.error("Could not fit map to polygon bounds:", e);
      }
    }
  }, [polygon, map]); 

  return null; 
};


const MapView = ({ searchData }) => {
  const defaultPosition = [20.5937, 78.9629];
  const defaultZoom = 5;

  const tileUrl = searchData?.tileUrl;
  const waterPolygon = searchData?.waterPolygon;

  return (
    <MapContainer
      center={defaultPosition}
      zoom={defaultZoom}
      style={{ height: '500px', width: '100%', borderRadius: '8px' }}
      scrollWheelZoom={true}
    >
      {/* --- Layers --- */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {tileUrl && <TileLayer url={tileUrl} tms={false} />}
      {waterPolygon?.coordinates && (
        <GeoJSON
          key={JSON.stringify(waterPolygon)}
          data={waterPolygon}
          style={{ color: '#00BFFF', weight: 2, fillOpacity: 0.5 }}
        />
      )}

      {/* --- Controller --- */}
      {/* This component will handle the auto-zooming */}
      <MapUpdater polygon={waterPolygon} />
    </MapContainer>
  );
};

export default MapView;