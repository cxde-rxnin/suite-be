import multer from 'multer';
import { storage } from '../config/cloudinary.js';
import {
  createHotelTx,
  listRoomTx,
  bookRoomTx,
  cancelReservationTx,
  leaveReviewTx,
  rescheduleReservationTx,
  executeTransaction,
} from '../services/suiService.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';
import Review from '../models/Review.js';

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
    const { name, physicalAddress, owner, description, amenities } = req.body;
    const txb = createHotelTx(name, physicalAddress);
    const result = await executeTransaction(txb);
    const hotelId = extractCreatedId(result);
    if (!hotelId) return res.status(500).json({ error: 'Could not determine created hotel id' });
    if (owner) {
      await Hotel.updateOne(
        { objectId: hotelId },
        { $set: {
          objectId: hotelId,
          name,
          physicalAddress,
          owner,
          imageUrl: req.file.path,
          description: description || '',
          amenities: amenities || [],
        } },
        { upsert: true }
      );
    }
    res.json({ hotelId, name, physicalAddress, owner: owner || null, imageUrl: req.file.path, description, amenities, digest: result.digest });
  } catch (e) {
    res.status(500).json({ error: 'Failed to execute create hotel', details: e.message, stack: e.stack });
  }
};

const executeListRoom = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });
    // Extract all fields from req.body
    const {
      hotelId,
      pricePerDay,
      name,
      roomNumber,
      type,
      description,
      maxGuests,
      maxAdults,
      maxChildren,
      baseGuestCount,
      bedConfiguration,
      roomSize,
      bathrooms,
      floor,
      view,
      extraGuestFee,
      amenities,
      perks,
      isAccessible,
      accessibilityFeatures,
      smokingAllowed,
      petsAllowed
    } = req.body;

    // Debug logging
    console.log('List Room Debug:', {
      hotelId,
      pricePerDay,
      imagePath: req.file.path,
      name,
      roomNumber,
      type,
      description,
      maxGuests,
      maxAdults,
      maxChildren,
      baseGuestCount,
      bedConfiguration,
      roomSize,
      bathrooms,
      floor,
      view,
      extraGuestFee,
      amenities,
      perks,
      isAccessible,
      accessibilityFeatures,
      smokingAllowed,
      petsAllowed
    });

    // Blockchain transaction (only hotelId, pricePerDay, image)
    const txb = listRoomTx(hotelId, Number(pricePerDay), req.file.path);
    const result = await executeTransaction(txb);
    const roomId = extractCreatedId(result);
    if (!roomId) return res.status(500).json({ error: 'Could not determine created room id' });

    // Parse arrays/objects if sent as JSON strings
    let bedConfigParsed = bedConfiguration;
    let amenitiesParsed = amenities;
    let perksParsed = perks;
    let accessibilityParsed = accessibilityFeatures;
    try {
      if (typeof bedConfiguration === 'string') bedConfigParsed = JSON.parse(bedConfiguration);
      if (typeof amenities === 'string') amenitiesParsed = JSON.parse(amenities);
      if (typeof perks === 'string') perksParsed = JSON.parse(perks);
      if (typeof accessibilityFeatures === 'string') accessibilityParsed = JSON.parse(accessibilityFeatures);
    } catch (e) {}

    // Save all fields to MongoDB
    // hotelId should be MongoDB _id, hotelObjectId should be Sui objectId
    let mongoHotelId = hotelId;
    let suiHotelObjectId = hotelId;
    // Try to resolve MongoDB _id and Sui objectId from hotelId
    // If hotelId is a Sui objectId, look up the hotel in MongoDB
    if (hotelId && hotelId.length === 66 && hotelId.startsWith('0x')) {
      const hotelDoc = await Hotel.findOne({ objectId: hotelId });
      if (hotelDoc) {
        mongoHotelId = hotelDoc._id.toString();
        suiHotelObjectId = hotelDoc.objectId;
      }
    }
    await Room.updateOne(
      { objectId: roomId },
      {
        $set: {
          objectId: roomId,
          hotelId: mongoHotelId,
          hotelObjectId: suiHotelObjectId,
          pricePerDay: Number(pricePerDay),
          name,
          roomNumber,
          type,
          description,
          maxGuests: Number(maxGuests),
          maxAdults: Number(maxAdults),
          maxChildren: Number(maxChildren),
          baseGuestCount: Number(baseGuestCount),
          bedConfiguration: bedConfigParsed,
          roomSize: Number(roomSize),
          bathrooms: Number(bathrooms),
          floor: Number(floor),
          view,
          extraGuestFee: Number(extraGuestFee),
          amenities: amenitiesParsed,
          perks: perksParsed,
          isAccessible: isAccessible === 'true' || isAccessible === true,
          accessibilityFeatures: accessibilityParsed,
          smokingAllowed: smokingAllowed === 'true' || smokingAllowed === true,
          petsAllowed: petsAllowed === 'true' || petsAllowed === true,
          images: [{ cloudinaryPublicId: '', imageUrl: req.file.path }],
        }
      },
      { upsert: true }
    );
    res.json({ roomId, hotelId, pricePerDay: Number(pricePerDay), imageUrl: req.file.path, digest: result.digest });
  } catch (e) {
    console.error('List Room Error:', e);
    res.status(500).json({ error: 'Failed to execute list room', details: e.message });
  }
};

const executeBookRoom = async (req, res) => {
  try {
    const { roomId, hotelId, startDate, endDate, fullName, email, phone, guestAddress, totalCost } = req.body;
    // Debug: print guestAddress
    console.log('Booking request for address:', guestAddress);
    // Get the SUI client (import before use)
    const { client } = require('../services/suiService.mjs');
    // Fetch all SUI coins for the user
    const coins = await client.getCoins({ owner: guestAddress, coinType: '0x2::sui::SUI' });
    // Debug: print all coin balances
    console.log('All coin balances:', coins.data.map(coin => ({ id: coin.coinObjectId, balance: Number(coin.balance) / 1e9 })));
    if (!roomId || !hotelId || !startDate || !endDate || !guestAddress) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }
    const requiredAmount = totalCost * 1e9; // Convert to mist
    if (coins.data.length === 0) {
      return res.status(400).json({ error: 'No SUI coins found in wallet' });
    }
    // Calculate total balance
    const totalBalance = coins.data.reduce((sum, coin) => sum + Number(coin.balance), 0);
    if (totalBalance < requiredAmount) {
      return res.status(400).json({ error: 'Insufficient SUI balance', required: requiredAmount / 1e9, available: totalBalance / 1e9 });
    }
    // Find the largest coin or merge coins if needed
    let paymentCoinId;
    const largestCoin = coins.data.reduce((max, coin) => Number(coin.balance) > Number(max.balance) ? coin : max);
    if (Number(largestCoin.balance) >= requiredAmount) {
      paymentCoinId = largestCoin.coinObjectId;
    } else {
      // If no single coin has enough, you might need to implement coin merging
      // For now, return an error asking user to consolidate coins
      return res.status(400).json({ error: 'No single coin has sufficient balance. Please consolidate your SUI coins first.', largestCoin: Number(largestCoin.balance) / 1e9, required: requiredAmount / 1e9 });
    }

    const txb = bookRoomTx({ roomId, hotelId, startDate, endDate, paymentCoinId });
    const result = await executeTransaction(txb);
    const reservationId = extractCreatedId(result);
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
    console.error('Booking execution error:', e);
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

export default {
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
