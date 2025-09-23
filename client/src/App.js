
import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import MapView from './components/MapView';
import AnalysisPanel from './components/AnalysisPanel';
import Dashboard from './components/Dashboard';
import TimeSeriesPanel from './components/TimeSeriesPanel';
import './App.css';

function App() {
    const [searchData, setSearchData] = useState(null);
    const [timeSeriesData, setTimeSeriesData] = useState(null);
    const [error, setError] = useState(null);

    const handleSearchComplete = (data) => {
        setSearchData(data);
        setTimeSeriesData(null); 
        setError(null);
    };

    const handleTimeSeriesComplete = (data) => {
        setTimeSeriesData(data);
    };

    return (
        <div className="App">
            <header className="app-header">
                <h1>Dam Water Level Analyzer 🌊</h1>
                <SearchBar onSearchComplete={handleSearchComplete} onError={setError} />
            </header>

            {error && <div className="error-message">{error}</div>}
            
            <main className="content-grid">
                
                {/* --- LEFT COLUMN --- */}
                <div className="left-column">
                    <div className="card">
                         <MapView searchData={searchData} />
                    </div>
                   <div className="card">
                       <TimeSeriesPanel 
                            waterPolygon={searchData ? searchData.waterPolygon : null}
                            onAnalysisComplete={handleTimeSeriesComplete}
                        />
                   </div>
                </div>
                
                {/* --- MIDDLE COLUMN --- */}
                <div className="middle-column">
                    <div className="card">
                         <AnalysisPanel 
                            waterPolygon={searchData ? searchData.waterPolygon : null}
                            timeSeriesData={timeSeriesData}
                        />
                    </div>
                </div>
                
                {/* --- RIGHT COLUMN (SIDEBAR) --- */}
                <div className="right-column">
                    <div className="card">
                        <Dashboard />
                    </div>
                </div>

            </main>
        </div>
    );
}

export default App;