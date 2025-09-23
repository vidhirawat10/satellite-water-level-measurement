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

// **KEY CHANGE**: Construct credentials from environment variables
// This removes the need for the private-key.json file in your project
const privateKey = {
  client_email: process.env.CLIENT_EMAIL,
  // This next line is CRITICAL. It correctly formats the private key
  // by replacing the '\\n' characters with actual line breaks.
  private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
};

const startServer = () => {
    ee.initialize(null, null,
        () => {
            console.log('✅ Google Earth Engine Initialized.');
            app.listen(PORT, () => {
                console.log(`🚀 Server is running on port ${PORT}`);
            });
        },
        (err) => {
            // This error would happen if the service account doesn't have GEE access
            console.error('❌ GEE initialization failed:', err);
        }
    );
};

console.log('Authenticating with Google Earth Engine...');
ee.data.authenticateViaPrivateKey(privateKey,
    startServer, 
    (err) => {
        // This is where the "Invalid JWT Signature" error was happening
        console.error('❌ GEE authentication failed:', err);
    }
);