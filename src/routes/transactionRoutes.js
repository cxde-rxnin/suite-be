import express from 'express';
import tx from '../controllers/transactionController.js';
const router = express.Router();
// Build-only endpoints (return unsigned tx)
// Only endpoints that publish to blockchain and then save to DB
router.post('/create-hotel', tx.upload.single('image'), tx.executeCreateHotel);
router.post('/list-room', tx.upload.single('image'), tx.executeListRoom);
router.post('/book-room', tx.executeBookRoom);
router.post('/leave-review', tx.executeLeaveReview);
router.post('/cancel-reservation', tx.buildCancelReservation);
router.post('/reschedule-reservation', tx.buildRescheduleReservation);
export default router;
