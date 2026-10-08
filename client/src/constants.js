export const ROOM_TYPES = {
  'AC Single': { category: 'AC', capacity: 1, price: 2200 },
  'AC Double': { category: 'AC', capacity: 2, price: 3200 },
  'AC Deluxe': { category: 'AC', capacity: 3, price: 4800 },
  'Non-AC Single': { category: 'Non-AC', capacity: 1, price: 1200 },
  'Non-AC Double': { category: 'Non-AC', capacity: 2, price: 1800 },
  'Male Dormitory': { category: 'Dormitory', capacity: 8, price: 2400 },
  'Female Dormitory': { category: 'Dormitory', capacity: 8, price: 2400 },
};
export const CATEGORIES = ['AC', 'Non-AC', 'Dormitory'];
export const ROOM_STATUSES = ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];
export const FLOOR_NAMES = ['Ground Floor', 'First Floor', 'Second Floor', 'Third Floor', 'Fourth Floor'];
export const ID_TYPES = ['Aadhaar', 'PAN', 'Passport', 'Driving Licence', 'Voter ID', 'Other'];
export const CATEGORY_COLORS = { AC: '#0f766e', 'Non-AC': '#c8a35a', Dormitory: '#6d5bd0' };
export const TYPE_COLORS = ['#0f766e', '#14b8a6', '#0b4f6c', '#c8a35a', '#e0c386', '#6d5bd0', '#a78bfa'];
export const STATUS_TONE = {
  Available: 'green', Occupied: 'blue', Reserved: 'amber', Cleaning: 'violet', Maintenance: 'red',
  'Checked-In': 'blue', 'Checked-Out': 'gray', Cancelled: 'red', Confirmed: 'amber',
  Paid: 'green', Pending: 'amber', Partial: 'violet', Refunded: 'gray',
};
export const floorName = (f) => FLOOR_NAMES[f] ?? `Floor ${f}`;
