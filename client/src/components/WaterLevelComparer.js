// client/src/components/WaterLevelComparer.js

import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * This component needs one prop: 'currentDamName'.
 * It will not show anything unless a dam has been successfully
 * searched for and its name is passed as this prop.
 */
function WaterLevelComparer({ currentDamName }) {
  // State for the date pickers
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // State for the results
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // This function is called when the "Analyze" button is clicked
  const handleCompare = async () => {
    if (!startTime || !endTime) {
      setError("Please select both a start and end time.");
      return;
    }

    setLoading(true);
    setError(null);
    setComparisonData(null);

    try {
      // Construct the URL with query parameters
      const params = new URLSearchParams({
        dam_name: currentDamName, // Pass the current dam's name
        start: new Date(startTime).toISOString(), // Format date to ISO string
        end: new Date(endTime).toISOString(),     // Format date to ISO string
      });
      
      // Use the REACT_APP_BACKEND_URL from your .env file
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await fetch(`${backendUrl}/api/water-level-difference?${params.toString()}`);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Error: ${response.status}`);
      }

      const data = await response.json();
      setComparisonData(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format the result text
  const getDifferenceText = () => {
    if (!comparisonData) return "";
    
    const { difference } = comparisonData;
    const action = difference >= 0 ? "increased" : "decreased";
    
    // Format dates for display
    const startDate = new Date(startTime).toLocaleString();
    const endDate = new Date(endTime).toLocaleString();

    return `Water level ${action} by ${Math.abs(difference)} meters between ${startDate} and ${endDate}.`;
  };

  // Format data for the chart
  const formattedChartData = comparisonData?.data.map(item => ({
    ...item,
    // Format timestamp for a nicer tooltip/axis
    time: new Date(item.timestamp).toLocaleDateString(),
    water_level: parseFloat(item.water_level.toFixed(2)),
  }));

  // If no dam is selected yet, show a placeholder.
  if (!currentDamName) {
    return (
      <div className="analysis-panel card" style={{ padding: '20px' }}>
        <h3>Compare Water Levels</h3>
        <p className="panel-placeholder">Please search for a dam first to enable this feature.</p>
      </div>
    );
  }

  // This is the main UI for the component
  return (
    <div className="analysis-panel card" style={{ padding: '20px' }}>
      <h3>Compare Water Levels for {currentDamName}</h3>
      <small>Note: Compares data from the last 5 years.</small>
      
      <div className="inputs" style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
        <label style={{ flex: 1 }}>
          Start Time:
          <input 
            type="datetime-local" 
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </label>
        <label style={{ flex: 1 }}>
          End Time:
          <input 
            type="datetime-local" 
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            style={{ width: '100%', marginTop: '5px' }}
          />
        </label>
      </div>
      
      <button onClick={handleCompare} disabled={loading} style={{ width: '100%', padding: '10px' }}>
        {loading ? "Analyzing..." : "Analyze Difference"}
      </button>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>Error: {error}</p>}

      {/* Results Section */}
      {comparisonData && (
        <div className="results" style={{ marginTop: '20px' }}>
          
          {/* 1. Text Result */}
          <div className="text-result" style={{ fontSize: '1.1em', fontWeight: 'bold', marginBottom: '20px', padding: '10px', background: '#f4f4f4', borderRadius: '5px' }}>
            <p>Difference: {comparisonData.difference > 0 ? '+' : ''}{comparisonData.difference} meters</p>
            <p style={{ fontSize: '0.9em', fontWeight: 'normal', marginTop: '5px' }}>{getDifferenceText()}</p>
          </div>
          
          {/* 2. Chart Result */}
          <div className="chart-result" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formattedChartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Water Level (m)', angle: -90, position: 'insideLeft' }}/>
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="water_level" name="Water Level" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default WaterLevelComparer;