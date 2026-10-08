const mongoose = require('mongoose');
const { ROOM_TYPES, CATEGORIES, BOOKING_STATUSES, PAYMENT_STATUSES } = require('../config/constants');

const bookingSchema = new mongoose.Schema(
  {
    seq: { type: Number, index: true },
    bookingId: { type: String, required: true, unique: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
    roomNumber: { type: String, required: true },
    roomType: { type: String, enum: Object.keys(ROOM_TYPES) },
    category: { type: String, enum: CATEGORIES },
    floor: { type: Number },
    checkInDate: { type: String, required: true },
    checkOutDate: { type: String, required: true },
    numberOfGuests: { type: Number, default: 1, min: 1 },
    bookingStatus: { type: String, enum: BOOKING_STATUSES, default: 'Confirmed', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' },
    amount: { type: Number, default: 0 },
    specialRequests: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
