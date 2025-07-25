const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// These endpoints build and return an unsigned transaction block.
// The frontend will then ask the user's wallet to sign and execute it.

// POST /api/transactions/create-hotel
router.post('/create-hotel', transactionController.buildCreateHotel);

// POST /api/transactions/list-room
router.post(
    '/list-room', 
    transactionController.upload.single('image'), 
    transactionController.buildListRoom
);

// POST /api/transactions/book-room
router.post('/book-room', transactionController.buildBookRoom);

// POST /api/transactions/cancel-reservation
router.post('/cancel-reservation', transactionController.buildCancelReservation);

// POST /api/transactions/leave-review
router.post('/leave-review', transactionController.buildLeaveReview);

// POST /api/transactions/reschedule-reservation
router.post('/reschedule-reservation', transactionController.buildRescheduleReservation);

module.exports = router;