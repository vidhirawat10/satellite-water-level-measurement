// client/src/App.js

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// CHECK THESE IMPORTS CAREFULLY
import HomePage from './components/HomePage'; 

// If you put AnalysisPage.js in src/pages/
import AnalysisPage from './Pages/AnalysisPage'; 

// --- OR ---
// If you put AnalysisPage.js directly in src/
// import AnalysisPage from './AnalysisPage'; 

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;