// seeds/hotelSeed.js
// This script seeds the database with dummy hotel and room data.

const mongoose = require('mongoose');
const Hotel = require('../src/models/Hotel');
const Room = require('../src/models/Room');
require('dotenv').config();
const mongoURI = process.env.MONGO_URI;
const { createHotelTx, listRoomTx, executeTransaction } = require('../src/services/suiService');

const hotels = [
  {
    name: 'Grand Plaza',
    physicalAddress: 'New York',
    imageUrl: 'https://dummyimage.com/600x400/cccccc/000000&text=Grand+Plaza',
    rooms: [
      { number: 101, type: 'Single', price: 120 },
      { number: 102, type: 'Double', price: 180 }
    ]
  },
  {
    name: 'Seaside Resort',
    physicalAddress: 'Miami',
    imageUrl: 'https://dummyimage.com/600x400/cccccc/000000&text=Seaside+Resort',
    rooms: [
      { number: 201, type: 'Suite', price: 300 },
      { number: 202, type: 'Single', price: 110 }
    ]
  }
];

// Helper function to extract created object ID from transaction result
function getCreatedObjectId(result) {
  console.log('Transaction result structure:', JSON.stringify(result, null, 2));
  
  // Try different possible structures
  if (result?.effects?.created?.[0]?.reference?.objectId) {
    return result.effects.created[0].reference.objectId;
  }
  
  if (result?.objectChanges) {
    const createdObject = result.objectChanges.find(change => change.type === 'created');
    if (createdObject?.objectId) {
      return createdObject.objectId;
    }
  }
  
  if (result?.effects?.created?.[0]?.objectId) {
    return result.effects.created[0].objectId;
  }
  
  // If none of the above work, log the full structure for debugging
  console.error('Could not find created object ID in result structure');
  return null;
}

async function seed() {
  try {
    await mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
    await Hotel.deleteMany({});
    await Room.deleteMany({});


    const createdHotelIds = [];
    for (const hotelData of hotels) {
      const { rooms, ...hotelInfo } = hotelData;

      console.log(`Creating hotel: ${hotelInfo.name}`);

      // 1. On-chain: Create hotel
      const hotelTx = createHotelTx(hotelInfo.name, hotelInfo.physicalAddress);
      const hotelResult = await executeTransaction(hotelTx);
      const onChainHotelId = getCreatedObjectId(hotelResult);

      if (!onChainHotelId) {
        console.error(`Failed to create hotel ${hotelInfo.name} on-chain`);
        continue;
      }

      createdHotelIds.push(onChainHotelId);
      console.log(`Hotel created on-chain with ID: ${onChainHotelId}`);

      // 2. Off-chain: Save to DB
      const hotel = new Hotel({ 
        ...hotelInfo, 
        objectId: onChainHotelId, 
        owner: process.env.ADMIN_ADDRESS 
      });
      await hotel.save();
      console.log(`Hotel ${hotelInfo.name} saved to database`);

      // 3. On-chain: Create rooms
      for (const roomData of rooms) {
        console.log(`Creating room ${roomData.number} for hotel ${hotelInfo.name}`);
        
        // Use a dummy image URL for on-chain
        const dummyImageUrl = 'https://dummyimage.com/600x400/cccccc/000000&text=Room';
        const roomTx = listRoomTx(onChainHotelId, roomData.price, dummyImageUrl);
        const roomResult = await executeTransaction(roomTx);
        const onChainRoomId = getCreatedObjectId(roomResult);

        if (!onChainRoomId) {
          console.error(`Failed to create room ${roomData.number} on-chain`);
          continue;
        }

        console.log(`Room created on-chain with ID: ${onChainRoomId}`);

        // 4. Off-chain: Save to DB
        const room = new Room({
          objectId: onChainRoomId,
          hotelId: onChainHotelId,
          pricePerDay: roomData.price,
          isBooked: false,
          cloudinaryPublicId: `seed_room_${roomData.number}_${Date.now()}`,
          imageUrl: dummyImageUrl
        });
        await room.save();
        console.log(`Room ${roomData.number} saved to database`);
      }
    }

    // Add dummy reviews for each hotel
    const seedReviews = require('./reviewSeed');
    await seedReviews(createdHotelIds);

    console.log('Seeding complete.');
    mongoose.disconnect();
  } catch (error) {
    console.error('Seeding failed:', error);
    mongoose.disconnect();
    process.exit(1);
  }
}

seed().catch(err => {
  console.error('Unexpected error during seeding:', err);
  mongoose.disconnect();
  process.exit(1);
});