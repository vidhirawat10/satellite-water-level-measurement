import React, { useState } from 'react';
import SearchBar from './components/SearchBar';
import MapView from './components/MapView';
import AnalysisPanel from './components/AnalysisPanel';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
    const [searchData, setSearchData] = useState(null);
    const [error, setError] = useState(null);

    const handleSearchComplete = (data) => {
        setSearchData(data);
        setError(null);
    };

    return (
        <div className="App">
            <header>
                <h1>Dam Water Level Analyzer 🌊</h1>
            </header>
            <main>
                <div className="main-content">
                    <SearchBar onSearchComplete={handleSearchComplete} onError={setError} />
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="content-layout">
                        <div className="map-container">
                            <MapView searchData={searchData} />
                        </div>
                        <div className="panel-container">
                            <AnalysisPanel waterPolygon={searchData ? searchData.waterPolygon : null} />
                        </div>
                    </div>
                </div>
                <aside className="sidebar">
                    <Dashboard />
                </aside>
            </main>
        </div>
    );
}

export default App;