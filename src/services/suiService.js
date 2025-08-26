import { SuiClient, getFullnodeUrl, SuiHTTPTransport } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import dotenv from 'dotenv';
dotenv.config();

const getProvider = () => new SuiClient({
  url: getFullnodeUrl(process.env.SUI_NETWORK || 'devnet'),
  transport: new SuiHTTPTransport({
    url: getFullnodeUrl(process.env.SUI_NETWORK || 'devnet'),
  }),
});

const getAdminSigner = () => {
  const { secretKey } = decodeSuiPrivateKey(process.env.ADMIN_SECRET_KEY);
  return Ed25519Keypair.fromSecretKey(secretKey);
};

const executeTransaction = async (txb) => {
  const signer = getAdminSigner();
  const provider = getProvider();
  return provider.signAndExecuteTransaction({
    signer,
    transaction: txb,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
};

const getObjectDetails = async (objectIds) => {
  if (!objectIds || objectIds.length === 0) return [];
  const provider = getProvider();
  const objects = await provider.multiGetObjects({
    ids: objectIds,
    options: { showContent: true, showDisplay: true },
  });
  return objects.filter(o => o.data).map(o => ({ objectId: o.data.objectId, ...o.data.content.fields }));
};

// Transaction builders - ALL THESE ARE ENTRY FUNCTIONS
// Entry functions handle object transfers internally and don't return values

const createHotelTx = (name, physicalAddress) => {
  const txb = new Transaction();
  // Entry function - handles transfer internally with transfer::share_object(hotel)
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::create_hotel`,
    arguments: [
      txb.pure.string(name),
      txb.pure.string(physicalAddress),
    ],
  });
  
  return txb;
};

const listRoomTx = (hotelId, pricePerDay, imageUrl) => {
  const txb = new Transaction();
  // Entry function - handles transfer internally with transfer::share_object(room)
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::list_room`,
    arguments: [
      txb.object(hotelId),
      txb.pure.u64(pricePerDay),
      txb.pure.string(imageUrl || ''),
    ],
  });
  
  return txb;
};

const bookRoomTx = ({ roomId, hotelId, startDate, endDate, paymentCoinId }) => {
  const txb = new Transaction();
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = Math.floor(new Date(endDate).getTime() / 1000);
  
  // Entry function - handles transfer internally with transfer::public_transfer(reservation, sender)
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::book_room`,
    arguments: [
      txb.object(roomId),
      txb.object(hotelId),
      txb.pure.u64(startTs),
      txb.pure.u64(endTs),
      txb.object(paymentCoinId),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  
  return txb;
};

const cancelReservationTx = ({ reservationId, roomId, hotelId }) => {
  const txb = new Transaction();
  // Entry function - handles transfer internally with transfer::public_transfer(refund_coin, sender)
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::cancel_reservation`,
    arguments: [
      txb.object(reservationId),
      txb.object(roomId),
      txb.object(hotelId),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  
  return txb;
};

const leaveReviewTx = ({ reservationId, hotelId, rating, comment }) => {
  const txb = new Transaction();
  // Entry function - handles transfer internally with transfer::share_object(review)
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::leave_review`,
    arguments: [
      txb.object(reservationId),
      txb.object(hotelId),
      txb.pure.u8(rating),
      txb.pure.string(comment),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  
  return txb;
};

const rescheduleReservationTx = ({ reservationId, roomId, hotelId, newStartDate, newEndDate }) => {
  const txb = new Transaction();
  const newStartTs = Math.floor(new Date(newStartDate).getTime() / 1000);
  const newEndTs = Math.floor(new Date(newEndDate).getTime() / 1000);
  
  // Entry function - modifies existing objects in place, no transfer needed
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::reschedule_reservation`,
    arguments: [
      txb.object(reservationId),
      txb.object(roomId),
      txb.object(hotelId),
      txb.pure.u64(newStartTs),
      txb.pure.u64(newEndTs),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  
  return txb;
};

// Alternative approach: Set explicit gas budget to avoid automatic budget determination
const executeTransactionWithBudget = async (txb, gasBudget = 10_000_000) => {
  const signer = getAdminSigner();
  const provider = getProvider();
  
  // Set explicit gas budget to avoid automatic determination
  txb.setGasBudget(gasBudget);
  
  return provider.signAndExecuteTransaction({
    signer,
    transaction: txb,
    options: { showEffects: true, showObjectChanges: true, showEvents: true },
  });
};

// Export the client for use in other modules
export const client = getProvider();

export {
  getProvider,
  getObjectDetails,
  executeTransaction,
  executeTransactionWithBudget,
  createHotelTx,
  listRoomTx,
  bookRoomTx,
  cancelReservationTx,
  leaveReviewTx,
  rescheduleReservationTx,
};