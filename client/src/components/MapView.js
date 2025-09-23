import React from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// zoom in - zoom out
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    map.setView(center, zoom);
    return null;
};

const MapView = ({ searchData }) => {
    //  default map view
    const defaultPosition = [20.5937, 78.9629]; 

    if (!searchData) {
        return (
            <div className="map-placeholder">
                <p>🗺️ The map will appear here once you search for a location.</p>
                <MapContainer center={defaultPosition} zoom={5} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                </MapContainer>
            </div>
        );
    }

    const { coords, tileUrl, waterPolygon } = searchData;
    const position = [coords.lat, coords.lon];

    return (
        <MapContainer center={position} zoom={13} style={{ height: '500px', width: '100%', borderRadius: '8px' }}>
            <ChangeView center={position} zoom={13} />
            {/* Base map layer */}
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {/* GEE Satellite Image Overlay */}
            {tileUrl && <TileLayer url={tileUrl} tms={false} />}

            {/* Water Body Polygon from GEE */}
            {waterPolygon && <GeoJSON data={waterPolygon} style={{ color: '#00BFFF', weight: 2, fillOpacity: 0.5 }} />}
        </MapContainer>
    );
};

export default MapView;
