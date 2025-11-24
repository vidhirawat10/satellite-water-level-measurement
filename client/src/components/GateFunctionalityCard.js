import React from 'react';
import './GateFunctionalityCard.css'; // keep or customize styles

/**
 * Props:
 *  - decision: object (required-ish)  // decision object from backend
 *  - prediction: object (optional)    // dynamic prediction object (current or range-based)
 *  - onOpenGates: function (optional) // optional callback to trigger gate opening
 */

function GateFunctionalityCard({ decision = {}, prediction = null, onOpenGates = null }) {
  const status = decision?.status || 'NO_ACTION';

  const statusTitleMap = {
    EMERGENCY_RELEASE: 'Emergency — Immediate Action Required',
    PREPARE_RELEASE: 'Prepare for Release',
    WARN: 'Warning — Monitor Closely',
    NO_ACTION: 'No Immediate Action'
  };

  const statusDescMap = {
    EMERGENCY_RELEASE: 'Water level is above safe capacity. Immediate gate opening may be required to prevent catastrophic overflow.',
    PREPARE_RELEASE: 'Water level is approaching capacity or rising rapidly. Prepare to operate gates and coordinate with authorities.',
    WARN: 'Water level is elevated. Monitor inflows and forecast closely.',
    NO_ACTION: 'Water level is within normal limits.'
  };

  const overflowM3 = decision?.overflowM3 ?? null;
  const overflowMillion = overflowM3 != null ? (overflowM3 / 1e6).toFixed(2) : null;

  // prediction can come from either props or inside decision
  const pred = prediction || decision?.prediction || null;
  const daysToOpen = pred?.days_to_open ?? pred?.daysToOpen ?? null;
  const predictedDate = pred?.predicted_open_date ?? pred?.predictedDate ?? null;
  const rate = pred?.rate_of_change ?? pred?.rate ?? null;

  const handleOpenGates = async () => {
    if (!onOpenGates) return;

    const ok = window.confirm(
      'Are you sure you want to trigger gate opening?\nThis is irreversible (in system simulation).'
    );
    if (!ok) return;

    try {
      await onOpenGates();
      alert('Gate opening request sent.');
    } catch (err) {
      console.error('Failed to trigger gate open:', err);
      alert('Gate opening failed — check console.');
    }
  };

  return (
    <div
      className={`gate-card ${
        status === 'EMERGENCY_RELEASE'
          ? 'critical'
          : status === 'PREPARE_RELEASE'
          ? 'warning'
          : 'normal'
      }`}
      style={{
        padding: 16,
        borderRadius: 8,
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        background:
          status === 'EMERGENCY_RELEASE'
            ? '#fff5f5'
            : status === 'PREPARE_RELEASE'
            ? '#fffaf0'
            : '#f7fff7'
      }}
    >
      <h3 className="card-title">Gate Functionality</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 12,
            background:
              status === 'EMERGENCY_RELEASE'
                ? '#c62828'
                : status === 'PREPARE_RELEASE'
                ? '#f57f17'
                : '#2e7d32'
          }}
        />

        <div>
          <strong style={{ fontSize: 16 }}>{statusTitleMap[status]}</strong>
          <div style={{ fontSize: 13, color: '#333' }}>{statusDescMap[status]}</div>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {overflowMillion && (
          <div style={{ marginBottom: 8 }}>
            <strong>Estimated Overflow:</strong> {overflowMillion} million m³
          </div>
        )}

        {rate != null && (
          <div style={{ marginBottom: 4 }}>
            <strong>Rate of change:</strong> {Number(rate).toFixed(4)} m/day
          </div>
        )}

        {daysToOpen != null && (
          <div style={{ marginBottom: 4 }}>
            <strong>Days until capacity (est.):</strong> {daysToOpen}
          </div>
        )}

        {predictedDate && (
          <div style={{ marginBottom: 4 }}>
            <strong>Predicted open date:</strong> {predictedDate}
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {/* FIXED: Parens around logical operators to avoid ESLint mixed-operator warning */}
          <button
            className="gate-button"
            onClick={handleOpenGates}
            disabled={
              !onOpenGates ||
              (status !== 'EMERGENCY_RELEASE' && status !== 'PREPARE_RELEASE')
            }
            style={{
              padding: '8px 12px',
              background:
                status === 'EMERGENCY_RELEASE' || status === 'PREPARE_RELEASE'
                  ? '#d32f2f'
                  : '#9e9e9e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor:
                onOpenGates &&
                (status === 'EMERGENCY_RELEASE' || status === 'PREPARE_RELEASE')
                  ? 'pointer'
                  : 'not-allowed'
            }}
            title={!onOpenGates ? 'Admin action not configured' : ''}
          >
            Open Gates
          </button>

          <button
            onClick={() => window.alert('SOP Document will be shown here.')}
            style={{
              padding: '8px 12px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            Show SOP
          </button>
        </div>
      </div>
    </div>
  );
}

export default GateFunctionalityCard;
