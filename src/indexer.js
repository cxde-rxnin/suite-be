require('dotenv').config();
const { getProvider, getObjectDetails } = require('./services/suiService');
const connectDB = require('./config/db');

// Import Mongoose Models
const Hotel = require('./models/Hotel');
const Room = require('./models/Room');
const Reservation = require('./models/Reservation');

const POLL_INTERVAL = 10000; // 10 seconds
let processedEvents = new Set(); // Track processed events to avoid duplicates

async function processEvent(event) {
    const eventKey = `${event.id.txDigest}::${event.id.eventSeq}`;
    
    // Skip if already processed
    if (processedEvents.has(eventKey)) {
        return;
    }
    
    console.log(`\n--- New Event Received: ${event.type.split('::').pop()} ---`);
    console.log(JSON.stringify(event.parsedJson, null, 2));

    try {
        switch (event.type) {
            case `${process.env.PACKAGE_ID}::hotel_booking::HotelCreated`:
                const [hotelData] = await getObjectDetails([event.parsedJson.hotel_id]);
                if (hotelData) {
                    await Hotel.updateOne(
                        { objectId: hotelData.objectId },
                        {
                            objectId: hotelData.objectId,
                            name: hotelData.name,
                            physicalAddress: hotelData.physical_address,
                            owner: hotelData.owner,
                        },
                        { upsert: true }
                    );
                    console.log(`[Indexer] Upserted Hotel: ${hotelData.name}`);
                }
                break;

            case `${process.env.PACKAGE_ID}::hotel_booking::RoomListed`:
                const [roomData] = await getObjectDetails([event.parsedJson.room_id]);
                if (roomData) {
                    // The roomData.image_blob_id now contains the full Cloudinary URL
                    // In a real app, you might also want to store the public_id for deletion/management
                    await Room.updateOne(
                        { objectId: roomData.objectId },
                        {
                            objectId: roomData.objectId,
                            hotelId: roomData.hotel_id,
                            pricePerDay: parseInt(roomData.price_per_day),
                            isBooked: roomData.is_booked,
                            imageUrl: roomData.image_blob_id, // This field now holds the Cloudinary URL
                            cloudinaryPublicId: "placeholder", // In a real app, you'd get this from the backend
                        },
                        { upsert: true }
                    );
                     console.log(`[Indexer] Upserted Room: ${roomData.objectId}`);
                }
                break;

            case `${process.env.PACKAGE_ID}::hotel_booking::RoomBooked`:
                const [reservationData] = await getObjectDetails([event.parsedJson.reservation_id]);
                if (reservationData) {
                    await Reservation.updateOne(
                        { objectId: reservationData.objectId },
                        {
                            objectId: reservationData.objectId,
                            roomId: reservationData.room_id,
                            hotelId: reservationData.hotel_id,
                            guestAddress: reservationData.guest_address,
                            fullName: "Placeholder Full Name",
                            email: "placeholder@email.com",
                            phone: "123-456-7890",
                            startDate: new Date(parseInt(reservationData.start_date) * 1000),
                            endDate: new Date(parseInt(reservationData.end_date) * 1000),
                            totalCost: parseInt(reservationData.total_cost),
                            isActive: reservationData.is_active,
                        },
                        { upsert: true }
                    );

                    await Room.updateOne({ objectId: reservationData.room_id }, { isBooked: true });
                    console.log(`[Indexer] Upserted Reservation: ${reservationData.objectId}`);
                }
                break;
            
            case `${process.env.PACKAGE_ID}::hotel_booking::ReservationCancelled`:
                await Reservation.updateOne({ objectId: event.parsedJson.reservation_id }, { isActive: false });
                await Room.updateOne({ objectId: event.parsedJson.room_id }, { isBooked: false });
                console.log(`[Indexer] Cancelled Reservation: ${event.parsedJson.reservation_id}`);
                break;
        }
        
        // Mark event as processed
        processedEvents.add(eventKey);
        
    } catch (err) {
        console.error('[Indexer] Error processing event:', err);
    }
}

async function pollForEvents() {
    const provider = getProvider();

    while (true) {
        try {
            console.log('Polling for new events...');

            const events = await provider.queryEvents({
                query: {
                    MoveEventModule: {
                        package: process.env.PACKAGE_ID,
                        module: 'hotel_booking'
                    }
                },
                limit: 100,
                descending: false,
            });

            if (events.data && events.data.length > 0) {
                console.log(`Found ${events.data.length} events (some may be duplicates)`);

                for (const event of events.data) {
                    await processEvent(event);
                }
            } else {
                console.log('No events found for this package');
            }

        } catch (error) {
            console.error('Polling error:', error.message);
            // Wait longer on error before retrying
            await new Promise(resolve => setTimeout(resolve, 30000));
            continue;
        }

        // Wait before next poll
        console.log(`Waiting ${POLL_INTERVAL / 1000} seconds before next poll...`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

async function main() {
    await connectDB();
    console.log('Indexer started, polling for events...');
    console.log(`Package ID: ${process.env.PACKAGE_ID}`);
    console.log(`Network: ${process.env.SUI_NETWORK}`);

    await pollForEvents();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down indexer...');
    process.exit(0);
});

main().catch(console.error);
