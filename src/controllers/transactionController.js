const multer = require('multer');
const { storage } = require('../config/cloudinary'); // Import our new Cloudinary storage config
const {
    createHotelTx,
    bookRoomTx,
    cancelReservationTx,
    leaveReviewTx
    , rescheduleReservationTx
} = require('../services/suiService');

// This controller's job is to prepare a transaction block and send it to the frontend.
// The frontend's wallet will then sign and execute it.

const buildTransaction = (builder) => async (req, res) => {
    try {
        const txb = builder(req.body);
        const transactionBlock = txb.serialize();
        res.status(200).json({ transactionBlock });
    } catch (error) {
        console.error(`Error building transaction:`, error);
        res.status(400).json({ error: 'Failed to build transaction', details: error.message });
    }
};

// Initialize multer with the Cloudinary storage engine
const upload = multer({ storage });

const buildListRoom = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        // The file is ALREADY uploaded to Cloudinary by the middleware at this point.
        // The details are in req.file.
        const imageUrl = req.file.path; // The secure URL provided by Cloudinary
        const { hotelId, pricePerDay } = req.body;

        // Build the Sui transaction with the Cloudinary URL
        const txb = listRoomTx(hotelId, pricePerDay, imageUrl);
        const transactionBlock = txb.serialize();

        res.status(200).json({ transactionBlock });

    } catch (error) {
        res.status(500).json({ error: 'Failed to build list room transaction', details: error.message });
    }
};

const buildCreateHotel = buildTransaction(createHotelTx);
const buildBookRoom = buildTransaction(bookRoomTx);
const buildCancelReservation = buildTransaction(cancelReservationTx);
const buildLeaveReview = buildTransaction(leaveReviewTx);
// ...existing code...

module.exports = {
    upload, // Export multer middleware
    buildCreateHotel,
    buildListRoom,
    buildBookRoom,
    buildCancelReservation,
    buildLeaveReview,
    buildRescheduleReservation,
};