import React from 'react';

// Receives 'history' as a prop from App.js.
// It no longer fetches its own data.
const Dashboard = ({ history }) => {
  return (
    <div className="dashboard-panel">
      <h3>📜 Recent Searches</h3>
      {/* Checks the prop directly. No internal loading state is needed. */}
      {!history || history.length === 0 ? (
        <p>No searches yet.</p>
      ) : (
        <ul>
          {history.map((item) => (
            <li key={item.id}>
              <strong>{item.dam_name}</strong>
              <small>Searched on: {new Date(item.created_at).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;