import connectDB from '../../config/db';
import Hotel from '../../models/Hotel';
import Room from '../../models/Room';
import Reservation from '../../models/Reservation';
import LastProcessed from '../../models/LastProcessed';
import { getProvider, getObjectDetails } from '../../services/suiService';

/**
 * This is the serverless function that will be executed by the Vercel Cron Job.
 * It polls for new events since the last run and updates the database.
 */
export default async function handler(req, res) {
    // 1. SECURITY CHECK
    // Protect this endpoint with a secret key.
    if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).end('Unauthorized');
    }
    
    try {
        await connectDB();
        // Removed cron-related logs
        // console.log('[Indexer Cron] Job starting...');

        const provider = getProvider();
        
        // 2. GET THE LAST PROCESSED CURSOR
        // Find where we left off last time.
        const lastState = await LastProcessed.findOne({ key: 'sui_events' });
        const cursor = lastState ? { txDigest: lastState.txDigest, eventSeq: lastState.cursor } : null;

        // 3. QUERY FOR NEW EVENTS
        // Ask the Sui network for all events from our package that have occurred
        // since the last cursor we have.
        const result = await provider.queryEvents({
            query: { Package: process.env.PACKAGE_ID },
            cursor: cursor,
            order: 'ascending',
        });

        if (!result.data || result.data.length === 0) {
            // Removed cron-related logs
            // console.log('[Indexer Cron] No new events found.');
            return res.status(200).json({ message: 'No new events.' });
        }

        // Removed cron-related logs
        // console.log(`[Indexer Cron] Found ${result.data.length} new events to process.`);
        
        // 4. PROCESS EACH NEW EVENT
        for (const event of result.data) {
            // Removed cron-related logs
            // console.log(`[Indexer Cron] Processing event type: ${event.type}`);
            // --- This is your existing logic from the old indexer.js ---
            switch (event.type) {
                // Room listed
                case `${process.env.PACKAGE_ID}::hotel_booking::RoomListed`:
                    {
                        const [roomData] = await getObjectDetails([event.parsedJson.room_id]);
                        if (roomData) {
                            await Room.updateOne(
                                { objectId: roomData.objectId },
                                {
                                    objectId: roomData.objectId,
                                    hotelId: roomData.hotel_id,
                                    pricePerDay: parseInt(roomData.price_per_day),
                                    isBooked: roomData.is_booked,
                                    imageUrl: roomData.image_blob_id,
                                },
                                { upsert: true }
                            );
                        }
                    }
                    break;

                // Hotel created
                case `${process.env.PACKAGE_ID}::hotel_booking::HotelCreated`:
                    {
                        const [hotelData] = await getObjectDetails([event.parsedJson.hotel_id]);
                        if (hotelData) {
                            await Hotel.updateOne(
                                { objectId: hotelData.objectId },
                                {
                                    objectId: hotelData.objectId,
                                    name: hotelData.name,
                                    physicalAddress: hotelData.physical_address,
                                    owner: hotelData.owner,
                                    treasury: hotelData.treasury,
                                },
                                { upsert: true }
                            );
                        }
                    }
                    break;

                // Room booked
                case `${process.env.PACKAGE_ID}::hotel_booking::RoomBooked`:
                    {
                        const [reservationData] = await getObjectDetails([event.parsedJson.reservation_id]);
                        if (reservationData) {
                            await Reservation.updateOne(
                                { objectId: reservationData.objectId },
                                {
                                    objectId: reservationData.objectId,
                                    roomId: reservationData.room_id,
                                    hotelId: reservationData.hotel_id,
                                    guestAddress: reservationData.guest_address,
                                    startDate: reservationData.start_date,
                                    endDate: reservationData.end_date,
                                    totalCost: reservationData.total_cost,
                                    isActive: reservationData.is_active,
                                },
                                { upsert: true }
                            );
                        }
                        // Optionally update Room status
                        const [roomData] = await getObjectDetails([event.parsedJson.room_id]);
                        if (roomData) {
                            await Room.updateOne(
                                { objectId: roomData.objectId },
                                { isBooked: roomData.is_booked },
                                { upsert: true }
                            );
                        }
                    }
                    break;

                // Reservation cancelled
                case `${process.env.PACKAGE_ID}::hotel_booking::ReservationCancelled`:
                    {
                        const [reservationData] = await getObjectDetails([event.parsedJson.reservation_id]);
                        if (reservationData) {
                            await Reservation.updateOne(
                                { objectId: reservationData.objectId },
                                { isActive: reservationData.is_active },
                                { upsert: true }
                            );
                        }
                        // Optionally update Room status
                        const [roomData] = await getObjectDetails([event.parsedJson.room_id]);
                        if (roomData) {
                            await Room.updateOne(
                                { objectId: roomData.objectId },
                                { isBooked: roomData.is_booked },
                                { upsert: true }
                            );
                        }
                    }
                    break;

                // Review posted
                case `${process.env.PACKAGE_ID}::hotel_booking::ReviewPosted`:
                    {
                        const [reviewData] = await getObjectDetails([event.parsedJson.review_id]);
                        if (reviewData) {
                            // You may need a Review model, or store in Hotel
                            // Example for a Review model:
                            await Review.updateOne(
                                { objectId: reviewData.objectId },
                                {
                                    objectId: reviewData.objectId,
                                    hotelId: reviewData.hotel_id,
                                    reservationId: reviewData.reservation_id,
                                    guestAddress: reviewData.guest_address,
                                    rating: reviewData.rating,
                                    comment: reviewData.comment,
                                },
                                { upsert: true }
                            );
                        }
                    }
                    break;

                // Add more cases for other events if needed
            }
        }

        // 5. UPDATE THE CURSOR
        // Save the cursor of the *last* event we just processed, so we know
        // where to start next time.
        const newCursor = result.nextCursor;
        if (newCursor) {
            await LastProcessed.updateOne(
                { key: 'sui_events' },
                { cursor: newCursor.eventSeq, txDigest: newCursor.txDigest },
                { upsert: true }
            );
            // Removed cron-related logs
            // console.log(`[Indexer Cron] Job finished. New cursor set to ${newCursor.eventSeq}.`);
        } else {
            // Removed cron-related logs
            // console.log('[Indexer Cron] Job finished. No new cursor returned.');
        }

        res.status(200).json({ message: `Successfully processed ${result.data.length} events.` });

    } catch (error) {
        // Removed cron-related logs
        // console.error('[Indexer Cron] CRITICAL ERROR:', error);
        res.status(500).json({ error: 'Failed to run indexer job.', details: error.message });
    }
}