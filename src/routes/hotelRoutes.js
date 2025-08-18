const express = require('express');
const router = express.Router();
const { getAllHotels, getHotel, getHotelRoom, getHotelRooms, getHotelReviews } = require('../controllers/hotelController');

// Explicit all-hotels route (avoid treating 'all' as an object id)
router.get('/all', getAllHotels);

router.get('/', getAllHotels);
router.get('/:hotelId/rooms', getHotelRooms);
router.get('/:hotelId/reviews', getHotelReviews);
router.get('/room/:roomId', getHotelRoom);
// Parameter route last so it doesn't swallow /all
router.get('/:hotelId', getHotel);

module.exports = router;
