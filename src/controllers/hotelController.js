const { getProvider, getObjectDetails } = require('../services/suiService');

// Get all Hotel objects shared on the network
const getAllHotels = async (req, res) => {
    try {
        const provider = getProvider();
        const hotelObjects = await provider.getOwnedObjects({
            owner: 'shared',
            filter: {
                StructType: `${process.env.PACKAGE_ID}::hotel_booking::Hotel`
            },
            options: { showContent: true }
        });

        const hotelIds = hotelObjects.data.map(obj => obj.data.objectId);
        const hotels = await getObjectDetails(hotelIds);

        res.status(200).json(hotels);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        res.status(500).json({ error: 'Failed to fetch hotels', details: error.message });
    }
};

// Get all rooms associated with a specific hotel
const getHotelRooms = async (req, res) => {
    const { hotelId } = req.params;
    try {
        const provider = getProvider();
        // This query requires an index on `hotel_id` which is not available by default.
        // A more robust solution involves an off-chain index or emitting events.
        // For now, we fetch ALL rooms and filter. THIS IS INEFFICIENT FOR PRODUCTION.
        const roomObjects = await provider.getOwnedObjects({
             owner: 'shared',
             filter: {
                 StructType: `${process.env.PACKAGE_ID}::hotel_booking::Room`
             },
             options: { showContent: true }
        });

        const roomIds = roomObjects.data.map(obj => obj.data.objectId);
        const allRooms = await getObjectDetails(roomIds);
        const filteredRooms = allRooms.filter(room => room.hotel_id === hotelId);

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
        const reservationObjects = await provider.getOwnedObjects({
            owner: 'shared',
            filter: {
                StructType: `${process.env.PACKAGE_ID}::hotel_booking::Reservation`
            },
            options: { showContent: true }
        });

        const reservationIds = reservationObjects.data.map(obj => obj.data.objectId);
        const allReservations = await getObjectDetails(reservationIds);
        const filteredReservations = allReservations.filter(reservation => reservation.guest_address === req.query.guestAddress);

        res.status(200).json(filteredReservations);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        res.status(500).json({ error: 'Failed to fetch reservations', details: error.message });
    }
};

module.exports = {
    getAllHotels,
    getHotelRooms,
    getUserReservations
};