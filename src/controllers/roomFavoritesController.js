// Get favorites by userId
export async function getFavoritesByUser(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const favorites = await Favorite.find({ userId });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
import Room from '../models/Room.js';
import Favorite from '../models/Favorite.js';

// Add room to favorites
export async function addFavorite(req, res) {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    // Prevent duplicate favorites
    const existing = await Favorite.findOne({ roomId, userId });
    if (existing) return res.status(200).json(existing);
    const favorite = await Favorite.create({ roomId, userId });
    res.status(201).json(favorite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Remove room from favorites
export async function removeFavorite(req, res) {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    const result = await Favorite.findOneAndDelete({ roomId, userId });
    if (!result) return res.status(404).json({ error: 'Favorite not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
