require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: "https://dam-analyzer.vercel.app", // Your frontend URL
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api', require('./routes/api'));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});