import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
  roomId: {
    type: String, // Sui objectId
    required: true,
    index: true,
  },
  userId: {
    type: String, // wallet address
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Favorite = mongoose.model('Favorite', favoriteSchema);
export default Favorite;
