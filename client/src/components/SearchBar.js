import React, { useState } from 'react';

const SearchBar = ({ onSearch, disabled }) => {
  const [damName, setDamName] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (damName && !disabled) {
      onSearch(damName);
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
        disabled={disabled}
      />
      <button type="submit" disabled={disabled} style={{ padding: '10px 20px', fontSize: '16px' }}>
        {disabled ? 'Analyzing...' : 'Search'}
      </button>
    </form>
  );
};

// This is the corrected line
export default SearchBar;