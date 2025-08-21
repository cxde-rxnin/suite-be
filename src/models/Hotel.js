import mongoose from 'mongoose';
const HotelSchema = new mongoose.Schema({
  objectId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  physicalAddress: { type: String, required: true },
  owner: { type: String, required: true, index: true },
  imageUrl: { type: String },
  description: { type: String },
  amenities: [{ type: String }],
});
export default mongoose.model('Hotel', HotelSchema);
