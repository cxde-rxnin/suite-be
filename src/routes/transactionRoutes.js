const express = require('express');
const router = express.Router();
const tx = require('../controllers/transactionController');

// Build-only endpoints (return unsigned tx)
router.post('/create-hotel', tx.upload.single('image'), tx.buildCreateHotel);
router.post('/list-room', tx.upload.single('image'), tx.buildListRoom);

// Execute (sign + send with admin key) endpoints
router.post('/execute/create-hotel', tx.upload.single('image'), tx.executeCreateHotel);
router.post('/execute/list-room', tx.upload.single('image'), tx.executeListRoom);
router.post('/execute/book-room', tx.executeBookRoom);
router.post('/execute/leave-review', tx.executeLeaveReview);

router.post('/book-room', tx.buildBookRoom);
router.post('/cancel-reservation', tx.buildCancelReservation);
router.post('/leave-review', tx.buildLeaveReview);
router.post('/reschedule-reservation', tx.buildRescheduleReservation);

module.exports = router;
