const Review = require('../models/Review');

// POST /api/hotels/:hotelId/review
const reviewHotel = async (req, res) => {
    try {
        const { reservationId, guest, rating, comment } = req.body;
        const { hotelId } = req.params;
        if (!reservationId || !guest || !rating) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const review = new Review({
            hotelId,
            reservationId,
            guest,
            rating,
            comment
        });
        await review.save();
        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ error: 'Failed to submit review', details: error.message });
    }
};

// GET /api/hotels/:hotelId/reviews
const getHotelReviews = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const reviews = await Review.find({ hotelId }).sort({ createdAt: -1 });
        res.status(200).json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews', details: error.message });
    }
};

module.exports = {
    reviewHotel,
    getHotelReviews
};
