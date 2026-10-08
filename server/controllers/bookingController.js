const Booking = require('../models/Booking');
const Guest = require('../models/Guest');
const Room = require('../models/Room');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { ROOM_TYPES, CATEGORIES, ID_TYPES, PAYMENT_STATUSES } = require('../config/constants');
const { findAvailableRooms, dateError } = require('../services/availability');
const { getSettingsDoc } = require('../services/settings');
const { sendBookingNotification } = require('../services/mailer');
const { today, diffDays } = require('../utils/dates');

const str = (v) => String(v ?? '').trim();

function validateBooking(b, settings) {
  const e = {};
  if (str(b.guestName).length < 2) e.guestName = 'Enter the guest name.';
  if (!/^[6-9]\d{9}$/.test(str(b.mobile))) e.mobile = 'Enter a valid 10-digit mobile number.';
  if (!/^\S+@\S+\.\S+$/.test(str(b.email))) e.email = 'Enter a valid email address.';
  if (str(b.location).length < 2) e.location = 'Enter the guest location.';
  if (!ID_TYPES.includes(b.identityProofType)) e.identityProofType = 'Select an identity proof type.';
  const idn = str(b.identityProofNumber);
  if (idn.length < 4) e.identityProofNumber = 'Enter the identity proof number.';
  else if (b.identityProofType === 'Aadhaar' && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(idn)) e.identityProofNumber = 'Aadhaar must have 12 digits.';
  else if (b.identityProofType === 'PAN' && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(idn)) e.identityProofNumber = 'PAN format is ABCDE1234F.';
  const de = dateError(b.checkInDate, b.checkOutDate, settings.maxBookingDuration);
  if (de) e.checkOutDate = de;
  const guests = Number(b.numberOfGuests);
  const rooms = Number(b.numberOfRooms);
  if (!Number.isInteger(guests) || guests < 1 || guests > 40) e.numberOfGuests = 'Enter between 1 and 40 guests.';
  if (!Number.isInteger(rooms) || rooms < 1 || rooms > 5) e.numberOfRooms = 'You can book 1 to 5 rooms at a time.';
  if (b.category && !CATEGORIES.includes(b.category)) e.category = 'Select a valid preference.';
  if (b.roomType && !ROOM_TYPES[b.roomType]) e.roomType = 'Select a valid room type.';
  if (!e.numberOfGuests && !e.numberOfRooms && b.roomType && ROOM_TYPES[b.roomType].category !== 'Dormitory') {
    const cap = ROOM_TYPES[b.roomType].capacity;
    if (Math.ceil(guests / rooms) > cap) e.numberOfGuests = `${b.roomType} fits ${cap} guest${cap > 1 ? 's' : ''} per room. Add rooms or pick a larger type.`;
  }
  return e;
}

exports.listBookings = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.bookingStatus = req.query.status;
  const bookings = await Booking.find(q).sort({ createdAt: -1, seq: -1 }).populate('guest', 'name mobile guestCode status').lean();
  res.json(bookings);
});

exports.getBooking = asyncHandler(async (req, res) => {
  const filter = /^BK-/i.test(req.params.id) ? { bookingId: req.params.id.toUpperCase() } : { _id: req.params.id };
  const booking = await Booking.findOne(filter).populate('guest').lean();
  if (!booking) throw new AppError('Booking not found.', 404);
  res.json(booking);
});

exports.createBooking = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const settings = await getSettingsDoc();
  const errors = validateBooking(b, settings);
  if (Object.keys(errors).length) throw new AppError('Please correct the highlighted fields.', 400, errors);

  const checkIn = b.checkInDate;
  const checkOut = b.checkOutDate;
  const rooms = Number(b.numberOfRooms);
  const guests = Number(b.numberOfGuests);
  const nights = diffDays(checkIn, checkOut);
  const perRoom = Math.ceil(guests / rooms);

  const dup = await Guest.exists({ mobile: str(b.mobile), checkInDate: checkIn, checkOutDate: checkOut, status: { $in: ['Reserved', 'Checked-In'] } });
  if (dup) throw new AppError('A booking for this guest already exists for the selected dates.', 409);

  const available = await findAvailableRooms({ checkIn, checkOut, category: b.category, roomType: b.roomType, perRoomGuests: perRoom });
  let chosen;
  if (Array.isArray(b.roomNumbers) && b.roomNumbers.length) {
    if (b.roomNumbers.length !== rooms) throw new AppError(`Please select exactly ${rooms} room${rooms > 1 ? 's' : ''}, or clear the selection to auto-assign.`, 400);
    chosen = b.roomNumbers.map((n) => {
      const r = available.find((x) => x.roomNumber === String(n));
      if (!r) throw new AppError(`Room ${n} is currently unavailable for the selected dates.`, 409);
      return r;
    });
  } else {
    if (!available.length) throw new AppError('No rooms are available for the selected dates and preferences.', 409);
    if (available.length < rooms) throw new AppError(`Only ${available.length} matching room${available.length > 1 ? 's are' : ' is'} available for those dates.`, 409);
    chosen = available.slice(0, rooms);
  }

  const lastGuest = await Guest.findOne().sort({ seq: -1 }).select('seq').lean();
  const lastBooking = await Booking.findOne().sort({ seq: -1 }).select('seq').lean();
  const gseq = (lastGuest?.seq || 0) + 1;
  let bseq = lastBooking?.seq || 0;
  const created = { guest: null, bookings: [] };
  try {
    created.guest = await Guest.create({
      seq: gseq,
      guestCode: `GST-${1000 + gseq}`,
      name: str(b.guestName),
      mobile: str(b.mobile),
      email: str(b.email),
      location: str(b.location),
      identityProofType: b.identityProofType,
      identityProofNumber: str(b.identityProofNumber),
      roomNumber: chosen[0].roomNumber,
      roomNumbers: chosen.map((r) => r.roomNumber),
      floor: chosen[0].floor,
      roomType: chosen[0].roomType,
      category: chosen[0].category,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfGuests: guests,
      status: 'Reserved',
    });
    for (let i = 0; i < chosen.length; i++) {
      const r = chosen[i];
      bseq += 1;
      const share = Math.floor(guests / rooms) + (i < guests % rooms ? 1 : 0);
      created.bookings.push(await Booking.create({
        seq: bseq,
        bookingId: `BK-${10000 + bseq}`,
        guest: created.guest._id,
        room: r._id,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        category: r.category,
        floor: r.floor,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: Math.max(1, share),
        bookingStatus: 'Confirmed',
        paymentStatus: 'Pending',
        amount: r.price * nights,
        specialRequests: str(b.specialRequests).slice(0, 500),
      }));
    }
    // Same-day arrivals reserve the room immediately; future arrivals keep it bookable for the days in between.
    if (checkIn === today()) {
      await Room.updateMany({ _id: { $in: chosen.map((r) => r._id) } }, { status: 'Reserved', currentGuest: created.guest._id });
    }
  } catch (err) {
    // Roll back partial writes so the data stays consistent.
    if (created.bookings.length) await Booking.deleteMany({ _id: { $in: created.bookings.map((x) => x._id) } });
    if (created.guest) await Guest.deleteOne({ _id: created.guest._id });
    throw err;
  }

  if (settings.notifications?.booking !== false) {
    sendBookingNotification().catch((err) => console.error('[mail] Failed to send booking notification:', err.message));
  }
  res.status(201).json({ message: 'Booking successfully created.', guest: created.guest, bookings: created.bookings });
});

exports.updateBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  const { paymentStatus, specialRequests } = req.body || {};
  if (paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new AppError('Select a valid payment status.', 400);
    booking.paymentStatus = paymentStatus;
  }
  if (specialRequests !== undefined) booking.specialRequests = str(specialRequests).slice(0, 500);
  await booking.save();
  res.json({ message: `Booking ${booking.bookingId} has been updated.`, booking });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.bookingStatus !== 'Confirmed') throw new AppError('Only confirmed bookings that have not been checked in can be cancelled.', 409);
  booking.bookingStatus = 'Cancelled';
  if (['Paid', 'Partial'].includes(booking.paymentStatus)) booking.paymentStatus = 'Refunded';
  await booking.save();

  const room = await Room.findById(booking.room);
  if (room && room.status === 'Reserved' && String(room.currentGuest) === String(booking.guest)) {
    room.status = 'Available';
    room.currentGuest = null;
    await room.save();
  }
  const guest = await Guest.findById(booking.guest);
  if (guest) {
    const active = await Booking.countDocuments({ guest: guest._id, bookingStatus: { $in: ['Confirmed', 'Checked-In'] } });
    if (!active) guest.status = 'Cancelled';
    else {
      guest.roomNumbers = guest.roomNumbers.filter((n) => n !== booking.roomNumber);
      guest.roomNumber = guest.roomNumbers[0] || guest.roomNumber;
    }
    await guest.save();
  }
  res.json({ message: `Booking ${booking.bookingId} has been cancelled.`, booking });
});
