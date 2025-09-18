require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Increase the limit for JSON payloads
app.use(express.json({ limit: '50mb' }));

// Also increase the limit for URL-encoded payloads
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api', require('./routes/api'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});