const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { today, diffDays, isValid } = require('../utils/dates');

function dateError(checkIn, checkOut, maxNights = 365) {
  if (!isValid(checkIn) || !isValid(checkOut)) return 'Please select valid check-in and check-out dates.';
  if (checkIn < today()) return 'Check-in date cannot be in the past.';
  if (checkOut <= checkIn) return 'Check-out date must be after the check-in date.';
  if (diffDays(checkIn, checkOut) > maxNights) return `The maximum stay is ${maxNights} nights.`;
  return null;
}

/**
 * A room can be booked for [checkIn, checkOut) when:
 *  - it is not under maintenance,
 *  - no active booking (Confirmed / Checked-In) overlaps the requested dates,
 *  - and, for same-day arrivals, it is physically ready (status Available).
 */
async function findAvailableRooms({ checkIn, checkOut, category, roomType, perRoomGuests = 1 }) {
  const query = { status: { $ne: 'Maintenance' }, capacity: { $gte: Math.min(perRoomGuests, 8) } };
  if (category) query.category = category;
  if (roomType) query.roomType = roomType;
  const busyIds = await Booking.find({
    bookingStatus: { $in: ['Confirmed', 'Checked-In'] },
    checkInDate: { $lt: checkOut },
    checkOutDate: { $gt: checkIn },
  }).distinct('room');
  const busy = new Set(busyIds.map(String));
  const sameDay = checkIn <= today();
  const rooms = await Room.find(query).sort('roomNumber').lean();
  return rooms.filter((r) => !busy.has(String(r._id)) && (!sameDay || r.status === 'Available'));
}

module.exports = { findAvailableRooms, dateError };
