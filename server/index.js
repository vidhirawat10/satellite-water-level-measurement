require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ee = require('@google/earthengine');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
    origin: ["http://localhost:3000", "https://dam-analyzer.vercel.app"],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api', require('./routes/api'));

const privateKey = require('./private-key.json');

const startServer = () => {
    ee.initialize(null, null,
        () => {
            console.log('✅ Google Earth Engine Initialized.');
            app.listen(PORT, () => {
                console.log(`🚀 Server is running on port ${PORT}`);
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

