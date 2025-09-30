import React from 'react';
import { 
    LineChart, Line, XAxis, YAxis, 
    Tooltip, Legend, CartesianGrid, ResponsiveContainer 
} from 'recharts';

// Receives 'timeSeriesData' as a prop.
// Its only job is to display the chart for the data it's given.
const TimeSeriesPanel = ({ timeSeriesData }) => {
  return (
    <div className="time-series-panel card">
      <h3>📈 Historical Water Level (Last 5 Years)</h3>
      
      {/* Instead of controls and loading states, we just check if the data prop exists. */}
      {timeSeriesData ? (
        <div style={{ marginTop: '20px' }}>
          {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis 
                  label={{ value: 'Water Level (m)', angle: -90, position: 'insideLeft' }} 
                  domain={['dataMin - 2', 'dataMax + 2']} 
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="waterLevel" 
                  stroke="#007bff" 
                  strokeWidth={2} 
                  name="Est. Water Level" 
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="panel-placeholder">
              <p>No clear satellite images found for the historical analysis.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="panel-placeholder">
          <p>Search for a dam to view its historical water level data.</p>
        </div>
      )}
    </div>
  );
};

export default TimeSeriesPanel;