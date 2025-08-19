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
  return provider.signAndExecuteTransactionBlock({
    signer,
    transactionBlock: txb,
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

// Transaction builders
const createHotelTx = (name, physicalAddress) => {
  const txb = new Transaction();
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::create_hotel`,
    arguments: [txb.pure(name), txb.pure(physicalAddress)],
  });
  return txb;
};

const listRoomTx = (hotelId, pricePerDay, imageUrl) => {
  const txb = new TransactionBlock();
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::list_room`,
    arguments: [
      txb.object(hotelId),
      txb.pure(pricePerDay),
      txb.pure(imageUrl || ''),
    ],
  });
  return txb;
};

const bookRoomTx = ({ roomId, hotelId, startDate, endDate, paymentCoinId }) => {
  const txb = new TransactionBlock();
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = Math.floor(new Date(endDate).getTime() / 1000);
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::book_room`,
    arguments: [
      txb.object(roomId),
      txb.object(hotelId),
      txb.pure(startTs, 'u64'),
      txb.pure(endTs, 'u64'),
      txb.object(paymentCoinId),
      txb.object(SUI_CLOCK_OBJECT_ID),
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
      txb.object(SUI_CLOCK_OBJECT_ID),
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
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return txb;
};

const rescheduleReservationTx = ({ reservationId, roomId, hotelId, newStartDate, newEndDate }) => {
  const txb = new TransactionBlock();
  const newStartTs = Math.floor(new Date(newStartDate).getTime() / 1000);
  const newEndTs = Math.floor(new Date(newEndDate).getTime() / 1000);
  txb.moveCall({
    target: `${process.env.PACKAGE_ID}::hotel_booking::reschedule_reservation`,
    arguments: [
      txb.object(reservationId),
      txb.object(roomId),
      txb.object(hotelId),
      txb.pure(newStartTs, 'u64'),
      txb.pure(newEndTs, 'u64'),
      txb.object(SUI_CLOCK_OBJECT_ID),
    ],
  });
  return txb;
};

export {
  getProvider,
  getObjectDetails,
  executeTransaction,
  createHotelTx,
  listRoomTx,
  bookRoomTx,
  cancelReservationTx,
  leaveReviewTx,
  rescheduleReservationTx,
};