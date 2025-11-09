// client/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// CHECK THESE IMPORTS CAREFULLY
import HomePage from './components/HomePage'; 
import AnalysisPage from './Pages/AnalysisPage'; 

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