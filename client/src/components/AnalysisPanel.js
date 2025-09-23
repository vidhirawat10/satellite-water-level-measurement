import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    BarChart, Bar, XAxis, YAxis, 
    Tooltip, Legend, CartesianGrid, ResponsiveContainer 
} from 'recharts';

const AnalysisPanel = ({ waterPolygon, timeSeriesData }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (waterPolygon) {
            const fetchAnalysis = async () => {
                setLoading(true);
                setError(null);
                setAnalysis(null);
                try {
                    const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/analyze`, { waterPolygon }, { timeout: 60000 });
                    const sortedTiers = res.data.analysis.tieredResults.sort((a, b) => b.elevation - a.elevation);
                    const formattedData = {
                        summaryStats: res.data.analysis.summaryStats,
                        tieredResults: sortedTiers.map(item => ({
                            levelLabel: `Surface ${item.depth}m`,
                            area_sqm: item.area_sqm ? parseFloat(item.area_sqm.toFixed(0)) : 0,
                            elevation: item.elevation ? parseFloat(item.elevation.toFixed(2)) : 0
                        }))
                    };
                    setAnalysis(formattedData);
                } catch (err) {
                    console.error("Analysis API call failed:", err);
                    setError("Failed to analyze water levels.");
                } finally {
                    setLoading(false);
                }
            };
            fetchAnalysis();
        }
    }, [waterPolygon]);

    if (loading) return <div className="panel-placeholder">Analyzing... 🔬</div>;
    if (error) return <div className="panel-placeholder error">{error}</div>;
    if (!analysis) return <div className="panel-placeholder">Analysis results will be shown here.</div>;

    const chartData = [
        { name: 'Min', elevation: parseFloat(analysis.summaryStats.min.toFixed(2)) },
        { name: 'Mean', elevation: parseFloat(analysis.summaryStats.mean.toFixed(2)) },
        { name: 'Max', elevation: parseFloat(analysis.summaryStats.max.toFixed(2)) },
    ];

    return (
        <div className="analysis-panel card">
            <h3>📊 Elevation Profile</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="elevation" fill="#8884d8" name="Elevation (m)" />
                </BarChart>
            </ResponsiveContainer>

            <h3 style={{ marginTop: '30px' }}>💧 Water Levels</h3>
            <table>
                <thead><tr><th>Depth Level</th><th>Surface Area (m²)</th><th>Height Level (m)</th></tr></thead>
                <tbody>
                    {analysis.tieredResults.map((item) => (
                        <tr key={item.levelLabel}>
                            <td><strong>{item.levelLabel}</strong></td>
                            <td>{item.area_sqm.toLocaleString()}</td>
                            <td>{item.elevation}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="note">Height Level is meters above sea level (SRTM DEM).</p>

            <hr />
            <h3>💧 Recent Readings</h3>
            {timeSeriesData && timeSeriesData.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Water Level (m)</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timeSeriesData.slice(-5).reverse().map((item, index) => {
                            let change = 'N/A';
                            const originalIndex = timeSeriesData.findIndex(d => d.date === item.date);
                            if (originalIndex > 0) {
                                const previousDay = timeSeriesData[originalIndex - 1];
                                const diff = item.waterLevel - previousDay.waterLevel;
                                const sign = diff >= 0 ? '▲' : '▼';
                                change = `${diff.toFixed(2)}m ${sign}`;
                            }
                            return (
                                <tr key={item.date}>
                                    <td><strong>{item.date}</strong></td>
                                    <td>{item.waterLevel} m</td>
                                    <td style={{ color: change.includes('▲') ? 'green' : 'red' }}>{change}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <p className="note">No recent readings to display. Analyze a time period to see results here.</p>
            )}
        </div>
    );
};

export default AnalysisPanel;