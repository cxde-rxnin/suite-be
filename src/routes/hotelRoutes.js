import express from 'express';
import { getAllHotels, getHotel, getHotelRoom, getHotelRooms, getHotelReviews } from '../controllers/hotelController.js';
import * as roomController from '../controllers/roomController.js';
import * as roomFavoritesController from '../controllers/roomFavoritesController.js';

const router = express.Router();

// Get favorites by userId
router.get('/favorites', roomFavoritesController.getFavoritesByUser);

// Explicit all-hotels route (avoid treating 'all' as an object id)
router.get('/all', getAllHotels);
router.get('/', getAllHotels);
router.get('/owner/:ownerAddress', getAllHotels);
router.get('/:hotelId/rooms', getHotelRooms);
router.get('/:hotelId/reviews', getHotelReviews);
router.get('/room/:roomId', getHotelRoom);

// New room update and booking info routes
router.put('/room/:roomId', roomController.updateRoom);
router.get('/room/:roomId/booking', roomController.getRoomBookingInfo);

// Favorite routes
router.post('/rooms/:roomId/favorite', roomFavoritesController.addFavorite);
router.delete('/rooms/:roomId/favorite', roomFavoritesController.removeFavorite);

// Parameter route last so it doesn't swallow /all
router.get('/:hotelId', getHotel);

export default router;