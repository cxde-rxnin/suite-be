import mongoose from 'mongoose';
const RoomSchema = new mongoose.Schema({
    objectId: { type: String, required: true, unique: true, index: true },
    hotelId: { type: String, required: true, index: true },
    pricePerDay: { type: Number, required: true },
    isBooked: { type: Boolean, default: false },
    cloudinaryPublicId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    name: { type: String },
    type: { type: String },
    description: { type: String },
    amenities: [{ type: String }],
    perks: [{ type: String }],
});
export default mongoose.model('Room', RoomSchema);
