import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db.js';
import hotelRoutes from './routes/hotelRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import bookingsRoutes from './routes/bookingsRoutes.js';
import reservationsRoutes from './routes/reservationsRoutes.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/docs', (req, res) => {
  res.sendFile(path.join(path.dirname(new URL(import.meta.url).pathname), 'index.html'));
});

app.get('/', (req, res) => {
    res.send('Hotel Booking Backend API is running!');
});
app.use('/api/hotels', hotelRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/reservations', reservationsRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API Server listening on port ${PORT}`));