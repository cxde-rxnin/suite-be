import express from 'express';
import { getAllHotels, getHotel, getHotelRoom, getHotelRooms, getHotelReviews } from '../controllers/hotelController.js';
const router = express.Router();
// Explicit all-hotels route (avoid treating 'all' as an object id)
router.get('/all', getAllHotels);
router.get('/', getAllHotels);
router.get('/:hotelId/rooms', getHotelRooms);
router.get('/:hotelId/reviews', getHotelReviews);
router.get('/room/:roomId', getHotelRoom);
// Parameter route last so it doesn't swallow /all
router.get('/:hotelId', getHotel);
export default router;
