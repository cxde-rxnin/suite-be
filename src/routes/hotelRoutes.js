const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// GET /api/hotels/all
// Returns a list of all hotels
router.get('/all', hotelController.getAllHotels);

// GET /api/hotels/:hotelId/rooms
// Returns rooms for a specific hotel
router.get('/:hotelId/rooms', hotelController.getHotelRooms);


// GET /api/hotels/reviews/:hotelId
// Returns reviews for a specific hotel
// router.get('/reviews/:hotelId', hotelController.getHotelReviews); // Uncomment if getHotelReviews is defined and exported

// GET /api/hotels/reservations
// Returns reservations for a specific user (by guestAddress query param)
router.get('/reservations', hotelController.getUserReservations);


module.exports = router;