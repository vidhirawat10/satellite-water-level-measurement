import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Dashboard = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/history`);
            setHistory(response.data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };
    fetchHistory();
}, []); 

    if (loading) {
        return <div>Loading history...</div>;
    }

    return (
        <div className="dashboard-panel">
            <h3>📜 Recent Searches</h3>
            {history.length === 0 ? (
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
