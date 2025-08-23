// Get a single room by hotelId and roomId, ensuring the room belongs to the hotel
const getHotelRoomScoped = async (req, res) => {
  try {
    const { hotelId, roomId } = req.params;
    if (!hotelId || !roomId) return res.status(400).json({ error: "Hotel ID and Room ID are required" });

    // Find hotel by objectId or _id
    let hotel;
    if (isValidObjectId(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ objectId: hotelId });
    }
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    // Find room by objectId or _id
    let room;
    if (isValidObjectId(roomId)) {
      room = await Room.findById(roomId);
    } else {
      room = await Room.findOne({ objectId: roomId });
    }
    if (!room) return res.status(404).json({ error: "Room not found" });

    // Check if room belongs to hotel
    const hotelObjectId = hotel.objectId || hotel._id?.toString();
    if (
      room.hotelObjectId === hotelObjectId ||
      room.hotelId === hotelObjectId ||
      room.hotelId === hotelId ||
      room.hotelObjectId === hotelId
    ) {
      return res.json(room);
    } else {
      return res.status(404).json({ error: "Room does not belong to this hotel" });
    }
  } catch (e) {
    console.error("Error in getHotelRoomScoped:", e);
    res.status(500).json({ error: "Failed to fetch room for hotel", details: e.message });
  }
};
import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Review from "../models/Review.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get all hotels (optionally by owner)
const getAllHotels = async (req, res) => {
  try {
    const owner = req.query.owner || req.params.ownerAddress;
    const query = owner ? { owner } : {};

    const dbHotels = await Hotel.find(query).sort({ createdAt: -1 });
    res.json(dbHotels);
  } catch (e) {
    console.error("Error in getAllHotels:", e);
    res.status(500).json({ error: "Failed to fetch hotels", details: e.message });
  }
};

// Get a single hotel by ID or objectId
const getHotel = async (req, res) => {
  try {
    const { hotelId } = req.params;

    if (hotelId === "all") return getAllHotels(req, res);
    if (!hotelId) return res.status(400).json({ error: "Hotel ID is required" });

    const hotel = isValidObjectId(hotelId)
      ? await Hotel.findById(hotelId)
      : await Hotel.findOne({ objectId: hotelId });

    if (!hotel) return res.status(404).json({ error: "Hotel not found" });

    res.json(hotel);
  } catch (e) {
    console.error("Error in getHotel:", e);
    res.status(500).json({ error: "Failed to fetch hotel", details: e.message });
  }
};

// Get a single room by ID or objectId
const getHotelRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!roomId) return res.status(400).json({ error: "Room ID is required" });

    const room = isValidObjectId(roomId)
      ? await Room.findById(roomId)
      : await Room.findOne({ objectId: roomId });

    if (!room) return res.status(404).json({ error: "Room not found" });

    res.json(room);
  } catch (e) {
    console.error("Error in getHotelRoom:", e);
    res.status(500).json({ error: "Failed to fetch room", details: e.message });
  }
};

// Get all rooms for a hotel
const getHotelRooms = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) return res.status(400).json({ error: "hotelId is required" });

    let objectIdToUse = hotelId;

    // If hotelId is a Mongo _id → fetch the Hotel and get its objectId
    if (isValidObjectId(hotelId)) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) return res.status(404).json({ error: "Hotel not found" });
      if (!hotel.objectId) {
        return res.status(500).json({ error: "Hotel objectId is missing" });
      }
      objectIdToUse = hotel.objectId;
    }

    // Try to fetch rooms using hotelObjectId first
    let rooms = await Room.find({ hotelObjectId: objectIdToUse }).sort({ createdAt: -1 });
    
    // If no rooms found, try using hotelId field as fallback
    if (rooms.length === 0) {
      console.log(`No rooms found with hotelObjectId: ${objectIdToUse}, trying hotelId field...`);
      rooms = await Room.find({ hotelId: objectIdToUse }).sort({ createdAt: -1 });
      
      // If still no rooms, try with the original hotelId parameter
      if (rooms.length === 0 && objectIdToUse !== hotelId) {
        console.log(`No rooms found with hotelId: ${objectIdToUse}, trying original hotelId: ${hotelId}...`);
        rooms = await Room.find({ 
          $or: [
            { hotelId: hotelId },
            { hotelObjectId: hotelId }
          ]
        }).sort({ createdAt: -1 });
      }
    }

    res.json(rooms);
  } catch (e) {
    console.error("Error in getHotelRooms:", e);
    res.status(500).json({ error: "Failed to fetch rooms", details: e.message });
  }
};

// Get all reviews for a hotel
const getHotelReviews = async (req, res) => {
  try {
    const { hotelId } = req.params;
    if (!hotelId) return res.status(400).json({ error: "hotelId is required" });

    let objectIdToUse = hotelId;

    if (isValidObjectId(hotelId)) {
      const hotel = await Hotel.findById(hotelId);
      if (!hotel) return res.status(404).json({ error: "Hotel not found" });
      if (!hotel.objectId) {
        return res.status(500).json({ error: "Hotel objectId is missing" });
      }
      objectIdToUse = hotel.objectId;
    }

    const reviews = await Review.find({ hotelObjectId: objectIdToUse }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (e) {
    console.error("Error in getHotelReviews:", e);
    res.status(500).json({ error: "Failed to fetch reviews", details: e.message });
  }
};

export {
  getAllHotels,
  getHotel,
  getHotelRoom,
  getHotelRooms,
  getHotelReviews,
  getHotelRoomScoped
};
