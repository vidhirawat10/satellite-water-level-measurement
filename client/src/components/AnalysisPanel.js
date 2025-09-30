import React from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, 
    Tooltip, Legend, CartesianGrid, ResponsiveContainer 
} from 'recharts';

// A small helper component to show changes with colored arrows
const ChangeIndicator = ({ change }) => {
    if (change === null || isNaN(change)) {
        return <span>-</span>;
    }
    const isPositive = change > 0;
    const color = isPositive ? 'green' : 'red';
    const arrow = isPositive ? '▲' : '▼';

    return (
        <span style={{ color, fontWeight: 'bold' }}>
            {change.toFixed(2)}m {arrow}
        </span>
    );
};


const AnalysisPanel = ({ analysisData, timeSeriesData }) => {
    // If there's no data yet, show a placeholder
    if (!analysisData || !timeSeriesData) {
        return (
            <div className="analysis-panel card">
                <h3>📊 Analysis Dashboard</h3>
                <p className="panel-placeholder">Analysis results will be shown here after a search.</p>
            </div>
        );
    }
    
    // Prepare data for the Elevation Profile chart
    const elevationChartData = [
        { name: 'Min', Elevation: analysisData.summaryStats.min.toFixed(2) },
        { name: 'Mean', Elevation: analysisData.summaryStats.mean.toFixed(2) },
        { name: 'Max', Elevation: analysisData.summaryStats.max.toFixed(2) },
    ];

    // Prepare data for the Recent Readings table
    const recentReadings = timeSeriesData.slice(-5).reverse(); // Get the last 5 readings
    const readingsWithChange = recentReadings.map((reading, index) => {
        let change = null;
        // Compare with the next reading in the reversed array (which is the previous day chronologically)
        if (index < recentReadings.length - 1) {
            const previousReading = recentReadings[index + 1];
            change = reading.waterLevel - previousReading.waterLevel;
        }
        return { ...reading, change };
    });

    return (
        <div className="analysis-panel card">
            <h3>📊 Analysis Dashboard</h3>

            {/* Section 1: Elevation Profile */}
            <div className="sub-panel">
                <h4>Elevation Profile</h4>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={elevationChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Elevation" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            {/* Section 2: Water Levels by Depth */}
            <div className="sub-panel">
                <h4>Water Levels</h4>
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Depth Level</th>
                            <th>Surface Area (m²)</th>
                            <th>Height Level (m)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {analysisData.tieredResults.map((row, index) => (
                            <tr key={index}>
                                <td>Surface {Math.abs(row.depth)}m</td>
                                <td>{row.area_sqm ? row.area_sqm.toLocaleString(undefined, { maximumFractionDigits: 0 }) : 'N/A'}</td>
                                <td>{row.elevation ? row.elevation.toFixed(2) : 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <small>Height Level is meters above sea level (SRTM DEM).</small>
            </div>

            {/* Section 3: Recent Readings */}
            <div className="sub-panel">
                <h4>Recent Readings</h4>
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Water Level (m)</th>
                            <th>Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {readingsWithChange.map((reading) => (
                            <tr key={reading.date}>
                                <td>{new Date(reading.date).toLocaleDateString()}</td>
                                <td>{reading.waterLevel.toFixed(2)}</td>
                                <td><ChangeIndicator change={reading.change} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default AnalysisPanel;