import express from 'express';
import Reservation from '../models/Reservation.js';

const router = express.Router();

// GET /api/reservations?address=0x...
router.get('/', async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Missing address' });
  try {
    // Find reservations by guest address
    const reservations = await Reservation.find({ guestAddress: address });
    res.json(reservations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reservations', details: err.message });
  }
});

export default router;
