const mongoose = require('mongoose');
const { ROOM_TYPES, CATEGORIES, ID_TYPES, GUEST_STATUSES } = require('../config/constants');

const guestSchema = new mongoose.Schema(
  {
    seq: { type: Number, index: true },
    guestCode: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true },
    identityProofType: { type: String, enum: ID_TYPES, required: true },
    identityProofNumber: { type: String, required: true, trim: true },
    roomNumber: { type: String, required: true },
    roomNumbers: [{ type: String }],
    floor: { type: Number },
    roomType: { type: String, enum: Object.keys(ROOM_TYPES) },
    category: { type: String, enum: CATEGORIES },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    actualCheckOut: { type: String, default: null },
    numberOfGuests: { type: Number, default: 1, min: 1 },
    status: { type: String, enum: GUEST_STATUSES, default: 'Reserved', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Guest', guestSchema);
