import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import './LoadingScreen.css';

function LoadingScreen() {
    const [currentStage, setCurrentStage] = useState(0);
    const [message, setMessage] = useState('Initializing analysis...');

    const analysisSteps = [
        'Geocoding Location',
        'Analyzing Satellite Imagery',
        'Extracting Water Boundary',
        'Calculating Elevation Profile',
        'Compiling Historical Data'
    ];

    useEffect(() => {
        const handleAnalysisUpdate = (data) => {
            console.log('--- SOCKET EVENT RECEIVED ---', data);

            const stageAsNumber = parseInt(data.stage, 10);

            if (isNaN(stageAsNumber)) {
                console.error("Received a non-numeric stage from backend:", data.stage);
                return;
            }

            setCurrentStage(stageAsNumber);
            setMessage(data.message);
        };

        socket.on('analysis-update', handleAnalysisUpdate);

        return () => {
            socket.off('analysis-update', handleAnalysisUpdate);
        };
    }, []);

    console.log(`--- COMPONENT RE-RENDER --- Current stage is: ${currentStage} (Type: ${typeof currentStage})`);

    return (
        <div className="loading-overlay">
            <div className="loading-box">
                <h2>Processing Dam Data</h2>
                <p className="loading-message">{message}</p>
                
                <div className="stepper-wrapper">
                    {analysisSteps.map((step, index) => {
                        const stepNumber = index + 1;
                        let status = 'pending';
                        if (stepNumber < currentStage) {
                            status = 'completed';
                        } else if (stepNumber === currentStage) {
                            status = 'active';
                        }

                        console.log(`Step ${stepNumber} ("${step}"): Status is "${status}"`);

                        return (
                            <div key={index} className={`step-item ${status}`}>
                                <div className="step-icon">
                                    {status === 'completed' && <span className="tick-icon">✔</span>}
                                    {status === 'active' && <div className="buffering-circle"></div>}
                                    {status === 'pending' && <div className="dot-icon"></div>}
                                </div>
                                <div className="step-name">{step}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default LoadingScreen;
