import Room from '../models/Room.js';
import Reservation from '../models/Reservation.js';

// Update room data
export async function updateRoom(req, res) {
  try {
    const { roomId } = req.params;
    const update = req.body;
    const room = await Room.findByIdAndUpdate(roomId, update, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get booking info for a room
export async function getRoomBookingInfo(req, res) {
  try {
    const { roomId } = req.params;
    const reservation = await Reservation.findOne({ room: roomId }).populate('user');
    if (!reservation) return res.status(404).json({ error: 'No booking found for this room' });
    res.json({
      userName: reservation.user?.name || 'Unknown',
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      status: reservation.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}