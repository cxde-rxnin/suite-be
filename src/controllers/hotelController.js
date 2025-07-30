const { getProvider, getObjectDetails } = require('../services/suiService');

// Get all Hotel objects shared on the network
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');

// Get all Hotel objects shared on the network
const getAllHotels = async (req, res) => {
    try {
        const provider = getProvider();
        // Workaround: Use events API to find all HotelCreated events, then fetch objects by ID
        const events = await provider.queryEvents({
            query: {
                MoveModule: {
                    package: process.env.PACKAGE_ID,
                    module: 'hotel_booking',
                },
            },
            limit: 1000, // adjust as needed
        });
        const hotelIds = events.data
            .filter(e => e.type.endsWith('HotelCreated'))
            .map(e => e.parsedJson.hotel_id || e.parsedJson.hotelId || e.parsedJson.id);
        const hotels = await getObjectDetails(hotelIds);
        // Attach imageUrl from DB if available
        const dbHotels = await Hotel.find({ objectId: { $in: hotelIds } });
        const hotelsWithImages = hotels.map(hotel => {
            const dbHotel = dbHotels.find(h => h.objectId === hotel.objectId);
            return {
                ...hotel,
                imageUrl: dbHotel ? dbHotel.imageUrl : null
            };
        });
        res.status(200).json(hotelsWithImages);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Failed to fetch hotels', details: error.message });
    }
};

// Get a single hotel by objectId
const getHotel = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const hotel = await Hotel.findOne({ objectId: hotelId });
        if (!hotel) return res.status(404).json({ error: 'Hotel not found' });
        // Always include imageUrl
        res.status(200).json({
            ...hotel.toObject(),
            imageUrl: hotel.imageUrl || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch hotel', details: error.message });
    }
};

// Get a single hotel room by objectId
const getHotelRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const room = await Room.findOne({ objectId: roomId });
        if (!room) return res.status(404).json({ error: 'Room not found' });
        // Always include imageUrl
        res.status(200).json({
            ...room.toObject(),
            imageUrl: room.imageUrl || null
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch room', details: error.message });
    }
};
// ...existing code...

// Get all rooms associated with a specific hotel
const getHotelRooms = async (req, res) => {
    const { hotelId } = req.params;
    try {
        const provider = getProvider();
        
        // Workaround: Use events API to find all RoomListed events, then fetch objects by ID
        const events = await provider.queryEvents({
            query: {
                MoveModule: {
                    package: process.env.PACKAGE_ID,
                    module: 'hotel_booking',
                },
            },
            limit: 1000, // adjust as needed
        });
        const roomIds = events.data
            .filter(e => e.type.endsWith('RoomListed'))
            .map(e => e.parsedJson.room_id || e.parsedJson.roomId || e.parsedJson.id);
        const allRooms = await getObjectDetails(roomIds);
        // Attach imageUrl from DB if available
        const dbRooms = await Room.find({ hotelId });
        const filteredRooms = allRooms.filter(room => room.hotel_id === hotelId).map(room => {
            const dbRoom = dbRooms.find(r => r.objectId === room.objectId);
            return {
                ...room,
                imageUrl: dbRoom ? dbRoom.imageUrl : null
            };
        });
        res.status(200).json(filteredRooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Failed to fetch rooms', details: error.message });
    }
};

// Get all reservations for a specific user
const getUserReservations = async (req, res) => {
    try {
        const provider = getProvider();
        
        // Workaround: Use events API to find all RoomBooked events, then fetch objects by ID
        const events = await provider.queryEvents({
            query: {
                MoveModule: {
                    package: process.env.PACKAGE_ID,
                    module: 'hotel_booking',
                },
            },
            limit: 1000, // adjust as needed
        });
        const reservationIds = events.data
            .filter(e => e.type.endsWith('RoomBooked'))
            .map(e => e.parsedJson.reservation_id || e.parsedJson.reservationId || e.parsedJson.id);
        const allReservations = await getObjectDetails(reservationIds);
        const filteredReservations = allReservations.filter(reservation => 
            reservation.guest_address === req.query.guestAddress
        );
        res.status(200).json(filteredReservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations', details: error.message });
    }
};

const { reviewHotel, getHotelReviews } = require('./reviewController');

module.exports = {
    getAllHotels,
    getHotel,
    getHotelRoom,
    getHotelRooms,
    getUserReservations,
    reviewHotel,
    getHotelReviews
};