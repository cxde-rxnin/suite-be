import { getProvider, getObjectDetails } from '../services/suiService.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Review from '../models/Review.js';

const isHexObjectId = (id) => /^0x[0-9a-fA-F]{64}$/i.test(id);

const getAllHotels = async (_req, res) => {
  try {
    const owner = _req.query.owner || _req.params.ownerAddress;
    let dbHotels;
    if (owner) {
      dbHotels = await Hotel.find({ owner });
    } else {
      dbHotels = await Hotel.find();
    }
    res.json(dbHotels);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch hotels', details: e.message });
  }
};

const getHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (hotelId === 'all') return getAllHotels(req, res);
    if (!isHexObjectId(hotelId)) {
      return res.status(400).json({ error: 'Invalid hotel id format' });
    }
    const hotels = await getObjectDetails([hotelId]);
    if (hotels.length === 0) return res.status(404).json({ error: 'Hotel not found' });     
    const db = await Hotel.findOne({ objectId: hotelId });
    res.json({ ...hotels[0], imageUrl: db ? db.imageUrl : null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch hotel', details: e.message });
  }
};

const getHotelRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const rooms = await getObjectDetails([roomId]);
    if (rooms.length === 0) return res.status(404).json({ error: 'Room not found' });       
    const db = await Room.findOne({ objectId: roomId });
    res.json({ ...rooms[0], imageUrl: db ? db.imageUrl : null });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch room', details: e.message });
  }
};

const getHotelRooms = async (req, res) => {
  try {
    const { hotelId } = req.params;
    
    if (!hotelId) {
      return res.status(400).json({ error: 'hotelId is required' });
    }

    const rooms = await Room.find({ hotelId }).sort({ createdAt: -1 });
    res.json(rooms);

  } catch (e) {
    console.error('Error in getHotelRooms:', e);
    res.status(500).json({ error: 'Failed to fetch rooms', details: e.message });
  }
};

const getHotelReviews = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) return res.status(400).json({ error: 'hotelId is required' });
    const reviews = await Review.find({ hotelId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch reviews', details: e.message });
  }
};

export { getAllHotels, getHotel, getHotelRoom, getHotelRooms, getHotelReviews };