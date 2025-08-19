import mongoose from 'mongoose';
const ReservationSchema = new mongoose.Schema({
    objectId: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, required: true },
    hotelId: { type: String, required: true },
    guestAddress: { type: String, required: true, index: true },
    // PRIVATE USER INFO - Stored securely off-chain
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalCost: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
});
export default mongoose.model('Reservation', ReservationSchema);
