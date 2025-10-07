import React, { useState, useEffect } from 'react';
import { socket } from './socket'; 
import SearchBar from './components/SearchBar';
import MapView from './components/MapView';
import AnalysisPanel from './components/AnalysisPanel';
import Dashboard from './components/Dashboard';
import TimeSeriesPanel from './components/TimeSeriesPanel';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
import axios from 'axios';

function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}/api/history`);
            setHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    useEffect(() => {
        socket.connect();
        fetchHistory(); 

        function onAnalysisComplete(data) {
            console.log("Analysis Complete. Received data:", data.results);
            setAnalysisResults(data.results);
            setIsLoading(false);
            fetchHistory(); 
        }

        function onAnalysisError(data) {
            console.error("Analysis Error:", data.message);
            setError(data.message);
            setIsLoading(false);
        }

        socket.on('analysis-complete', onAnalysisComplete);
        socket.on('analysis-error', onAnalysisError);

        return () => {
            socket.off('analysis-complete', onAnalysisComplete);
            socket.off('analysis-error', onAnalysisError);
            socket.disconnect();
        };
    }, []); 

    const handleSearch = (damName) => {
        setIsLoading(true);
        setAnalysisResults(null);
        setError(null);
        console.log(`[CLIENT LOG] Emitting 'start-analysis' for "${damName}"`);
        socket.emit('start-analysis', { damName });
    };

    return (
        <div className="App">
            {isLoading && <LoadingScreen />}
            
            <header className="app-header">
                <h1>Dam Water Level Analyzer 🌊</h1>
                <SearchBar onSearch={handleSearch} disabled={isLoading} />
            </header>

            {error && <div className="error-message">{error}</div>}
            
            <main className="content-grid">
                <div className="left-column">
                    <div className="card">
                        <MapView searchData={analysisResults} />
                    </div>
                   <div className="card">
                        <TimeSeriesPanel timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null} />
                   </div>
                </div>
                
                <div className="middle-column">
                    <div className="card">
                        <AnalysisPanel 
                            analysisData={analysisResults ? analysisResults.analysis : null}
                            timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null}
                        />
                    </div>
                </div>
                
                <div className="right-column">
                    <div className="card">
                        <Dashboard history={history} />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
