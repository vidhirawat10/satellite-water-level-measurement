require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ee = require('@google/earthengine');

const http = require('http');
const { Server } = require("socket.io");

const app = express();
const httpServer = http.createServer(app);

const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: ["http://localhost:3000", "https://dam-analyzer.vercel.app"],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000", "https://dam-analyzer.vercel.app"],
        methods: ["GET", "POST"]
    }
});

app.use('/api', require('./routes/api')(io));

const privateKey = {
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const startServer = () => {
    ee.initialize(null, null,
        () => {
            console.log('✅ Google Earth Engine Initialized.');
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
