const Guest = require('../models/Guest');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { getSettingsDoc } = require('../services/settings');
const { today, diffDays } = require('../utils/dates');

exports.checkIn = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.body?.guestId);
  if (!guest) throw new AppError('Guest not found.', 404);
  if (guest.status !== 'Reserved') throw new AppError('This guest is not waiting to be checked in.', 409);
  if (guest.checkInDate > today()) throw new AppError(`Check-in for ${guest.name} is scheduled for ${guest.checkInDate}.`, 409);

  const rooms = await Room.find({ roomNumber: { $in: guest.roomNumbers } });
  for (const r of rooms) {
    if (r.status === 'Maintenance' || (r.status === 'Occupied' && String(r.currentGuest) !== String(guest._id))) {
      throw new AppError(`Room ${r.roomNumber} is currently unavailable.`, 409);
    }
  }
  await Room.updateMany({ _id: { $in: rooms.map((r) => r._id) } }, { status: 'Occupied', currentGuest: guest._id });
  await Booking.updateMany({ guest: guest._id, bookingStatus: 'Confirmed' }, { bookingStatus: 'Checked-In' });
  guest.status = 'Checked-In';
  await guest.save();
  res.json({ message: `${guest.name} has been checked in to Room ${guest.roomNumbers.join(', ')}.`, guest });
});

exports.checkOut = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.body?.guestId);
  if (!guest) throw new AppError('Guest not found.', 404);
  if (guest.status !== 'Checked-In') throw new AppError('Only guests who are currently staying can be checked out.', 409);

  const settings = await getSettingsDoc();
  const requested = req.body?.roomStatus;
  const roomStatus = ['Available', 'Cleaning'].includes(requested) ? requested : settings.cleaningAfterCheckout ? 'Cleaning' : 'Available';
  const T = today();

  const bookings = await Booking.find({ guest: guest._id, bookingStatus: 'Checked-In' });
  for (const b of bookings) {
    if (b.checkOutDate > T) {
      // Early departure: release the remaining nights and pro-rate the bill.
      const before = Math.max(1, diffDays(b.checkInDate, b.checkOutDate));
      const after = Math.max(1, diffDays(b.checkInDate, T));
      b.amount = Math.round((b.amount / before) * after);
      b.checkOutDate = T < b.checkInDate ? b.checkInDate : T;
    }
    b.bookingStatus = 'Checked-Out';
    await b.save();
  }
  await Room.updateMany({ roomNumber: { $in: guest.roomNumbers }, currentGuest: guest._id }, { status: roomStatus, currentGuest: null });
  guest.status = 'Checked-Out';
  guest.actualCheckOut = T;
  if (guest.checkOutDate > T) guest.checkOutDate = T < guest.checkInDate ? guest.checkInDate : T;
  await guest.save();
  res.json({ message: `Room ${guest.roomNumbers.join(', ')} has been checked out successfully.`, guest, roomStatus });
});
