import { CATEGORIES, FLOOR_NAMES } from './constants';
import { today } from './utils';

export function roomStats(rooms) {
  const c = (s) => rooms.filter((r) => r.status === s).length;
  const total = rooms.length;
  const occupied = c('Occupied');
  return { total, available: c('Available'), occupied, reserved: c('Reserved'), cleaning: c('Cleaning'), maintenance: c('Maintenance'), occupancyRate: total ? Math.round((occupied / total) * 1000) / 10 : 0 };
}

export function categoryBreakdown(rooms) {
  return CATEGORIES.map((category) => ({ category, ...roomStats(rooms.filter((r) => r.category === category)) }));
}

export function floorBreakdown(rooms) {
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  return floors.map((floor) => {
    const fr = rooms.filter((r) => r.floor === floor);
    const availableByCategory = {};
    CATEGORIES.forEach((c) => { availableByCategory[c] = fr.filter((r) => r.category === c && r.status === 'Available').length; });
    return { floor, name: FLOOR_NAMES[floor] ?? `Floor ${floor}`, ...roomStats(fr), availableByCategory };
  });
}

export function guestMetrics(guests) {
  const T = today();
  const active = guests.filter((g) => g.status !== 'Cancelled');
  const staying = guests.filter((g) => g.status === 'Checked-In');
  return {
    T,
    staying,
    people: staying.reduce((s, g) => s + (g.numberOfGuests || 1), 0),
    checkInsToday: active.filter((g) => g.checkInDate === T),
    arrivalsPending: guests.filter((g) => g.status === 'Reserved' && g.checkInDate === T),
    departuresPending: staying.filter((g) => g.checkOutDate <= T),
    departuresDone: guests.filter((g) => g.status === 'Checked-Out' && g.actualCheckOut === T),
    checkedOut: guests.filter((g) => g.status === 'Checked-Out'),
    upcoming: guests.filter((g) => g.status === 'Reserved' && g.checkInDate > T),
  };
}
