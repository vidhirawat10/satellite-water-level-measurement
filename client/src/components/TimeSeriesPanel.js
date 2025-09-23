import React, { useState } from 'react';
import axios from 'axios';
import { 
    LineChart, Line, XAxis, YAxis, 
    Tooltip, Legend, CartesianGrid, ResponsiveContainer 
} from 'recharts';

const TimeSeriesPanel = ({ waterPolygon, onAnalysisComplete }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [timeSeriesData, setTimeSeriesData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalysis = async () => {
        if (!waterPolygon || !startDate || !endDate) {
            setError('Please ensure a dam is selected and both start and end dates are set.');
            return;
        }
        setLoading(true);
        setError('');
        setTimeSeriesData(null);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/timeseries`, {
                waterPolygon,
                startDate,
                endDate
            });
            setTimeSeriesData(res.data.timeSeriesData);
            // Pass the data up to the parent App component
            onAnalysisComplete(res.data.timeSeriesData); 
        } catch (err) {
            console.error("Time-series API call failed:", err);
            setError('Failed to fetch historical data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="time-series-panel card">
            <h3>📈 Time-Series Analysis</h3>
            <div className="time-series-controls">
                <div className="date-picker-container">
                    <label>Start Date:</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="date-picker-container">
                    <label>End Date:</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <button onClick={handleAnalysis} disabled={loading}>
                    {loading ? 'Analyzing...' : 'Analyze Period'}
                </button>
            </div>

            {loading && <div className="panel-placeholder">Fetching historical data...</div>}
            {error && <div className="panel-placeholder error">{error}</div>}
            
            {timeSeriesData && (
                <div style={{ marginTop: '20px' }}>
                    {timeSeriesData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis label={{ value: 'Water Level (m)', angle: -90, position: 'insideLeft' }} domain={['dataMin - 2', 'dataMax + 2']} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="waterLevel" stroke="#007bff" strokeWidth={2} name="Water Level (m)" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <p>No clear satellite images found for the selected date range.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default TimeSeriesPanel;