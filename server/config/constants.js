const ROOM_TYPES = {
  'AC Single': { category: 'AC', capacity: 1, price: 2200 },
  'AC Double': { category: 'AC', capacity: 2, price: 3200 },
  'AC Deluxe': { category: 'AC', capacity: 3, price: 4800 },
  'Non-AC Single': { category: 'Non-AC', capacity: 1, price: 1200 },
  'Non-AC Double': { category: 'Non-AC', capacity: 2, price: 1800 },
  'Male Dormitory': { category: 'Dormitory', capacity: 8, price: 2400 },
  'Female Dormitory': { category: 'Dormitory', capacity: 8, price: 2400 },
};
module.exports = {
  ROOM_TYPES,
  CATEGORIES: ['AC', 'Non-AC', 'Dormitory'],
  ROOM_STATUSES: ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'],
  FLOOR_NAMES: ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'],
  ID_TYPES: ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID', 'Other'],
  GUEST_STATUSES: ['Reserved', 'Checked-In', 'Checked-Out', 'Cancelled'],
  BOOKING_STATUSES: ['Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'],
  PAYMENT_STATUSES: ['Pending', 'Partial', 'Paid', 'Refunded'],
};
