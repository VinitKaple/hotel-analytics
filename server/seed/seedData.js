const mongoose = require('mongoose');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const Booking = require('../models/Booking');
const Settings = require('../models/Settings');
const { ROOM_TYPES, ID_TYPES } = require('../config/constants');
const { today, addDays, diffDays, parse } = require('../utils/dates');

// Small deterministic random generator -> the same demo data every time.
let s = 20261008;
const R = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (a) => a[Math.floor(R() * a.length)];
const shuffle = (a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const letters = (n) => Array.from({ length: n }, () => String.fromCharCode(65 + ri(0, 25))).join('');

const MALE = ['Rahul', 'Amit', 'Vikram', 'Rohan', 'Arjun', 'Karan', 'Sanjay', 'Manish', 'Nikhil', 'Siddharth', 'Pranav', 'Aditya', 'Harsh', 'Deepak', 'Suresh', 'Rajesh', 'Anil', 'Vivek', 'Tarun', 'Yash', 'Kunal', 'Mohit', 'Ashish', 'Gaurav', 'Imran', 'Faisal', 'Jaspreet', 'Harpreet', 'Naveen', 'Venkat', 'Karthik', 'Sandeep', 'Abhishek', 'Prakash', 'Omkar', 'Tushar', 'Dinesh', 'Ramesh', 'Sameer', 'Vinay'];
const FEMALE = ['Priya', 'Anjali', 'Neha', 'Sneha', 'Pooja', 'Kavya', 'Ananya', 'Divya', 'Meera', 'Isha', 'Riya', 'Shruti', 'Aarti', 'Nisha', 'Swati', 'Pallavi', 'Radhika', 'Tanvi', 'Simran', 'Harleen', 'Fatima', 'Zoya', 'Lakshmi', 'Deepa', 'Sunita', 'Rekha', 'Mansi', 'Kritika', 'Shreya', 'Nandini', 'Aditi', 'Bhavna', 'Jyoti', 'Komal', 'Payal', 'Rupali', 'Sakshi', 'Trisha', 'Vaishali', 'Ritu'];
const SURNAMES = ['Sharma', 'Verma', 'Patil', 'Deshmukh', 'Kulkarni', 'Joshi', 'Gupta', 'Singh', 'Kapoor', 'Mehta', 'Shah', 'Patel', 'Desai', 'Iyer', 'Nair', 'Menon', 'Reddy', 'Rao', 'Naidu', 'Banerjee', 'Chatterjee', 'Das', 'Ghosh', 'Mukherjee', 'Bose', 'Khan', 'Ansari', 'Qureshi', 'Sheikh', 'Malhotra', 'Chopra', 'Bhatia', 'Agarwal', 'Jain', 'Mishra', 'Tiwari', 'Pandey', 'Yadav', 'Chauhan', 'Thakur', 'Kaur', 'Gill', 'Sandhu', 'Pillai', 'Hegde', 'Shetty', 'Bhosale', 'Jadhav', 'Pawar', 'More'];
const CITIES = ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Delhi', 'Jaipur', 'Ahmedabad', 'Surat', 'Indore', 'Bhopal', 'Lucknow', 'Kanpur', 'Patna', 'Kolkata', 'Bhubaneswar', 'Hyderabad', 'Bengaluru', 'Chennai', 'Coimbatore', 'Kochi', 'Thiruvananthapuram', 'Panaji', 'Chandigarh', 'Amritsar', 'Dehradun', 'Ranchi', 'Guwahati', 'Vadodara', 'Aurangabad', 'Kolhapur'];
const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.in', 'hotmail.com', 'rediffmail.com'];
const SPECIAL = ['Late check-in expected', 'High floor preferred', 'Extra pillows please', 'Vegetarian breakfast', 'Airport pickup needed', 'Quiet room, away from lift', 'Early check-in if possible', 'Celebrating an anniversary'];

const LAYOUT = [
  { floor: 0, start: 101, types: [['Non-AC Single', 4], ['Non-AC Double', 3], ['AC Single', 1], ['Male Dormitory', 1], ['Female Dormitory', 1]] },
  { floor: 1, start: 201, types: [['AC Single', 5], ['AC Double', 5], ['Non-AC Single', 2], ['Non-AC Double', 2], ['Male Dormitory', 1]] },
  { floor: 2, start: 301, types: [['AC Single', 3], ['AC Double', 5], ['AC Deluxe', 2], ['Non-AC Double', 3], ['Female Dormitory', 1], ['Non-AC Single', 1]] },
  { floor: 3, start: 401, types: [['AC Double', 5], ['AC Deluxe', 5], ['Non-AC Single', 3], ['Non-AC Double', 2]] },
  { floor: 4, start: 501, types: [['AC Deluxe', 6], ['AC Double', 5], ['AC Single', 2], ['Non-AC Double', 2]] },
];

const idFor = (t) => {
  switch (t) {
    case 'Aadhaar': return `${ri(2000, 9999)} ${ri(1000, 9999)} ${ri(1000, 9999)}`;
    case 'PAN': return `${letters(5)}${ri(1000, 9999)}${letters(1)}`;
    case 'Passport': return `${letters(1)}${ri(1000000, 9999999)}`;
    case 'Driving Licence': return `MH${ri(10, 49)}${ri(2010, 2024)}${ri(1000000, 9999999)}`;
    case 'Voter ID': return `${letters(3)}${ri(1000000, 9999999)}`;
    default: return `DOC-${ri(100000, 999999)}`;
  }
};

const HISTORY_DAYS = 45;

async function seedDatabase() {
  await Promise.all([Room.deleteMany({}), Guest.deleteMany({}), Booking.deleteMany({})]);
  await Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, setDefaultsOnInsert: true });
  const T = today();

  // ---- Rooms ----
  const roomDefs = [];
  LAYOUT.forEach(({ floor, start, types }) => {
    let n = start;
    types.forEach(([roomType, count]) => {
      for (let i = 0; i < count; i++) {
        const d = ROOM_TYPES[roomType];
        roomDefs.push({ roomNumber: String(n++), floor, roomType, category: d.category, capacity: d.capacity, price: d.price, status: 'Available' });
      }
    });
  });
  const rooms = await Room.insertMany(roomDefs);

  // ---- Decide today's state of every room ----
  const state = new Map();
  const dorms = rooms.filter((r) => r.category === 'Dormitory');
  ['Occupied', 'Available', 'Available', 'Reserved'].forEach((st, i) => dorms[i] && state.set(dorms[i].roomNumber, st));
  const plan = [...Array(37).fill('Occupied'), ...Array(4).fill('Reserved'), ...Array(3).fill('Cleaning'), ...Array(2).fill('Maintenance')];
  shuffle(rooms.filter((r) => r.category !== 'Dormitory')).forEach((r, i) => state.set(r.roomNumber, plan[i] || 'Available'));

  // ---- Guests & bookings ----
  const guests = [];
  const bookings = [];
  let seq = 0;
  const stay = (room, inD, outD, gStatus, bStatus, extra = {}) => {
    seq += 1;
    const gender = room.roomType === 'Male Dormitory' ? 'm' : room.roomType === 'Female Dormitory' ? 'f' : R() < 0.55 ? 'm' : 'f';
    const first = pick(gender === 'm' ? MALE : FEMALE);
    const last = pick(SURNAMES);
    const idType = pick(ID_TYPES);
    const _id = new mongoose.Types.ObjectId();
    const nights = Math.max(1, diffDays(inD, outD));
    const ng = room.category === 'Dormitory' ? ri(1, 6) : ri(1, room.capacity);
    let created = parse(inD);
    created.setDate(created.getDate() - ri(0, 6));
    created.setHours(ri(8, 21), ri(0, 59));
    if (created > new Date()) created = new Date(Date.now() - ri(5, 600) * 60000);
    guests.push({
      _id, seq, guestCode: `GST-${1000 + seq}`, name: `${first} ${last}`, mobile: `${pick([6, 7, 8, 9])}${ri(100000000, 999999999)}`,
      email: `${first}.${last}${ri(1, 99)}@${pick(DOMAINS)}`.toLowerCase(), location: pick(CITIES), identityProofType: idType, identityProofNumber: idFor(idType),
      roomNumber: room.roomNumber, roomNumbers: [room.roomNumber], floor: room.floor, roomType: room.roomType, category: room.category,
      checkInDate: inD, checkOutDate: outD, actualCheckOut: extra.actual || null, numberOfGuests: ng, status: gStatus, createdAt: created,
    });
    bookings.push({
      seq, bookingId: `BK-${10000 + seq}`, guest: _id, room: room._id, roomNumber: room.roomNumber, roomType: room.roomType, category: room.category, floor: room.floor,
      checkInDate: inD, checkOutDate: outD, numberOfGuests: ng, bookingStatus: bStatus,
      paymentStatus: bStatus === 'Checked-Out' ? 'Paid' : pick(['Paid', 'Paid', 'Partial', 'Pending']),
      amount: room.price * nights, specialRequests: R() < 0.2 ? pick(SPECIAL) : '', createdAt: created,
    });
    return _id;
  };
  const history = (room, endLimit) => {
    let d = addDays(T, -HISTORY_DAYS + ri(0, 3));
    for (;;) {
      const out = addDays(d, ri(1, 4));
      if (out > endLimit) break;
      stay(room, d, out, 'Checked-Out', 'Checked-Out', { actual: out });
      d = addDays(out, ri(0, 3));
    }
  };

  const updates = [];
  let occIdx = 0;
  const futureCandidates = [];
  rooms.forEach((room) => {
    const st = state.get(room.roomNumber) || 'Available';
    if (st === 'Occupied') {
      const inD = occIdx < 2 ? T : addDays(T, -ri(1, 4));
      const outD = occIdx >= 2 && occIdx < 7 ? T : addDays(T, ri(1, 4));
      history(room, inD);
      const gid = stay(room, inD, outD, 'Checked-In', 'Checked-In');
      updates.push({ id: room._id, status: 'Occupied', guest: gid });
      occIdx += 1;
    } else if (st === 'Reserved') {
      history(room, addDays(T, -1));
      const gid = stay(room, T, addDays(T, ri(1, 4)), 'Reserved', 'Confirmed');
      updates.push({ id: room._id, status: 'Reserved', guest: gid });
    } else if (st === 'Cleaning') {
      const inD = addDays(T, -ri(1, 3));
      history(room, inD);
      stay(room, inD, T, 'Checked-Out', 'Checked-Out', { actual: T });
      updates.push({ id: room._id, status: 'Cleaning', guest: null });
    } else {
      history(room, addDays(T, -1));
      if (st === 'Maintenance') updates.push({ id: room._id, status: 'Maintenance', guest: null });
      else if (room.category !== 'Dormitory') futureCandidates.push(room);
    }
  });
  // A few advance bookings for rooms that are free today
  futureCandidates.slice(0, 6).forEach((room) => {
    const inD = addDays(T, ri(1, 5));
    stay(room, inD, addDays(inD, ri(1, 3)), 'Reserved', 'Confirmed');
  });

  await Guest.insertMany(guests);
  await Booking.insertMany(bookings);
  await Room.bulkWrite(updates.map((u) => ({ updateOne: { filter: { _id: u.id }, update: { status: u.status, currentGuest: u.guest } } })));
  return { rooms: rooms.length, guests: guests.length, bookings: bookings.length };
}

module.exports = { seedDatabase };
