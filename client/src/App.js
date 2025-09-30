import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import SearchBar from './components/SearchBar';
import MapView from './components/MapView';
import AnalysisPanel from './components/AnalysisPanel';
import Dashboard from './components/Dashboard';
import TimeSeriesPanel from './components/TimeSeriesPanel';
import LoadingScreen from './components/LoadingScreen';
import './App.css';
import axios from 'axios';

const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000', {
    // This setting prevents it from connecting automatically on page load.
    // We will connect manually inside useEffect.
    autoConnect: false
});

function App() {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
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
        // --- THIS IS THE KEY CHANGE ---
        // We explicitly connect here.
        socket.connect();
        fetchHistory(); 

        // Define the functions that will handle the events
        function onAnalysisUpdate(data) {
            setLoadingMessage(data.message);
        }

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

        // Attach the listeners
        socket.on('analysis-update', onAnalysisUpdate);
        socket.on('analysis-complete', onAnalysisComplete);
        socket.on('analysis-error', onAnalysisError);

        // This is the cleanup function that runs when the component is unmounted
        return () => {
            // Detach the listeners to prevent memory leaks
            socket.off('analysis-update', onAnalysisUpdate);
            socket.off('analysis-complete', onAnalysisComplete);
            socket.off('analysis-error', onAnalysisError);
            // We disconnect here, which is the proper place for the final cleanup.
            socket.disconnect();
        };
    }, []); // The empty array ensures this effect runs only on mount and unmount

    const handleSearch = (damName) => {
        setIsLoading(true);
        setAnalysisResults(null);
        setError(null);
        setLoadingMessage('Initializing request...');
        console.log(`[CLIENT LOG] Attempting to emit 'start-analysis' for "${damName}"`);
        socket.emit('start-analysis', { damName });
    };

    return (
        <div className="App">
            {isLoading && <LoadingScreen message={loadingMessage} />}
            
            <header className="app-header">
                <h1>Dam Water Level Analyzer 🌊</h1>
                <SearchBar onSearch={handleSearch} disabled={isLoading} />
            </header>

            {error && <div className="error-message">{error}</div>}
            
            <main className="content-grid">
                {/* Your component layout here... */}
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