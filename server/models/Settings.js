const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  hotelName: { type: String, default: 'Grand Aurelia Hotel' },
  address: { type: String, default: '14 Marine Drive, Churchgate, Mumbai, Maharashtra 400020' },
  phone: { type: String, default: '+91 22 4000 1200' },
  email: { type: String, default: 'frontdesk@grandaurelia.example' },
  checkInTime: { type: String, default: '12:00' },
  checkOutTime: { type: String, default: '11:00' },
  maxBookingDuration: { type: Number, default: 30 },
  cleaningAfterCheckout: { type: Boolean, default: false },
  notifications: {
    booking: { type: Boolean, default: true },
    checkIn: { type: Boolean, default: true },
    checkOut: { type: Boolean, default: true },
  },
});

module.exports = mongoose.model('Settings', settingsSchema);
