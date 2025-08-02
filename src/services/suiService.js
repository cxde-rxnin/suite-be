const {
    SuiClient,
    getFullnodeUrl,
    SuiHTTPTransport,
} = require('@mysten/sui.js/client');
const WebSocket = require('ws');

const {
    Ed25519Keypair,
} = require('@mysten/sui.js/keypairs/ed25519');

const {
    decodeSuiPrivateKey,
} = require('@mysten/sui.js/cryptography');

const {
    TransactionBlock,
} = require('@mysten/sui.js/transactions');

const {
    SUI_CLOCK_OBJECT_ID
} = require('@mysten/sui.js/utils');

require('dotenv').config();

const getProvider = () => {
    // Try a simpler WebSocket configuration
    return new SuiClient({
        url: getFullnodeUrl(process.env.SUI_NETWORK || 'devnet'),
        transport: new SuiHTTPTransport({
            url: getFullnodeUrl(process.env.SUI_NETWORK || 'devnet'),
            WebSocketConstructor: WebSocket,
        }),
    });
};

const getAdminSigner = () => {
    // Decode the Sui private key format (suiprivkey1...)
    const { secretKey } = decodeSuiPrivateKey(process.env.ADMIN_SECRET_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    return keypair;
};

// Function for admin to sign and execute a transaction
const executeTransaction = async (txb) => {
    const signer = getAdminSigner();
    const provider = getProvider();
    
    try {
        const result = await provider.signAndExecuteTransactionBlock({
            signer,
            transactionBlock: txb,
            options: {
                showEffects: true,
                showObjectChanges: true,
                showEvents: true,
            },
        });
        
        console.log('Transaction executed successfully:', result.digest);
        return result;
    } catch (error) {
        console.error('Transaction execution failed:', error);
        throw error;
    }
};

// Fetches details for multiple objects at once
const getObjectDetails = async (objectIds) => {
    const provider = getProvider();
    if (objectIds.length === 0) return [];
    const objects = await provider.multiGetObjects({
        ids: objectIds,
        options: { showContent: true, showDisplay: true },
    });
    return objects
        .filter(obj => obj.data)
        .map(obj => ({
            objectId: obj.data.objectId,
            ...obj.data.content.fields
        }));
};

// ============= Transaction Block Builders =============
// These functions create unsigned transactions for the frontend to sign.

const createHotelTx = (name, physicalAddress) => {
    const txb = new TransactionBlock();
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::create_hotel`,
        arguments: [txb.pure(name), txb.pure(physicalAddress)],
    });
    return txb;
};

const listRoomTx = (hotelId, pricePerDay, imageUrl) => {
    console.log('Creating room transaction with:', { hotelId, pricePerDay, imageUrl });
    const txb = new TransactionBlock();
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::list_room`,
        arguments: [
            txb.object(hotelId), 
            txb.pure(pricePerDay),
            txb.pure(imageUrl || '') // This is the image_blob_id parameter
        ],
    });
    console.log('Transaction block created successfully');
    return txb;
};

const bookRoomTx = ({ roomId, hotelId, startDate, endDate, paymentCoinId }) => {
    const txb = new TransactionBlock();
    
    // Convert date strings to Unix timestamps (seconds since epoch)
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::book_room`,
        arguments: [
            txb.object(roomId),
            txb.object(hotelId),
            txb.pure(startTimestamp, 'u64'),
            txb.pure(endTimestamp, 'u64'),
            txb.object(paymentCoinId),
            txb.object(SUI_CLOCK_OBJECT_ID)
        ],
    });
    return txb;
};

const cancelReservationTx = ({ reservationId, roomId, hotelId }) => {
    const txb = new TransactionBlock();
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::cancel_reservation`,
        arguments: [
            txb.object(reservationId),
            txb.object(roomId),
            txb.object(hotelId),
            txb.object(SUI_CLOCK_OBJECT_ID)
        ],
    });
    return txb;
};

const leaveReviewTx = ({ reservationId, hotelId, rating, comment }) => {
    const txb = new TransactionBlock();
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::leave_review`,
        arguments: [
            txb.object(reservationId),
            txb.object(hotelId),
            txb.pure(rating),
            txb.pure(comment),
            txb.object(SUI_CLOCK_OBJECT_ID)
        ],
    });
    return txb;
};



// Reschedule Reservation Transaction
// Assumes Move function: reschedule_reservation(reservation_id, room_id, hotel_id, new_start_date, new_end_date, clock)
const rescheduleReservationTx = ({ reservationId, roomId, hotelId, newStartDate, newEndDate }) => {
    const txb = new TransactionBlock();
    txb.moveCall({
        target: `${process.env.PACKAGE_ID}::hotel_booking::reschedule_reservation`,
        arguments: [
            txb.object(reservationId),
            txb.object(roomId),
            txb.object(hotelId),
            txb.pure(newStartDate),
            txb.pure(newEndDate),
            txb.object(SUI_CLOCK_OBJECT_ID)
        ],
    });
    return txb;
};

module.exports = {
    getProvider,
    getObjectDetails,
    createHotelTx,
    listRoomTx,
    bookRoomTx,
    cancelReservationTx,
    leaveReviewTx,
    rescheduleReservationTx,
    executeTransaction,
};