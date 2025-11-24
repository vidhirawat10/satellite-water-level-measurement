import React from 'react';
import './FloodPredictionCard.css';

/**
 * A map to get user-friendly data from the status key
 */
const statusDetails = {
  EMERGENCY_RELEASE: {
    title: "Overflow Risk!",
    color: "status-critical",
    message: "Water level is above capacity. Immediate release required."
  },
  PREPARE_RELEASE: {
    title: "Flood Warning",
    color: "status-critical",
    message: "Water level is at or near capacity, or rising fast."
  },
  WARN: {
    title: "Alert",
    color: "status-warning",
    message: "Water level is high or rising fast. Monitor closely."
  },
  NO_ACTION: {
    title: "Nominal",
    color: "status-normal",
    message: "Water level is within safe operating limits."
  }
};

function FloodPredictionCard({ decision = null, rangePrediction = null }) {
  // Choose the prediction to display:
  // 1) prefer rangePrediction (from date-range compare)
  // 2) then check decision.currentPrediction (from full analysis response)
  // 3) fall back to decision.decision-prediction fields if available
  const displayPrediction = rangePrediction || (decision && decision.currentPrediction) || (decision && decision.prediction) || null;

  // Determine status (if decision object exists, use it; otherwise default)
  const statusKey = (decision && decision.status) || 'NO_ACTION';
  const details = statusDetails[statusKey] || statusDetails.NO_ACTION;

  // helper to safely lookup numeric field
  const num = (v) => (v === null || v === undefined ? null : Number(v));

  const currentLevel = num(displayPrediction?.currentLevel ?? displayPrediction?.current_level ?? decision?.todayLevelM ?? null);
  const damCapacity = num(displayPrediction?.damCapacity ?? displayPrediction?.dam_capacity ?? decision?.damCapacityM ?? null);
  const rate = num(displayPrediction?.rate_of_change ?? displayPrediction?.rateOfChange ?? decision?.rateOfChangeMPerDay ?? null);
  const daysToOpen = displayPrediction?.days_to_open ?? displayPrediction?.daysToOpen ?? decision?.daysToOpen ?? null;
  const predictedDate = displayPrediction?.predicted_open_date ?? displayPrediction?.predictedDate ?? null;
  const predictedLevelAtOpen = num(displayPrediction?.predicted_level_at_open ?? displayPrediction?.predictedNextLevelM ?? displayPrediction?.predicted_level ?? null);
  const overflowEstimateM3 = num(displayPrediction?.overflowM3 ?? decision?.overflowM3 ?? 0);

  return (
    <div className={`flood-prediction-card ${details.color}`}>
      <h3 className="card-title">Flood Prediction</h3>
      
      <div className="prediction-header">
        <span className={`status-dot ${details.color}`}></span>
        <h4>{details.title}</h4>
      </div>
      <p className="prediction-message">{details.message}</p>

      <div className="prediction-data-grid">
        <div className="data-item">
          <span className="data-label">Current Level</span>
          <span className="data-value">{currentLevel !== null ? `${currentLevel.toFixed(2)} m` : 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Dam Capacity</span>
          <span className="data-value">{damCapacity !== null ? `${damCapacity.toFixed(2)} m` : 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Rate of Rise</span>
          <span className="data-value">{rate !== null ? `${rate.toFixed(3)} m/day` : 'N/A'}</span>
        </div>
        <div className="data-item">
          <span className="data-label">Predicted Next</span>
          <span className="data-value">{predictedLevelAtOpen !== null ? `${predictedLevelAtOpen.toFixed(2)} m` : 'N/A'}</span>
        </div>

        <div className="data-item" style={{ gridColumn: '1 / -1' }}>
          <span className="data-label">Days to Open</span>
          <span className="data-value">{daysToOpen !== null ? daysToOpen : 'N/A'}</span>
        </div>

        <div className="data-item" style={{ gridColumn: '1 / -1' }}>
          <span className="data-label">Predicted Open Date</span>
          <span className="data-value">{predictedDate ?? 'N/A'}</span>
        </div>
      </div>

      {overflowEstimateM3 !== null && (
        <div className="overflow-info">
          <strong>Estimated Overflow:</strong> {Math.round(overflowEstimateM3 / 1e6)} million m³
        </div>
      )}
    </div>
  );
}

export default FloodPredictionCard;
