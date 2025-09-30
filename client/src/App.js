import React, { useState, useEffect } from 'react';
import io from 'socket.io-client'; // Import socket.io-client
import SearchBar from './components/SearchBar';
import MapView from './components/MapView';
import AnalysisPanel from './components/AnalysisPanel';
import Dashboard from './components/Dashboard';
import TimeSeriesPanel from './components/TimeSeriesPanel';
import LoadingScreen from './components/LoadingScreen'; // Import the new component
import './App.css';

// Establish connection to the backend.
// In development, this will be 'http://localhost:5000'. 
// For production, you should set REACT_APP_BACKEND_URL in your Vercel environment variables.
const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

function App() {
    // New state management for the real-time process
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [error, setError] = useState(null);

    // This useEffect hook runs once when the App mounts to set up all our WebSocket listeners.
    useEffect(() => {
        // Listener for real-time progress updates from the server
        socket.on('analysis-update', (data) => {
            setLoadingMessage(data.message);
        });

        // Listener for when the entire analysis is complete
        socket.on('analysis-complete', (data) => {
            console.log("Analysis Complete. Received data:", data.results);
            setAnalysisResults(data.results);
            setIsLoading(false); // Hide loading screen
        });

        // Listener for any errors that occur on the backend
        socket.on('analysis-error', (data) => {
            console.error("Analysis Error:", data.message);
            setError(data.message);
            setIsLoading(false); // Hide loading screen
        });

        // Cleanup function: Disconnect the socket when the component unmounts
        return () => {
            socket.disconnect();
        };
    }, []); // The empty array ensures this effect runs only once

    // This function is passed to the SearchBar. It's the trigger for everything.
    const handleSearch = (damName) => {
        // Reset all states for the new search
        setIsLoading(true);
        setAnalysisResults(null);
        setError(null);
        setLoadingMessage('Initializing request...');

        // Emit the 'start-analysis' event to the backend with the dam name
        socket.emit('start-analysis', { damName });
    };

    return (
        <div className="App">
            {/* The LoadingScreen is an overlay, shown only when isLoading is true */}
            {isLoading && <LoadingScreen message={loadingMessage} />}
            
            <header className="app-header">
                <h1>Dam Water Level Analyzer 🌊</h1>
                {/* SearchBar now gets a single 'onSearch' prop */}
                <SearchBar onSearch={handleSearch} disabled={isLoading} />
            </header>

            {/* Display error message if something went wrong */}
            {error && <div className="error-message">{error}</div>}
            
            {/* The main content is now driven by the single 'analysisResults' state */}
            <main className="content-grid">
                
                {/* --- LEFT COLUMN --- */}
                <div className="left-column">
                    <div className="card">
                         {/* MapView now gets the entire result object to use coords and polygon */}
                        <MapView searchData={analysisResults} />
                    </div>
                   <div className="card">
                        {/* TimeSeriesPanel is now a simple display component */}
                        <TimeSeriesPanel timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null} />
                   </div>
                </div>
                
                {/* --- MIDDLE COLUMN --- */}
                <div className="middle-column">
                    <div className="card">
                         {/* AnalysisPanel also becomes a display component */}
                        <AnalysisPanel 
                            analysisData={analysisResults ? analysisResults.analysis : null}
                            timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null}
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