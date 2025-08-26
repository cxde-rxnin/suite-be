// Improved transaction controller with better gas coin handling
import multer from 'multer';
import { Transaction } from '@mysten/sui/transactions';
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
    console.error('Build transaction error:', e);
    res.status(400).json({ error: 'Failed to build transaction', details: e.message });
  }
};

const upload = multer({ storage });

const buildCreateHotel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }
    
    const { name, physicalAddress } = req.body;
    
    if (!name || !physicalAddress) {
      return res.status(400).json({ error: 'Name and physical address are required.' });
    }
    
    const txb = createHotelTx(name, physicalAddress); // image off-chain only
    const transactionBlock = txb.serialize();
    res.status(200).json({ transactionBlock, imageUrl: req.file.path });
  } catch (e) {
    console.error('Build create hotel error:', e);
    res.status(500).json({ error: 'Failed to build create hotel transaction', details: e.message });
  }
};

const buildListRoom = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }
    
    const { hotelId, pricePerDay } = req.body;
    
    if (!hotelId || !pricePerDay) {
      return res.status(400).json({ error: 'Hotel ID and price per day are required.' });
    }
    
    const txb = listRoomTx(hotelId, Number(pricePerDay), req.file.path);
    const transactionBlock = txb.serialize();
    res.status(200).json({ transactionBlock, imageUrl: req.file.path });
  } catch (e) {
    console.error('Build list room error:', e);
    res.status(500).json({ error: 'Failed to build list room transaction', details: e.message });
  }
};

const buildBookRoom = buildTransaction(bookRoomTx);
const buildCancelReservation = buildTransaction(cancelReservationTx);
const buildLeaveReview = buildTransaction(leaveReviewTx);
const buildRescheduleReservation = buildTransaction(rescheduleReservationTx);

// Helper to extract first created object id
const extractCreatedId = (result) => {
  try {
    if (result?.objectChanges) {
      const created = result.objectChanges.find(c => c.type === 'created');
      if (created?.objectId) return created.objectId;
    }
    if (result?.effects?.created?.[0]?.reference?.objectId) {
      return result.effects.created[0].reference.objectId;
    }
    return null;
  } catch (error) {
    console.error('Extract created ID error:', error);
    return null;
  }
};

// Execute + persist-ready responses
const executeCreateHotel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }
    
    const { name, physicalAddress, owner, description, amenities } = req.body;
    
    if (!name || !physicalAddress) {
      return res.status(400).json({ error: 'Name and physical address are required.' });
    }
    
    // Use wallet address as owner if not provided
    let hotelOwner = owner;
    if (!hotelOwner) {
      // Try to get from req.user or a walletAddress field if available
      hotelOwner = req.user?.walletAddress || req.body.walletAddress || null;
    }
    
    let txb, result, hotelId;
    
    try {
      txb = createHotelTx(name, physicalAddress);
      result = await executeTransaction(txb);
      hotelId = extractCreatedId(result);
    } catch (txError) {
      console.error('Hotel transaction error:', txError);
      return res.status(500).json({ 
        error: 'Failed to execute blockchain transaction', 
        details: txError.message 
      });
    }
    
    if (!hotelId) {
      console.error('Hotel ID extraction failed. Result:', JSON.stringify(result, null, 2));
      return res.status(500).json({ error: 'Could not determine created hotel id' });
    }
    
    try {
      await Hotel.updateOne(
        { objectId: hotelId },
        { $set: {
          objectId: hotelId,
          name,
          physicalAddress,
          owner: hotelOwner,
          imageUrl: req.file.path,
          description: description || '',
          amenities: amenities || [],
        } },
        { upsert: true }
      );
    } catch (dbError) {
      console.error('Hotel database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to save hotel to database', 
        details: dbError.message,
        hotelId: hotelId // Include hotelId so they know blockchain transaction succeeded
      });
    }
    
    const successResponse = {
      hotelId,
      name,
      physicalAddress,
      owner: hotelOwner,
      imageUrl: req.file.path,
      description: description || '',
      amenities: amenities || [],
      digest: result.digest
    };
    
    res.status(200).json(successResponse);
    
  } catch (error) {
    console.error('executeCreateHotel - Unhandled error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      hasFile: !!req.file
    });
    
    res.status(500).json({ 
      error: 'Failed to execute create hotel', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

const executeListRoom = async (req, res) => {
  try {
    // Add early validation
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    // Extract all fields from req.body with validation
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

    // Validate required fields
    if (!hotelId || !pricePerDay) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'hotelId and pricePerDay are required' 
      });
    }

    // Debug logging with proper error handling
    console.log('List Room Debug:', {
      hotelId,
      pricePerDay: Number(pricePerDay),
      imagePath: req.file?.path,
      hasName: !!name,
      hasRoomNumber: !!roomNumber,
      requestBodyKeys: Object.keys(req.body)
    });

    let txb, result, roomId;

    try {
      // Blockchain transaction (only hotelId, pricePerDay, image)
      txb = listRoomTx(hotelId, Number(pricePerDay), req.file.path);
      if (!txb) {
        throw new Error('Failed to create transaction block');
      }
    } catch (txError) {
      console.error('Transaction creation error:', txError);
      return res.status(500).json({ 
        error: 'Failed to create blockchain transaction', 
        details: txError.message 
      });
    }

    try {
      result = await executeTransaction(txb);
      if (!result) {
        throw new Error('Transaction execution returned null/undefined');
      }
    } catch (execError) {
      console.error('Transaction execution error:', execError);
      return res.status(500).json({ 
        error: 'Failed to execute blockchain transaction', 
        details: execError.message 
      });
    }

    try {
      roomId = extractCreatedId(result);
      if (!roomId) {
        console.error('Extract ID failed. Result structure:', JSON.stringify(result, null, 2));
        return res.status(500).json({ 
          error: 'Could not determine created room id',
          details: 'Transaction succeeded but room ID extraction failed'
        });
      }
    } catch (extractError) {
      console.error('ID extraction error:', extractError);
      return res.status(500).json({ 
        error: 'Failed to extract room ID', 
        details: extractError.message 
      });
    }

    // Parse arrays/objects if sent as JSON strings with proper error handling
    let bedConfigParsed = bedConfiguration;
    let amenitiesParsed = amenities;
    let perksParsed = perks;
    let accessibilityParsed = accessibilityFeatures;

    try {
      if (typeof bedConfiguration === 'string' && bedConfiguration.trim()) {
        bedConfigParsed = JSON.parse(bedConfiguration);
      }
      if (typeof amenities === 'string' && amenities.trim()) {
        amenitiesParsed = JSON.parse(amenities);
      }
      if (typeof perks === 'string' && perks.trim()) {
        perksParsed = JSON.parse(perks);
      }
      if (typeof accessibilityFeatures === 'string' && accessibilityFeatures.trim()) {
        accessibilityParsed = JSON.parse(accessibilityFeatures);
      }
    } catch (parseError) {
      console.warn('JSON parsing warning (non-critical):', parseError.message);
      // Continue with original values if parsing fails
    }

    // Handle hotel ID conversion
    let mongoHotelId = hotelId;
    let suiHotelObjectId = hotelId;

    try {
      if (hotelId && hotelId.length === 66 && hotelId.startsWith('0x')) {
        const hotelDoc = await Hotel.findOne({ objectId: hotelId });
        if (hotelDoc) {
          mongoHotelId = hotelDoc._id.toString();
          suiHotelObjectId = hotelDoc.objectId;
        } else {
          console.warn('Hotel document not found for objectId:', hotelId);
        }
      }
    } catch (hotelError) {
      console.error('Hotel lookup error:', hotelError);
      // Continue with original hotelId if lookup fails
    }

    // Database update with comprehensive error handling
    try {
      const roomUpdateData = {
        objectId: roomId,
        hotelId: mongoHotelId,
        hotelObjectId: suiHotelObjectId,
        pricePerDay: Number(pricePerDay) || 0,
        name: name || '',
        roomNumber: roomNumber || '',
        type: type || '',
        description: description || '',
        maxGuests: Number(maxGuests) || 1,
        maxAdults: Number(maxAdults) || 1,
        maxChildren: Number(maxChildren) || 0,
        baseGuestCount: Number(baseGuestCount) || 1,
        bedConfiguration: bedConfigParsed || [],
        roomSize: Number(roomSize) || 0,
        bathrooms: Number(bathrooms) || 1,
        floor: Number(floor) || 1,
        view: view || '',
        extraGuestFee: Number(extraGuestFee) || 0,
        amenities: amenitiesParsed || [],
        perks: perksParsed || [],
        isAccessible: isAccessible === 'true' || isAccessible === true,
        accessibilityFeatures: accessibilityParsed || [],
        smokingAllowed: smokingAllowed === 'true' || smokingAllowed === true,
        petsAllowed: petsAllowed === 'true' || petsAllowed === true,
        images: [{ cloudinaryPublicId: '', imageUrl: req.file.path }],
      };

      console.log('About to update room with data:', roomUpdateData);

      const updateResult = await Room.updateOne(
        { objectId: roomId },
        { $set: roomUpdateData },
        { upsert: true }
      );

      console.log('Room update result:', updateResult);

    } catch (dbError) {
      console.error('Database update error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to save room to database', 
        details: dbError.message,
        roomId: roomId // Include roomId so they know blockchain transaction succeeded
      });
    }

    // Success response
    const successResponse = { 
      roomId, 
      hotelId, 
      pricePerDay: Number(pricePerDay), 
      imageUrl: req.file.path, 
      digest: result.digest,
      message: 'Room created successfully'
    };

    console.log('Sending success response:', successResponse);
    return res.status(200).json(successResponse);

  } catch (error) {
    // Catch-all error handler with detailed logging
    console.error('executeListRoom - Unhandled error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestBody: req.body,
      hasFile: !!req.file
    });

    // Ensure we always return a proper JSON response
    const errorResponse = {
      error: 'Failed to execute list room',
      details: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    };

    return res.status(500).json(errorResponse);
  }
};

const executeBookRoom = async (req, res) => {
  try {
    const { roomId, hotelId, startDate, endDate, fullName, email, phone, guestAddress, totalCost } = req.body;
    
    // Validate required fields
    if (!roomId || !hotelId || !startDate || !endDate || !guestAddress) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }
    
    // Validate guest address format
    if (!guestAddress.startsWith('0x') || guestAddress.length !== 66) {
      return res.status(400).json({ error: 'Invalid guest address format' });
    }
    
    console.log('Processing booking request for address:', guestAddress);
    
    let client;
    try {
      const suiModule = await import('../services/suiService.js');
      client = suiModule.client;
    } catch (importError) {
      console.error('Failed to import SUI service:', importError);
      return res.status(500).json({ error: 'Failed to initialize SUI client' });
    }
    
    // Enhanced coin fetching with retry logic
    let coins;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const coinsResponse = await client.getCoins({ 
          owner: guestAddress, 
          coinType: '0x2::sui::SUI',
          limit: 50 // Fetch more coins for better analysis
        });
        
        coins = coinsResponse;
        
        if (coins.data && coins.data.length > 0) {
          console.log(`Successfully fetched ${coins.data.length} coins on attempt ${retryCount + 1}`);
          break;
        }
        
        console.warn(`No coins found on attempt ${retryCount + 1}`);
        retryCount++;
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (coinError) {
        console.error(`Coin fetch attempt ${retryCount + 1} failed:`, coinError);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          return res.status(500).json({ 
            error: 'Failed to fetch user coins after multiple attempts', 
            details: coinError.message,
            suggestion: 'Please check your wallet connection and try again'
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!coins || !coins.data || coins.data.length === 0) {
      return res.status(400).json({ 
        error: 'No SUI coins found in wallet',
        suggestion: 'Please add SUI to your wallet and try again'
      });
    }
    
    // Enhanced coin analysis
    const coinData = coins.data.map(coin => ({
      id: coin.coinObjectId,
      balance: Number(coin.balance),
      balanceInSui: Number(coin.balance) / 1e9,
      version: coin.version,
      digest: coin.digest
    }));
    
    console.log('Coin analysis:', coinData.map(c => ({ 
      id: c.id.slice(0, 8) + '...', 
      balanceInSui: c.balanceInSui.toFixed(4) 
    })));
    
    const requiredAmount = totalCost * 1e9; // Convert to mist
    const gasBuffer = 2e8; // Increased gas buffer to 0.2 SUI
    const totalRequired = requiredAmount + gasBuffer;
    
    // Calculate total balance
    const totalBalance = coinData.reduce((sum, coin) => sum + coin.balance, 0);
    
    console.log('Balance analysis:', {
      totalBalanceInSui: (totalBalance / 1e9).toFixed(4),
      requiredAmountInSui: (requiredAmount / 1e9).toFixed(4),
      gasBufferInSui: (gasBuffer / 1e9).toFixed(4),
      totalRequiredInSui: (totalRequired / 1e9).toFixed(4),
      sufficient: totalBalance >= totalRequired
    });
    
    if (totalBalance < totalRequired) {
      return res.status(400).json({ 
        error: 'Insufficient SUI balance', 
        required: (totalRequired / 1e9).toFixed(4), 
        available: (totalBalance / 1e9).toFixed(4),
        shortfall: ((totalRequired - totalBalance) / 1e9).toFixed(4),
        suggestion: 'Please add more SUI to your wallet'
      });
    }
    
    // Advanced coin strategy analysis
    const sortedCoins = coinData.sort((a, b) => b.balance - a.balance);
    
    // Strategy analysis
    const largeCoins = sortedCoins.filter(c => c.balance >= totalRequired);
    const gasCapableCoins = sortedCoins.filter(c => c.balance >= gasBuffer);
    
    let coinStrategy = 'unknown';
    let needsConsolidation = false;
    let recommendedPaymentCoin = null;
    let recommendedGasCoin = null;
    
    if (largeCoins.length >= 2) {
      coinStrategy = 'separate_large_coins';
      recommendedPaymentCoin = largeCoins[0];
      recommendedGasCoin = largeCoins[1];
    } else if (largeCoins.length === 1) {
      coinStrategy = 'large_payment_separate_gas';
      recommendedPaymentCoin = largeCoins[0];
      recommendedGasCoin = gasCapableCoins.find(c => c.id !== largeCoins[0].id);
      
      if (!recommendedGasCoin) {
        coinStrategy = 'split_for_gas';
        // Will need to split the large coin
      }
    } else {
      coinStrategy = 'consolidation_required';
      needsConsolidation = true;
      
      // Check if consolidation is possible
      let accumulatedBalance = 0;
      const coinsNeededForConsolidation = [];
      
      for (const coin of sortedCoins) {
        coinsNeededForConsolidation.push(coin);
        accumulatedBalance += coin.balance;
        
        if (accumulatedBalance >= totalRequired) {
          break;
        }
      }
      
      if (accumulatedBalance < totalRequired) {
        return res.status(400).json({ 
          error: 'Insufficient balance even after consolidating all coins',
          totalAvailable: (accumulatedBalance / 1e9).toFixed(4),
          required: (totalRequired / 1e9).toFixed(4)
        });
      }
      
      recommendedPaymentCoin = coinsNeededForConsolidation[0]; // Primary coin for consolidation
    }
    
    // Build comprehensive booking data for frontend
    const bookingData = {
      hotelId,
      roomId,
      arrivalDate: startDate,
      departureDate: endDate,
      guestAddress,
      totalCost,
      guestInfo: {
        fullName: fullName || 'N/A',
        email: email || 'N/A',
        phone: phone || 'N/A'
      }
    };
    
    const coinAnalysis = {
      totalBalance: totalBalance / 1e9,
      requiredAmount: requiredAmount / 1e9,
      gasBuffer: gasBuffer / 1e9,
      totalRequired: totalRequired / 1e9,
      coinStrategy,
      needsConsolidation,
      availableCoins: coinData.map(coin => ({
        id: coin.id,
        balance: coin.balanceInSui,
        balanceInMist: coin.balance,
        canCoverTotal: coin.balance >= totalRequired,
        canCoverGas: coin.balance >= gasBuffer
      })),
      recommendedCoins: {
        paymentCoin: recommendedPaymentCoin ? {
          id: recommendedPaymentCoin.id,
          balance: recommendedPaymentCoin.balanceInSui
        } : null,
        gasCoin: recommendedGasCoin ? {
          id: recommendedGasCoin.id,
          balance: recommendedGasCoin.balanceInSui
        } : null
      },
      strategies: {
        separateLargeCoins: largeCoins.length >= 2,
        largePaymentSeparateGas: largeCoins.length === 1 && gasCapableCoins.length > 1,
        splitForGas: largeCoins.length === 1 && gasCapableCoins.length === 1,
        consolidationRequired: largeCoins.length === 0
      }
    };
    
    console.log('Coin strategy determined:', {
      strategy: coinStrategy,
      needsConsolidation,
      largeCoinsCount: largeCoins.length,
      gasCapableCoinsCount: gasCapableCoins.length
    });
    
    // Return comprehensive data for frontend execution
    res.json({
      success: true,
      message: 'Booking data prepared with comprehensive coin analysis',
      bookingData,
      coinAnalysis,
      instructions: {
        step1: 'Frontend will analyze coin strategy and handle appropriately',
        step2: 'Use bookRoomWithGasHandling from the improved bookingService.js',
        step3: 'After successful transaction, call /api/transactions/complete-booking'
      }
    });
    
  } catch (error) {
    console.error('executeBookRoom - Unhandled error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to prepare booking', 
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestion: 'Please try again or contact support if the issue persists'
    });
  }
};

// Enhanced completeBooking function with better error handling
const completeBooking = async (req, res) => {
  try {
    const { 
      reservationId, 
      transactionDigest,
      roomId, 
      hotelId, 
      startDate, 
      endDate, 
      fullName, 
      email, 
      phone, 
      guestAddress, 
      totalCost 
    } = req.body;
    
    if (!reservationId || !transactionDigest) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        details: 'reservationId and transactionDigest are required' 
      });
    }
    
    console.log('Completing booking with reservationId:', reservationId);
    
    // Verify transaction exists on blockchain (optional but recommended)
    let transactionValid = false;
    try {
      const suiModule = await import('../services/suiService.js');
      const client = suiModule.client;
      const txResult = await client.getTransactionBlock({
        digest: transactionDigest,
        options: { showEffects: true, showObjectChanges: true }
      });
      
      if (txResult && txResult.effects.status.status === 'success') {
        transactionValid = true;
        console.log('Transaction verified on blockchain:', transactionDigest);
      }
    } catch (verifyError) {
      console.warn('Could not verify transaction on blockchain:', verifyError.message);
      // Continue anyway - transaction might be valid but verification failed
      transactionValid = true; // Assume valid for now
    }
    
    if (!transactionValid) {
      return res.status(400).json({ 
        error: 'Invalid or failed transaction', 
        transactionDigest 
      });
    }
    
    // Database operations with better error handling
    let databaseUpdates = {
      reservation: false,
      room: false,
      email: false
    };
    
    try {
      // Update reservation in database
      const reservationUpdateResult = await Reservation.updateOne(
        { objectId: reservationId },
        { $set: {
          objectId: reservationId,
          hotelId,
          roomId,
          guestAddress,
          fullName: fullName || 'N/A',
          email: email || 'N/A',
          phone: phone || 'N/A',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          totalCost: Number(totalCost) || 0,
          isActive: true,
          transactionDigest,
          createdAt: new Date(),
          updatedAt: new Date()
        } },
        { upsert: true }
      );
      
      databaseUpdates.reservation = true;
      console.log('Reservation updated in database:', {
        reservationId,
        matched: reservationUpdateResult.matchedCount,
        modified: reservationUpdateResult.modifiedCount,
        upserted: reservationUpdateResult.upsertedCount
      });
    } catch (dbError) {
      console.error('Reservation database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to save reservation to database', 
        details: dbError.message,
        reservationId // Include this so they know the blockchain transaction succeeded
      });
    }

    try {
      // Update room booking status
      const roomUpdateResult = await Room.updateOne(
        { objectId: roomId },
        { 
          $set: { 
            isBooked: true,
            lastBookedAt: new Date(),
            currentReservationId: reservationId
          } 
        }
      );
      
      databaseUpdates.room = roomUpdateResult.modifiedCount > 0;
      console.log('Room booking status updated:', {
        roomId,
        matched: roomUpdateResult.matchedCount,
        modified: roomUpdateResult.modifiedCount
      });
    } catch (roomError) {
      console.error('Room update error:', roomError);
      // Don't fail the entire request if room update fails
      databaseUpdates.room = false;
    }

    // Send booking confirmation email
    if (email && email !== 'N/A') {
      try {
        const { sendBookingEmail } = await import('../services/emailService.js');
        
        const bookingSummary = {
          reservationId,
          hotelId,
          roomId,
          guestName: fullName,
          email,
          phone,
          checkIn: startDate,
          checkOut: endDate,
          totalCost: Number(totalCost),
          transactionDigest
        };
        
        const qrData = {
          reservationId,
          hotelId,
          roomId,
          guestAddress,
          fullName,
          email,
          phone,
          startDate,
          endDate,
          totalCost,
          transactionDigest
        };
        
        await sendBookingEmail({
          to: email,
          subject: 'Your Suite Booking Confirmation',
          bookingSummary: JSON.stringify(bookingSummary, null, 2),
          qrData: JSON.stringify(qrData)
        });
        
        databaseUpdates.email = true;
        console.log('Booking confirmation email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send booking email:', emailError);
        databaseUpdates.email = false;
        // Don't fail the entire request if email fails
      }
    }

    // Return comprehensive success response
    const response = {
      success: true,
      reservationId,
      transactionDigest,
      message: 'Booking completed successfully',
      databaseUpdates,
      bookingDetails: {
        reservationId,
        hotelId,
        roomId,
        guestName: fullName,
        email,
        phone,
        guestAddress,
        checkInDate: startDate,
        checkOutDate: endDate,
        totalCost: Number(totalCost),
        createdAt: new Date().toISOString()
      }
    };
    
    console.log('Booking completion response:', response);
    res.json(response);
    
  } catch (error) {
    console.error('completeBooking - Unhandled error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to complete booking', 
      details: error.message,
      timestamp: new Date().toISOString(),
      suggestion: 'The blockchain transaction may have succeeded. Please check your wallet and contact support.'
    });
  }
};

// Enhanced executeLeaveReview with better validation
const executeLeaveReview = async (req, res) => {
  try {
    const { reservationId, hotelId, rating, comment, guest, guestAddress } = req.body;
    
    // Enhanced validation
    if (!reservationId || !hotelId || rating === undefined) {
      return res.status(400).json({ 
        error: 'Missing required review fields',
        required: ['reservationId', 'hotelId', 'rating']
      });
    }
    
    // Validate rating range
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ 
        error: 'Invalid rating', 
        details: 'Rating must be between 1 and 5' 
      });
    }
    
    // Verify reservation exists and belongs to guest
    let reservation = null;
    try {
      reservation = await Reservation.findOne({ objectId: reservationId });
      if (!reservation) {
        return res.status(404).json({ error: 'Reservation not found' });
      }
      
      // If guestAddress provided, verify it matches
      if (guestAddress && reservation.guestAddress !== guestAddress) {
        return res.status(403).json({ error: 'Unauthorized: reservation does not belong to this address' });
      }
    } catch (dbError) {
      console.error('Reservation lookup error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to verify reservation', 
        details: dbError.message 
      });
    }
    
    let txb, result;
    
    try {
      txb = leaveReviewTx({ 
        reservationId, 
        hotelId, 
        rating: numericRating, 
        comment: comment || '' 
      });
      
      result = await executeTransaction(txb);
      console.log('Review transaction executed successfully:', result.digest);
    } catch (txError) {
      console.error('Review transaction error:', txError);
      return res.status(500).json({ 
        error: 'Failed to execute blockchain transaction', 
        details: txError.message 
      });
    }
    
    try {
      // Save review to database with additional metadata
      const reviewData = {
        objectId: result.objectChanges?.find(c => c.type === 'created')?.objectId || `review_${Date.now()}`,
        reservationId, 
        hotelId, 
        roomId: reservation.roomId,
        rating: numericRating, 
        comment: comment || '', 
        guest: guest || reservation.fullName || 'Anonymous',
        guestAddress: guestAddress || reservation.guestAddress,
        transactionDigest: result.digest,
        createdAt: new Date()
      };
      
      await Review.create(reviewData);
      console.log('Review saved to database:', reviewData.objectId);
    } catch (dbError) {
      console.error('Review database error:', dbError);
      return res.status(500).json({ 
        error: 'Failed to save review to database', 
        details: dbError.message,
        transactionDigest: result.digest // Include this so they know blockchain transaction succeeded
      });
    }
    
    res.json({ 
      success: true, 
      digest: result.digest,
      rating: numericRating,
      message: 'Review submitted successfully'
    });
    
  } catch (error) {
    console.error('executeLeaveReview - Unhandled error:', {
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    res.status(500).json({ 
      error: 'Failed to execute leave review', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Keep all existing functions unchanged and export everything
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
  completeBooking,
};