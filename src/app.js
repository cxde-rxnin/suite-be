const express = require('express');
const cors = require('cors');
require('dotenv').config();

const path = require('path');

const connectDB = require('./config/db');
const hotelRoutes = require('./routes/hotelRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve API documentation at /api/docs
app.get('/api/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes
app.get('/', (req, res) => {
    res.send('Hotel Booking Backend API is running!');
});
app.use('/api/hotels', hotelRoutes);
app.use('/api/transactions', transactionRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API Server listening on port ${PORT}`));