const mongoose = require('mongoose');
const Review = require('../src/models/Review');

const dummyReviews = [
  {
    hotelId: '', // to be filled after hotel creation
    reservationId: 'dummy-res-1',
    guest: '0xguest1',
    rating: 5,
    comment: 'Amazing stay! Highly recommended.'
  },
  {
    hotelId: '',
    reservationId: 'dummy-res-2',
    guest: '0xguest2',
    rating: 4,
    comment: 'Very comfortable and clean.'
  }
];

async function seedReviews(hotelIds) {
  for (const [i, hotelId] of hotelIds.entries()) {
    for (const review of dummyReviews) {
      const reviewDoc = new Review({ ...review, hotelId });
      await reviewDoc.save();
      console.log(`Dummy review for hotel ${hotelId} saved.`);
    }
  }
}

module.exports = seedReviews;
