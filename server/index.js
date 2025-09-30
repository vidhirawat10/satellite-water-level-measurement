require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ee = require('@google/earthengine');

// NEW: Import the built-in 'http' module and the 'Server' class from 'socket.io'
const http = require('http');
const { Server } = require("socket.io");

const app = express();
// NEW: Create an HTTP server from the Express app.
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
    origin: ["http://localhost:3000", "https://dam-analyzer.vercel.app"],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// NEW: Initialize Socket.IO server and attach it to the httpServer.
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "https://dam-analyzer.vercel.app"],
        methods: ["GET", "POST"]
    }
});

// CHANGED: This is the critical change. We now pass the `io` object
// into our routes file so it can access the WebSocket server.
app.use('/api', require('./routes/api')(io));

// This part for GEE credentials remains the same.
const privateKey = {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const startServer = () => {
    ee.initialize(null, null,
        () => {
            console.log('✅ Google Earth Engine Initialized.');
            // CHANGED: We now use httpServer.listen() to start the server
            // for both regular HTTP requests and WebSocket connections.
            httpServer.listen(PORT, () => {
                console.log(`🚀 Server (HTTP & WebSocket) is running on port ${PORT}`);
            });
        },
        (err) => {
            console.error('❌ GEE initialization failed:', err);
        }
    );
};

console.log('Authenticating with Google Earth Engine...');
ee.data.authenticateViaPrivateKey(privateKey,
    startServer,
    (err) => {
        console.error('❌ GEE authentication failed:', err);
    }
);