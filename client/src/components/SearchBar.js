import React, { useState } from 'react';
import axios from 'axios';

const SearchBar = ({ onSearchComplete, onError }) => {
    const [damName, setDamName] = useState('');
    const [loading, setLoading] = useState(false);

const handleSearch = async (e) => {
    e.preventDefault();
    if (!damName) return;

    setLoading(true);
    onError(null);
    try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/search`, { damName });
        onSearchComplete(response.data);
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
