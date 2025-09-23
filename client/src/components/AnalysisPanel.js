import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';

const AnalysisPanel = ({ waterPolygon }) => {
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
const res = await axios.post(
    `${process.env.REACT_APP_API_URL}/api/analyze`,
    { waterPolygon }, 
    { timeout: 60000 }
);
                    
                    const sortedTiers = res.data.analysis.tieredResults.sort((a, b) => a.area_sqm - b.area_sqm);
                    
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

    //  Min/Mean/Max chart
    const chartData = [
        { name: 'Min', elevation: parseFloat(analysis.summaryStats.min.toFixed(2)) },
        { name: 'Mean', elevation: parseFloat(analysis.summaryStats.mean.toFixed(2)) },
        { name: 'Max', elevation: parseFloat(analysis.summaryStats.max.toFixed(2)) },
    ];

    return (
        <div className="analysis-panel">
            <h3>📊 Elevation Profile</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="elevation" fill="#8884d8" name="Elevation (m)" />
                </BarChart>
            </ResponsiveContainer>

            <h3 style={{marginTop: '30px'}}>💧 Water Levels</h3>
            <table>
                <thead>
                    <tr>
                        <th>Depth Level</th>
                        <th>Surface Area (m²)</th>
                        <th>Height Level (m)</th>
                    </tr>
                </thead>
                <tbody>
                    {analysis.tieredResults.map((item) => (
                        <tr key={item.levelLabel}>
                            <td><strong>{item.levelLabel}</strong></td>
                            <td>{item.area_sqm.toLocaleString()}</td>
                            <td>{item.elevation.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="note">Height Level is meters above sea level (SRTM DEM).</p>
        </div>
    );
};

export default AnalysisPanel;
