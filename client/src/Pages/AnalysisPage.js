import React, { useState, useEffect } from 'react';
import { socket } from '../socket'; 
import SearchBar from '../components/SearchBar';
import MapView from '../components/MapView';
import AnalysisPanel from '../components/AnalysisPanel';
import Dashboard from '../components/Dashboard';
import TimeSeriesPanel from '../components/TimeSeriesPanel';
import LoadingScreen from '../components/LoadingScreen';
import WaterLevelComparer from '../components/WaterLevelComparer';
import './AnalysisPage.css';
import axios from 'axios';

// --- [1. IMPORT NEW COMPONENTS] ---
import FloodPredictionCard from '../components/FloodPredictionCard';
import GateFunctionalityCard from '../components/GateFunctionalityCard';
// ----------------------------------

function AnalysisPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);
    const [currentDam, setCurrentDam] = useState(null);

    // NEW: store prediction coming from range queries
    const [rangePrediction, setRangePrediction] = useState(null);

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
            // The 'decision' object is now inside data.results
            setAnalysisResults(data.results);
            setIsLoading(false);
            fetchHistory(); 
            // clear any previous range prediction on new full analysis
            setRangePrediction(null);
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
        setCurrentDam(damName);
        // clear previous range prediction when initiating a full new search
        setRangePrediction(null);
        console.log(`[CLIENT LOG] Emitting 'start-analysis' for "${damName}"`);
        socket.emit('start-analysis', { damName });
    };

    // Helper variable to check if decision data is available
    const decisionData = analysisResults ? analysisResults.decision : null;

    return (
        <div className="analysis-page">
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

                    {/* --- [2. ADD GATE FUNCTIONALITY CARD] --- */}
                    {decisionData && (decisionData.status === 'EMERGENCY_RELEASE' || decisionData.status === 'PREPARE_RELEASE') && (
                      <div className="card">
                        <GateFunctionalityCard decision={decisionData} />
                      </div>
                    )}
                    {/* -------------------------------------- */}

                    <div className="card">
                        <TimeSeriesPanel timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null} />
                    </div>
                </div>
                
                <div className="middle-column">
                    <div className="card">
                        <AnalysisPanel 
                            analysisData={analysisResults ? analysisResults.analysis : null}
                            timeSeriesData={analysisResults ? analysisResults.timeSeriesData : null}
                            // --- [4. PASS DECISION DATA AS A PROP] ---
                            decision={decisionData}
                            // ----------------------------------------
                        />
                    </div>
                </div>
                
                <div className="right-column">
                    {/* --- [3. ADD FLOOD PREDICTION CARD] --- */}
                    {/* Now pass rangePrediction as well; FloodPredictionCard will prefer it when present */}
                    {(decisionData || rangePrediction) && (
                      <div className="card">
                        <FloodPredictionCard decision={decisionData} rangePrediction={rangePrediction} />
                      </div>
                    )}
                    {/* -------------------------------------- */}

                    <div className="card">
                      {/* Pass the callback so comparer can push range prediction up */}
                      <WaterLevelComparer currentDamName={currentDam} onRangePrediction={setRangePrediction} />
                    </div>

                    <div className="card">
                        <Dashboard history={history} />
                    </div>
                </div>
            </main>
        </div>
    );
}

export default AnalysisPage;
