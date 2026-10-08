const mongoose = require('mongoose');
const { ROOM_TYPES, CATEGORIES, ROOM_STATUSES } = require('../config/constants');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true, trim: true },
    floor: { type: Number, required: true, min: 0, max: 20 },
    roomType: { type: String, required: true, enum: Object.keys(ROOM_TYPES) },
    category: { type: String, required: true, enum: CATEGORIES },
    capacity: { type: Number, required: true, min: 1, max: 50 },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ROOM_STATUSES, default: 'Available', index: true },
    currentGuest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
