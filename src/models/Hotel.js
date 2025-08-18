const mongoose = require('mongoose');
const HotelSchema = new mongoose.Schema({
  objectId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  physicalAddress: { type: String, required: true },
  owner: { type: String, required: true, index: true },
  imageUrl: { type: String },
});
module.exports = mongoose.model('Hotel', HotelSchema);
