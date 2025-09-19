import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

const TimeSeriesChart = ({ waterPolygon }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchTimeSeries = async () => {
        setLoading(true);
        try {
            // UPDATED: Use environment variable for the API URL
            const res = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/timeseries`,
                { waterPolygon }
            );
            
            const formattedData = res.data.timeseries.map(d => ({
                ...d,
                area: parseFloat((d.area / 1e6).toFixed(2))
            }));
            setData(formattedData);
        } catch (err) {
            console.error("Time-series fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    if (waterPolygon) {
        fetchTimeSeries();
    }
}, [waterPolygon]);

    if (!waterPolygon) return <div className="panel-placeholder">Search for a dam to see its historical data.</div>;
    if (loading) return <div className="panel-placeholder">Loading historical data... 📈</div>;
    if (!data || data.length === 0) return <div className="panel-placeholder">Could not retrieve historical data.</div>;

    return (
        <div className="timeseries-panel">
            <h3>Water Surface Area (Last 2 Years)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: 'Area (km²)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => `${value.toLocaleString()} km²`} />
                    <Legend />
                    <Line type="monotone" dataKey="area" stroke="#8884d8" strokeWidth={2} name="Water Surface Area" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TimeSeriesChart;