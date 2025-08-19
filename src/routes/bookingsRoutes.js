import express from 'express';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const router = express.Router();

// GET /api/bookings?address=0x...
const client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK || 'testnet') });

router.get('/', async (req, res) => {
  const { address } = req.query;
  
  if (!address) return res.status(400).json({ error: 'Missing address' });
  
  try {
    // Fetch all objects owned by the address
    const objects = await client.getOwnedObjects({ owner: address });
    
    // Filter for hotel booking objects (update type below to match your Move contract)
    const bookingType = process.env.SUI_BOOKING_TYPE || '0x...::hotel_booking::Booking';
    const bookings = [];
    
    for (const obj of objects.data) {
      if (obj.type === bookingType) {
        // Fetch object details
        const details = await client.getObject({ 
          id: obj.objectId, 
          options: { showContent: true } 
        });
        
        const fields = details.data?.content?.fields || {};
        
        bookings.push({
          id: obj.objectId,
          hotelId: fields.hotel_id,
          roomId: fields.room_id,
          hotelName: fields.hotel_id,
          roomName: fields.room_id,
          arrivalDate: fields.start_date,
          departureDate: fields.end_date,
          status: fields.is_active ? 'Active' : 'Completed',
          totalCost: fields.total_cost,
        });
      }
    }
    
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings', details: err.message });
  }
});

export default router;