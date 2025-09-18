import React, { useState } from 'react';
import axios from 'axios';

const SearchBar = ({ onSearchComplete, onError }) => {
    const [damName, setDamName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault(); // Prevent form from reloading the page
        if (!damName) return;

        setLoading(true);
        onError(null); // Clear previous errors
        try {
            // Make a POST request to your backend's search endpoint
            const response = await axios.post('http://localhost:5000/api/search', { damName });
            onSearchComplete(response.data); // Pass the results up to the App component
        } catch (error) {
            console.error("Search failed:", error);
            onError(error.response?.data?.error || "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
                type="text"
                value={damName}
                onChange={(e) => setDamName(e.target.value)}
                placeholder="Enter dam name (e.g., Tehri Dam)"
                style={{ flexGrow: 1, padding: '10px', fontSize: '16px' }}
                disabled={loading}
            />
            <button type="submit" disabled={loading} style={{ padding: '10px 20px', fontSize: '16px' }}>
                {loading ? 'Searching...' : 'Search'}
            </button>
        </form>
    );
};

export default SearchBar;