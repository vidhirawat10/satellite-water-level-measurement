import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css'; // This will contain all the styles for the new design

const HomePage = () => {
    const navigate = useNavigate();

    const handleStartAnalysis = () => {
        navigate('/analysis'); // Navigates to the dashboard page
    };

    const handleWatchDemo = () => {
        // You can link this to a video or another page if you have a demo.
        // For now, it could be a placeholder or an alert.
        alert('Demo feature coming soon!'); 
        console.log('Watch Demo clicked!');
    };

    return (
        <div className="home-page-container">
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-left">
                    <span className="logo">HydroSat</span>
                </div>
                <div className="navbar-center">
                    <a href="#home" className="nav-item">Home</a>
                    <a href="#about" className="nav-item">About Project</a>
                    <a href="#features" className="nav-item">Features</a>
                    <a href="#contact" className="nav-item">Contact</a>
                </div>
                <div className="navbar-right">
                    <button className="navbar-start-analysis-button" onClick={handleStartAnalysis}>
                        Start Analysis
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="hero-section">
                {/* Image Overlay */}
                <div className="hero-image-overlay"></div> 
                
                {/* Tagline */}
                <p className="tagline">
                    <span className="icon">🛰️</span> Satellite Technology Meets AI
                </p>

                {/* Main Heading */}
                <h1 className="main-heading">
                    AI-Powered Satellite System <br />
                    for Smart Dam <br />
                    Monitoring
                </h1>

                {/* Sub-description */}
                <p className="sub-description">
                    Monitor, Predict, and Manage Water Levels in Real-Time using Satellite <br />
                    Imagery and Machine Learning.
                </p>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button className="start-analysis-button-large" onClick={handleStartAnalysis}>
                        Start Analysis <span className="arrow">→</span>
                    </button>
                    <button className="watch-demo-button" onClick={handleWatchDemo}>
                        <span className="play-icon">▶</span> Watch Demo
                    </button>
                </div>
                <div className="action-pointers">
                    <span className="pointer-item">✓ Real-Time Satellite Data</span>
                    <span className="pointer-item">✓ AI-Powered Predictions</span>
                </div>
            </div>
            <section id="about" className="about-section">
                {/* Section Title */}
                <div className="section-title-container">
                    <h2 className="section-heading">What is <span className="highlight-blue">this Project</span> About?</h2>
                    <p className="section-subtitle">
                        Revolutionizing water management through satellite technology and artificial intelligence
                    </p>
                </div>

                {/* Section Content */}
                <div className="about-content-container">
                    
                    {/* Image Box */}
                    <div className="about-image-container">
                        <div className="glass-box">
                            {/* You can replace this emoji with your actual icon/image */}
                            <span className="placeholder-icon">🛰️</span> 
                        </div>
                    </div>

                    {/* Text Content */}
                    <div className="about-text-container">
                        
                        <div className="info-block">
                            <div className="info-icon-wrapper" style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)' }}>
                                <span className="info-icon">⚠️</span> {/* Placeholder for warning icon */}
                            </div>
                            <div className="info-text">
                                <h3>Background & Problem</h3>
                                <p>
                                    Water level monitoring is crucial for flood prevention, drought
                                    management, and resource allocation. Traditional manual and
                                    sensor-based systems are costly, limited in coverage, and often
                                    delayed.
                                </p>
                            </div>
                        </div>

                        <div className="info-block">
                            <div className="info-icon-wrapper" style={{ backgroundColor: 'rgba(0, 188, 212, 0.1)' }}>
                                <span className="info-icon">💡</span> {/* Placeholder for solution icon */}
                            </div>
                            <div className="info-text">
                                <h3>Our Solution</h3>
                                <p>
                                    We harness satellite imagery combined with advanced AI algorithms
                                    to provide real-time, accurate, and predictive water level monitoring
                                    without the need for physical sensors or manual intervention.
                                </p>
                            </div>
                        </div>

                        <div className="info-block">
                            <div className="info-icon-wrapper" style={{ backgroundColor: 'rgba(0, 119, 255, 0.1)' }}>
                                <span className="info-icon">🎯</span> {/* Placeholder for goal icon */}
                            </div>
                            <div className="info-text">
                                <h3>Our Goal</h3>
                                <p>
                                    Create a globally scalable, real-time monitoring system that
                                    empowers authorities to make data-driven decisions, prevent
                                    disasters, and optimize water resource management worldwide.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <section id="features" className="features-section">
                {/* Section Title */}
                <div className="section-title-container">
                    <h2 className="section-heading">Key <span className="highlight-blue">Features</span></h2>
                    <p className="section-subtitle">
                        Powerful capabilities that make water monitoring smarter and more accessible
                    </p>
                </div>

                {/* Features Grid */}
                <div className="features-grid">
                    
                    {/* Card 1 */}
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <span>🛰️</span>
                        </div>
                        <h3>Satellite-Based Monitoring</h3>
                        <p>
                            Real-time, sensor-free data collection from space. Monitor any
                            dam globally without physical infrastructure.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <span>🧠</span>
                        </div>
                        <h3>AI Predictions</h3>
                        <p>
                            Machine learning models forecast water level trends, enabling
                            proactive management and early warnings.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <span>🗺️</span>
                        </div>
                        <h3>Interactive Dashboard</h3>
                        <p>
                            Visualize any dam on a global map. Select locations, view real-time
                            data, and track historical trends.
                        </p>
                    </div>

                    {/* Card 4 */}
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">
                            <span>📊</span>
                        </div>
                        <h3>Analytical Insights</h3>
                        <p>
                            Comprehensive analytics with historical trends, water flow
                            patterns, and predictive modeling.
                        </p>
                    </div>

                </div>
            </section>
<section id="how-it-works" className="how-it-works-section">
                {/* Section Title */}
                <div className="section-title-container">
                    <h2 className="section-heading">How It <span className="highlight-blue">Works</span></h2>
                    <p className="section-subtitle">
                        A simple, automated workflow from selection to insights
                    </p>
                </div>

                {/* Workflow Container */}
                <div className="workflow-container">
                    
                    {/* Step 1 */}
                    <div className="workflow-step">
                        <div className="step-number">1</div>
                        <div className="step-icon-box">
                            <span>📍</span>
                        </div>
                        <h3>Select a Dam</h3>
                        <p>Choose a dam location or enter coordinates on the interactive map</p>
                    </div>

                    {/* Step 2 */}
                    <div className="workflow-step">
                        <div className="step-number">2</div>
                        <div className="step-icon-box">
                            <span>📡</span>
                        </div>
                        <h3>Fetch Satellite Data</h3>
                        <p>System retrieves real-time satellite imagery of the selected area</p>
                    </div>

                    {/* Step 3 */}
                    <div className="workflow-step">
                        <div className="step-number">3</div>
                        <div className="step-icon-box">
                            <span>🧠</span>
                        </div>
                        <h3>AI Analysis</h3>
                        <p>Machine learning models predict water levels and flow trends</p>
                    </div>

                    {/* Step 4 */}
                    <div className="workflow-step">
                        <div className="step-number">4</div>
                        <div className="step-icon-box">
                            <span>📊</span>
                        </div>
                        <h3>View Insights</h3>
                        <p>Dashboard displays results, predictions, and analytical insights</p>
                    </div>

                </div>
            </section>
<section id="why-us" className="why-us-section">
                {/* Section Title */}
                <div className="section-title-container">
                    <h2 className="section-heading">Why <span className="highlight-blue">Our System</span>?</h2>
                    <p className="section-subtitle">
                        See how satellite-AI monitoring outperforms traditional methods
                    </p>
                </div>

                {/* Comparison Container */}
                <div className="comparison-container">
                    
                    {/* Headers */}
                    <div className="comparison-headers">
                        <div className="compare-header traditional">
                            <span>✗</span> Traditional System
                        </div>
                        <div className="compare-header satellite">
                            <span>✓</span> Our Satellite-AI System
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="comparison-rows">
                        
                        {/* Row 1 */}
                        <div className="compare-row">
                            <span className="compare-label">Data Collection</span>
                            <span className="compare-value traditional-value">Manual or sensor-based</span>
                            <span className="compare-value satellite-value">Remote & fully automated</span>
                        </div>
                        
                        {/* Row 2 */}
                        <div className="compare-row">
                            <span className="compare-label">Update Frequency</span>
                            <span className="compare-value traditional-value">Delayed updates</span>
                            <span className="compare-value satellite-value">Real-time satellite data</span>
                        </div>

                        {/* Row 3 */}
                        <div className="compare-row">
                            <span className="compare-label">Coverage</span>
                            <span className="compare-value traditional-value">Regional coverage</span>
                            <span className="compare-value satellite-value">Global coverage</span>
                        </div>

                        {/* Row 4 */}
                        <div className="compare-row">
                            <span className="compare-label">Predictions</span>
                            <span className="compare-value traditional-value">No predictions</span>
                            <span className="compare-value satellite-value">AI-based forecasting</span>
                        </div>

                        {/* Row 5 */}
                        <div className="compare-row">
                            <span className="compare-label">Infrastructure Cost</span>
                            <span className="compare-value traditional-value">High installation & maintenance</span>
                            <span className="compare-value satellite-value">Zero physical infrastructure</span>
                        </div>
                    </div>

                    {/* Summary Box */}
                    <div className="summary-box">
                        Our solution enhances accuracy, reduces cost, and enables early flood prevention.
                    </div>
                </div>

            </section>
<section className="cta-section">
                <h2 className="cta-heading">
                    Ready to Monitor & Predict <br />
                    Dam Water Levels with AI?
                </h2>
                <p className="cta-subheading">
                    Start analyzing any dam location worldwide with real-time satellite data and
                    AI-powered predictions.
                </p>
                <button className="start-analysis-button-large" onClick={handleStartAnalysis}>
                    Start Analysis Now <span className="arrow">→</span>
                </button>
                <div className="action-pointers cta-pointers">
                    <span className="pointer-item">✓ No installation required</span>
                    <span className="pointer-item">✓ Real-time data processing</span>
                    <span className="pointer-item">✓ Instant AI predictions</span>
                </div>
            </section>
            {/* --- END OF NEW CTA SECTION --- */}


            {/* --- ADD THIS NEW FOOTER --- */}
            <footer className="site-footer">
                <div className="footer-top">
                    
                    <div className="footer-brand">
                        <span className="logo">HydroSat</span>
                        <p>
                            Powered by AI • Connected by Satellites •
                            Designed for Sustainability
                        </p>
                    </div>

                    <div className="footer-links">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href="#home">Home</a></li>
                            <li><a href="#about">About</a></li>
                            <li><a href="#features">Features</a></li>
                            <li><a href="/analysis">Dashboard</a></li>
                        </ul>
                    </div>

                    <div className="footer-links">
                        <h4>Resources</h4>
                        <ul>
                            <li><a href="#!">Documentation</a></li>
                            <li><a href="#!">API Reference</a></li>
                            <li><a href="#!">Support</a></li>
                            <li><a href="#!">Privacy Policy</a></li>
                        </ul>
                    </div>

                    <div className="footer-connect">
                        <h4>Connect</h4>
                        <div className="social-icons">
                            <a href="#!" aria-label="Github"><span><i className="fab fa-github">G</i></span></a>
                            <a href="#!" aria-label="LinkedIn"><span><i className="fab fa-linkedin">L</i></span></a>
                            <a href="#!" aria-label="Email"><span><i className="fas fa-envelope">E</i></span></a>
                        </div>
                    </div>

                </div>

                <div className="footer-bottom">
                    <p>Copyright © 2025 Satellite Water Monitoring Project. All rights reserved.</p>
                </div>
            </footer>
            {/* --- END OF NEW FOOTER --- */}
        </div>
    );
};

export default HomePage;