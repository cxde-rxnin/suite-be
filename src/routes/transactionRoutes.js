import express from 'express';
import transactionController from '../controllers/transactionController.js';

const router = express.Router();

// Build transaction routes (return serialized transaction for frontend signing)
router.post('/build-create-hotel', transactionController.upload.single('image'), transactionController.buildCreateHotel);
router.post('/build-list-room', transactionController.upload.single('image'), transactionController.buildListRoom);
router.post('/build-book-room', transactionController.buildBookRoom);
router.post('/build-cancel-reservation', transactionController.buildCancelReservation);
router.post('/build-leave-review', transactionController.buildLeaveReview);
router.post('/build-reschedule-reservation', transactionController.buildRescheduleReservation);

// Execute transaction routes (execute on server - only for hotel/room creation)
router.post('/execute-create-hotel', transactionController.upload.single('image'), transactionController.executeCreateHotel);
router.post('/execute-list-room', transactionController.upload.single('image'), transactionController.executeListRoom);
router.post('/execute-leave-review', transactionController.executeLeaveReview);

// Booking routes (frontend signing flow)
router.post('/execute-book-room', transactionController.executeBookRoom); // Prepares booking data
router.post('/complete-booking', transactionController.completeBooking);   // Completes booking after frontend execution

export default router;