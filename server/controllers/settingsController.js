const Room = require('../models/Room');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { ROOM_TYPES } = require('../config/constants');
const { getSettingsDoc } = require('../services/settings');

exports.getSettings = asyncHandler(async (req, res) => res.json((await getSettingsDoc()).toObject()));

exports.updateSettings = asyncHandler(async (req, res) => {
  const doc = await getSettingsDoc();
  const b = req.body || {};
  ['hotelName', 'address', 'phone', 'email', 'checkInTime', 'checkOutTime'].forEach((k) => {
    if (b[k] !== undefined) {
      if (!String(b[k]).trim()) throw new AppError('Please fill in all required fields.', 400);
      doc.set(k, String(b[k]).trim());
    }
  });
  if (b.maxBookingDuration !== undefined) {
    const n = Number(b.maxBookingDuration);
    if (!Number.isInteger(n) || n < 1 || n > 365) throw new AppError('Maximum booking duration must be between 1 and 365 nights.', 400);
    doc.set('maxBookingDuration', n);
  }
  if (b.cleaningAfterCheckout !== undefined) doc.set('cleaningAfterCheckout', !!b.cleaningAfterCheckout);
  if (b.notifications) ['booking', 'checkIn', 'checkOut'].forEach((k) => b.notifications[k] !== undefined && doc.set(`notifications.${k}`, !!b.notifications[k]));
  await doc.save();
  res.json({ message: 'Settings saved.', settings: doc.toObject() });
});

// Updates price & capacity for every room of one type.
exports.updateRoomType = asyncHandler(async (req, res) => {
  const { roomType, price, capacity } = req.body || {};
  if (!ROOM_TYPES[roomType]) throw new AppError('Select a valid room type.', 400);
  if (!(Number(price) >= 0) || price === '') throw new AppError('Enter a valid price.', 400);
  if (!(Number(capacity) >= 1)) throw new AppError('Capacity must be at least 1.', 400);
  const result = await Room.updateMany({ roomType }, { price: Number(price), capacity: Number(capacity) });
  res.json({ message: `${roomType} pricing updated for ${result.modifiedCount ?? result.nModified ?? 0} rooms.` });
});
