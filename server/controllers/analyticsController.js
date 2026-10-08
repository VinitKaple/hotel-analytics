const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Booking = require('../models/Booking');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const { CATEGORIES, FLOOR_NAMES, ROOM_TYPES } = require('../config/constants');
const { today, addDays, diffDays, isValid, range, short, parse, fmt, MONTHS } = require('../utils/dates');
const { occupiedBookings, rate } = require('../services/stats');

function summarize(rooms) {
  const c = (s) => rooms.filter((r) => r.status === s).length;
  const total = rooms.length;
  const occupied = c('Occupied');
  return { total, available: c('Available'), occupied, reserved: c('Reserved'), cleaning: c('Cleaning'), maintenance: c('Maintenance'), occupancyRate: rate(occupied, total) };
}

const light = (g) => ({
  _id: g._id, guestCode: g.guestCode, name: g.name, mobile: g.mobile, roomNumber: (g.roomNumbers && g.roomNumbers.length ? g.roomNumbers : [g.roomNumber]).join(', '),
  floor: g.floor, roomType: g.roomType, checkInDate: g.checkInDate, checkOutDate: g.checkOutDate, actualCheckOut: g.actualCheckOut, status: g.status, numberOfGuests: g.numberOfGuests,
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const T = today();
  let { from, to, floor, category, roomType } = req.query;
  from = isValid(from) ? from : addDays(T, -13);
  to = isValid(to) ? to : T;
  if (from > to) throw new AppError('The start date must be on or before the end date.', 400);
  if (diffDays(from, to) > 120) throw new AppError('Please choose a date range of 120 days or less.', 400);

  const rq = {};
  if (floor !== undefined && floor !== '') rq.floor = Number(floor);
  if (category) rq.category = category;
  if (roomType) rq.roomType = roomType;
  const rooms = await Room.find(rq).lean();
  const numbers = rooms.map((r) => r.roomNumber);
  const bookings = await Booking.find({ room: { $in: rooms.map((r) => r._id) }, bookingStatus: { $ne: 'Cancelled' } })
    .select('room roomNumber checkInDate checkOutDate bookingStatus').lean();
  const guests = await Guest.find({ status: { $ne: 'Cancelled' }, roomNumbers: { $in: numbers } }).lean();

  const summary = summarize(rooms);
  const byCategory = CATEGORIES.map((c) => {
    const r = rooms.filter((x) => x.category === c);
    return { category: c, ...summarize(r) };
  });
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const byFloor = floors.map((f) => {
    const fr = rooms.filter((r) => r.floor === f);
    const availableByCategory = {};
    CATEGORIES.forEach((c) => { availableByCategory[c] = fr.filter((r) => r.category === c && r.status === 'Available').length; });
    return { floor: f, name: FLOOR_NAMES[f] || `Floor ${f}`, ...summarize(fr), availableByCategory };
  });
  const dates = range(from, to);
  const trend = dates.map((d) => {
    const occ = occupiedBookings(bookings, d, T).length;
    return { date: d, label: short(d), occupied: occ, rate: rate(occ, rooms.length) };
  });
  const flow = dates.map((d) => ({
    date: d, label: short(d),
    checkIns: guests.filter((g) => g.checkInDate === d).length,
    checkOuts: guests.filter((g) => g.checkOutDate === d && ['Checked-In', 'Checked-Out'].includes(g.status)).length,
  }));
  const roomTypes = Object.keys(ROOM_TYPES).map((t) => {
    const r = rooms.filter((x) => x.roomType === t);
    return { roomType: t, total: r.length, occupied: r.filter((x) => x.status === 'Occupied').length, available: r.filter((x) => x.status === 'Available').length };
  }).filter((x) => x.total > 0);

  const inRange = (d) => d && d >= from && d <= to;
  const movement = {
    staying: guests.filter((g) => g.status === 'Checked-In').map(light),
    checkedOut: guests.filter((g) => g.status === 'Checked-Out' && inRange(g.actualCheckOut || g.checkOutDate)).map(light),
    expectedCheckOut: guests.filter((g) => g.status === 'Checked-In' && inRange(g.checkOutDate)).map(light),
    expectedCheckIn: guests.filter((g) => g.status === 'Reserved' && inRange(g.checkInDate)).map(light),
  };
  Object.keys(movement).forEach((k) => { movement[k] = movement[k].slice(0, 250); });
  res.json({ range: { from, to }, summary, byCategory, byFloor, trend, flow, roomTypes, movement });
});

exports.getReports = asyncHandler(async (req, res) => {
  const T = today();
  const [rooms, bookings, guests] = await Promise.all([
    Room.find().lean(),
    Booking.find({ bookingStatus: { $ne: 'Cancelled' } }).lean(),
    Guest.find({ status: { $ne: 'Cancelled' } }).lean(),
  ]);
  const total = rooms.length;
  const price = new Map(rooms.map((r) => [String(r._id), r.price]));
  const cache = new Map();
  const day = (d) => {
    if (!cache.has(d)) {
      const occ = occupiedBookings(bookings, d, T);
      cache.set(d, {
        date: d, label: short(d), occupied: occ.length, rate: rate(occ.length, total),
        revenue: occ.reduce((s, b) => s + (price.get(String(b.room)) || 0), 0),
        checkIns: guests.filter((g) => g.checkInDate === d).length,
        checkOuts: guests.filter((g) => g.checkOutDate === d && ['Checked-In', 'Checked-Out'].includes(g.status)).length,
        _occ: occ,
      });
    }
    return cache.get(d);
  };
  const strip = ({ _occ, ...x }) => x; // eslint-disable-line no-unused-vars
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
  const aggregate = (label, dates) => {
    const rows = dates.map(day);
    return { label, days: rows.length, avgOccupancy: Math.round((sum(rows, 'rate') / (rows.length || 1)) * 10) / 10, checkIns: sum(rows, 'checkIns'), checkOuts: sum(rows, 'checkOuts'), revenue: sum(rows, 'revenue') };
  };

  const daily = range(addDays(T, -13), T).map((d) => strip(day(d)));
  const weekly = [3, 2, 1, 0].map((k) => {
    const end = addDays(T, -7 * k);
    const start = addDays(end, -6);
    return aggregate(`${short(start)} - ${short(end)}`, range(start, end));
  });
  const now = parse(T);
  const monthly = [1, 0].map((i) => {
    const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const end = fmt(last) > T ? T : fmt(last);
    return aggregate(`${MONTHS[first.getMonth()]} ${first.getFullYear()}${i === 0 ? ' (to date)' : ''}`, range(fmt(first), end));
  });

  // Utilisation over the last 30 days
  const nights = new Map();
  const typeRevenue = {};
  const typeOf = new Map(rooms.map((r) => [String(r._id), r.roomType]));
  range(addDays(T, -29), T).forEach((d) => {
    day(d)._occ.forEach((b) => {
      const id = String(b.room);
      nights.set(id, (nights.get(id) || 0) + 1);
      const t = typeOf.get(id);
      if (t) typeRevenue[t] = (typeRevenue[t] || 0) + (price.get(id) || 0);
    });
  });
  const utilization = rooms.map((r) => ({ roomNumber: r.roomNumber, roomType: r.roomType, floor: r.floor, nights: nights.get(String(r._id)) || 0, utilization: rate(nights.get(String(r._id)) || 0, 30) }))
    .sort((a, b) => b.utilization - a.utilization);
  const windowStart = addDays(T, -29);
  const roomTypePerformance = Object.keys(ROOM_TYPES).map((t) => {
    const r = rooms.filter((x) => x.roomType === t);
    const n = utilization.filter((u) => u.roomType === t).reduce((s, u) => s + u.nights, 0);
    return {
      roomType: t, rooms: r.length, nights: n, utilization: rate(n, r.length * 30), revenue: typeRevenue[t] || 0,
      bookings: bookings.filter((b) => b.roomType === t && b.checkInDate >= windowStart && b.checkInDate <= T).length,
    };
  }).filter((x) => x.rooms > 0);

  const done = bookings.filter((b) => b.bookingStatus === 'Checked-Out');
  const avgStay = done.length ? Math.round((done.reduce((s, b) => s + Math.max(1, diffDays(b.checkInDate, b.checkOutDate)), 0) / done.length) * 10) / 10 : 0;
  const last = (n, k) => sum(range(addDays(T, -(n - 1)), T).map(day), k);
  const stats = {
    checkIns: { today: day(T).checkIns, last7: last(7, 'checkIns'), last30: last(30, 'checkIns') },
    checkOuts: { today: day(T).checkOuts, last7: last(7, 'checkOuts'), last30: last(30, 'checkOuts') },
    avgStay,
  };
  res.json({ generatedAt: new Date().toISOString(), totalRooms: total, daily, weekly, monthly, utilization, roomTypePerformance, stats });
});
