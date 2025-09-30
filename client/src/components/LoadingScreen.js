import React from 'react';
import './LoadingScreen.css'; // This line imports the styles we will create next

function LoadingScreen({ message }) {
  return (
    <div className="loading-overlay">
      <div className="loading-box">
        <div className="spinner"></div>
        <h2>Processing Request</h2>
        <p className="loading-message">
          {message || 'Initializing...'}
        </p>
        <small>This may take up to a minute depending on satellite data availability.</small>
      </div>
    </div>
  );
}

export default LoadingScreen;