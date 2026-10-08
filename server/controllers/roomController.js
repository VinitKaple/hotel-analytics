const Room = require('../models/Room');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { ROOM_TYPES } = require('../config/constants');
const { findAvailableRooms, dateError } = require('../services/availability');

const guestFields = 'name guestCode mobile checkInDate checkOutDate numberOfGuests status';

exports.listRooms = asyncHandler(async (req, res) => {
  const q = {};
  ['category', 'roomType', 'status'].forEach((k) => req.query[k] && (q[k] = req.query[k]));
  if (req.query.floor !== undefined && req.query.floor !== '') q.floor = Number(req.query.floor);
  if (req.query.capacity) q.capacity = { $gte: Number(req.query.capacity) };
  const rooms = await Room.find(q).sort('roomNumber').populate('currentGuest', guestFields).lean();
  res.json(rooms);
});

exports.availableRooms = asyncHandler(async (req, res) => {
  const { checkIn, checkOut, category, roomType, guests = 1, rooms = 1 } = req.query;
  const err = dateError(checkIn, checkOut);
  if (err) throw new AppError(err, 400);
  const perRoomGuests = Math.ceil(Number(guests) / Math.max(1, Number(rooms))) || 1;
  res.json(await findAvailableRooms({ checkIn, checkOut, category, roomType, perRoomGuests }));
});

exports.getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('currentGuest', guestFields).lean();
  if (!room) throw new AppError('Room not found.', 404);
  res.json(room);
});

exports.createRoom = asyncHandler(async (req, res) => {
  const { roomNumber, floor, roomType, capacity, price } = req.body || {};
  const def = ROOM_TYPES[roomType];
  if (!String(roomNumber || '').trim()) throw new AppError('Enter a room number.', 400);
  if (!def) throw new AppError('Select a valid room type.', 400);
  if (floor === undefined || floor === '' || isNaN(Number(floor))) throw new AppError('Select a floor.', 400);
  if (await Room.exists({ roomNumber: String(roomNumber).trim() })) throw new AppError(`Room ${roomNumber} already exists.`, 409);
  const room = await Room.create({
    roomNumber: String(roomNumber).trim(),
    floor: Number(floor),
    roomType,
    category: def.category,
    capacity: Number(capacity) || def.capacity,
    price: Number(price) >= 0 && price !== '' && price !== undefined ? Number(price) : def.price,
    status: 'Available',
  });
  res.status(201).json({ message: `Room ${room.roomNumber} has been added.`, room });
});

exports.updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found.', 404);
  const { status, price, capacity, roomType, floor } = req.body || {};
  const locked = ['Occupied', 'Reserved'].includes(room.status);
  if (status !== undefined && status !== room.status) {
    if (locked) throw new AppError(`Room ${room.roomNumber} is currently unavailable for this change. Check the guest out first.`, 409);
    if (!['Available', 'Cleaning', 'Maintenance'].includes(status)) throw new AppError('That status is set automatically by bookings and check-ins.', 400);
    room.status = status;
  }
  if (price !== undefined && price !== '') { if (Number(price) < 0) throw new AppError('Price must be a positive amount.', 400); room.price = Number(price); }
  if (capacity !== undefined && capacity !== '') { if (Number(capacity) < 1) throw new AppError('Capacity must be at least 1.', 400); room.capacity = Number(capacity); }
  if (floor !== undefined && floor !== '') room.floor = Number(floor);
  if (roomType !== undefined && roomType !== room.roomType) {
    if (locked) throw new AppError(`Room ${room.roomNumber} is currently unavailable for this change.`, 409);
    if (!ROOM_TYPES[roomType]) throw new AppError('Select a valid room type.', 400);
    room.roomType = roomType;
    room.category = ROOM_TYPES[roomType].category;
  }
  await room.save();
  res.json({ message: `Room ${room.roomNumber} has been updated.`, room });
});

exports.deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new AppError('Room not found.', 404);
  if (['Occupied', 'Reserved'].includes(room.status)) throw new AppError(`Room ${room.roomNumber} is currently unavailable and cannot be deleted.`, 409);
  const active = await Booking.countDocuments({ room: room._id, bookingStatus: { $in: ['Confirmed', 'Checked-In'] } });
  if (active) throw new AppError(`Room ${room.roomNumber} has upcoming bookings. Cancel them before deleting the room.`, 409);
  await room.deleteOne();
  res.json({ message: `Room ${room.roomNumber} has been deleted.` });
});
