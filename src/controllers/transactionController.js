const multer = require('multer');
const { storage } = require('../config/cloudinary');
const {
  createHotelTx,
  listRoomTx,
  bookRoomTx,
  cancelReservationTx,
  leaveReviewTx,
  rescheduleReservationTx,
  executeTransaction,
} = require('../services/suiService');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');

// Generic builder
const buildTransaction = (builder) => async (req, res) => {
  try {
    const txb = builder(req.body);
    const transactionBlock = txb.serialize();
    res.status(200).json({ transactionBlock });
  } catch (e) {
    res.status(400).json({ error: 'Failed to build transaction', details: e.message });
  }
};

const upload = multer({ storage });

const buildCreateHotel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });
    const { name, physicalAddress } = req.body;
    const txb = createHotelTx(name, physicalAddress); // image off-chain only
    const transactionBlock = txb.serialize();
    res.status(200).json({ transactionBlock, imageUrl: req.file.path });
  } catch (e) {
    res.status(500).json({ error: 'Failed to build create hotel transaction', details: e.message });
  }
};

const buildListRoom = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });
    const { hotelId, pricePerDay } = req.body;
    const txb = listRoomTx(hotelId, Number(pricePerDay), req.file.path);
    const transactionBlock = txb.serialize();
    res.status(200).json({ transactionBlock, imageUrl: req.file.path });
  } catch (e) {
    res.status(500).json({ error: 'Failed to build list room transaction', details: e.message });
  }
};

const buildBookRoom = buildTransaction(bookRoomTx);
const buildCancelReservation = buildTransaction(cancelReservationTx);
const buildLeaveReview = buildTransaction(leaveReviewTx);
const buildRescheduleReservation = buildTransaction(rescheduleReservationTx);

// Helper to extract first created object id
const extractCreatedId = (result) => {
  if (result?.objectChanges) {
    const created = result.objectChanges.find(c => c.type === 'created');
    if (created?.objectId) return created.objectId;
  }
  if (result?.effects?.created?.[0]?.reference?.objectId) {
    return result.effects.created[0].reference.objectId;
  }
  return null;
};

// Execute + persist-ready responses
const executeCreateHotel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });
    const { name, physicalAddress, owner } = req.body;
    const txb = createHotelTx(name, physicalAddress);
    const result = await executeTransaction(txb);
    const hotelId = extractCreatedId(result);
    if (!hotelId) return res.status(500).json({ error: 'Could not determine created hotel id' });
    if (owner) {
      await Hotel.updateOne(
        { objectId: hotelId },
        { $set: { objectId: hotelId, name, physicalAddress, owner, imageUrl: req.file.path } },
        { upsert: true }
      );
    }
    res.json({ hotelId, name, physicalAddress, owner: owner || null, imageUrl: req.file.path, digest: result.digest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to execute create hotel', details: e.message });
  }
};

const executeListRoom = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });
    const { hotelId, pricePerDay } = req.body;
    const txb = listRoomTx(hotelId, Number(pricePerDay), req.file.path);
    const result = await executeTransaction(txb);
    const roomId = extractCreatedId(result);
    if (!roomId) return res.status(500).json({ error: 'Could not determine created room id' });
    await Room.updateOne(
      { objectId: roomId },
      { $set: { objectId: roomId, hotelId, pricePerDay: Number(pricePerDay), imageUrl: req.file.path } },
      { upsert: true }
    );
    res.json({ roomId, hotelId, pricePerDay: Number(pricePerDay), imageUrl: req.file.path, digest: result.digest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to execute list room', details: e.message });
  }
};

const executeBookRoom = async (req, res) => {
  try {
    const { roomId, hotelId, startDate, endDate, paymentCoinId, fullName, email, phone, guestAddress, totalCost } = req.body;
    if (!roomId || !hotelId || !startDate || !endDate || !paymentCoinId) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }
    const txb = bookRoomTx({ roomId, hotelId, startDate, endDate, paymentCoinId });
    const result = await executeTransaction(txb);
    const reservationId = extractCreatedId(result); // assumes booking creates a reservation object
    // Persist off-chain metadata
    if (reservationId) {
      await Reservation.updateOne(
        { objectId: reservationId },
        { $set: {
          objectId: reservationId,
            roomId,
            hotelId,
            guestAddress: guestAddress || 'unknown',
            fullName: fullName || 'N/A',
            email: email || 'N/A',
            phone: phone || 'N/A',
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalCost: Number(totalCost) || 0,
            isActive: true,
        } },
        { upsert: true }
      );
    }
    res.json({ reservationId, digest: result.digest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to execute book room', details: e.message });
  }
};

const executeLeaveReview = async (req, res) => {
  try {
    const { reservationId, hotelId, rating, comment, guest } = req.body;
    if (!reservationId || !hotelId || rating === undefined) {
      return res.status(400).json({ error: 'Missing required review fields' });
    }
    const txb = leaveReviewTx({ reservationId, hotelId, rating, comment: comment || '' });
    const result = await executeTransaction(txb);
    await Review.create({ reservationId, hotelId, rating: Number(rating), comment: comment || '', guest: guest || 'unknown' });
    res.json({ success: true, digest: result.digest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to execute leave review', details: e.message });
  }
};

module.exports = {
  upload,
  buildCreateHotel,
  buildListRoom,
  buildBookRoom,
  buildCancelReservation,
  buildLeaveReview,
  buildRescheduleReservation,
  executeCreateHotel,
  executeListRoom,
  executeBookRoom,
  executeLeaveReview,
};
