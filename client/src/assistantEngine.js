import { CATEGORIES, FLOOR_NAMES } from './constants';
import { fmtDate, today } from './utils';
import { guestMetrics, roomStats } from './stats';

export const SUGGESTIONS = [
  'Which room is empty?',
  'How many guests are currently staying?',
  'Which rooms are occupied right now?',
  'Who is checking out today?',
  'How many AC rooms are available?',
  "What is today's occupancy rate?",
];

const has = (q, ...words) => words.some((w) => q.includes(w));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const nums = (rs) => rs.map((r) => r.roomNumber);

function detectCategory(q) {
  if (/non[\s-]?ac|non air/.test(q)) return 'Non-AC';
  if (/dorm/.test(q)) return 'Dormitory';
  if (/\bac\b|a\/c|air[\s-]?con/.test(q)) return 'AC';
  return null;
}
function detectFloor(q) {
  const names = { ground: 0, first: 1, '1st': 1, second: 2, '2nd': 2, third: 3, '3rd': 3, fourth: 4, '4th': 4 };
  let m = q.match(/\b(ground|first|1st|second|2nd|third|3rd|fourth|4th)\s+floor\b/);
  if (m) return names[m[1]];
  m = q.match(/\bfloor\s*(\d)\b/) || q.match(/\b(\d)(?:st|nd|rd|th)?\s+floor\b/);
  return m ? Number(m[1]) : null;
}
const groupByCategory = (rs, labelFn) =>
  CATEGORIES.map((c) => ({ c, list: rs.filter((r) => r.category === c) })).filter((x) => x.list.length).map((x) => labelFn(x.c, x.list));
const guestLine = (g) => `${g.name} · Room ${(g.roomNumbers?.length ? g.roomNumbers : [g.roomNumber]).join(', ')} · ${g.roomType}`;

export function answer(question, { rooms, guests }) {
  const q = question.toLowerCase().replace(/[?!.,]/g, ' ').replace(/\s+/g, ' ').trim();
  const s = roomStats(rooms);
  const m = guestMetrics(guests);
  const cat = detectCategory(q);
  const floor = detectFloor(q);
  const scope = rooms.filter((r) => (!cat || r.category === cat) && (floor === null || r.floor === floor));
  const scopeLabel = `${cat ? `${cat} ` : ''}rooms${floor !== null ? ` on the ${FLOOR_NAMES[floor]?.toLowerCase()}` : ''}`;

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q) || q === 'help' || has(q, 'what can you do')) {
    return {
      text: 'Hello! I can look up room availability, current guests, check-ins and check-outs, and occupancy for you. What would you like to know?',
      follow: SUGGESTIONS.slice(0, 4),
    };
  }

  const roomNo = q.match(/\b([1-5]\d{2})\b/);
  if (roomNo && (has(q, 'room') || q.length < 12 || has(q, 'who', 'status', 'guest'))) {
    const r = rooms.find((x) => x.roomNumber === roomNo[1]);
    if (!r) return { text: `I couldn't find Room ${roomNo[1]} in the hotel records.` };
    const lines = [`${r.roomType} · ${FLOOR_NAMES[r.floor]} · up to ${r.capacity} guest${r.capacity > 1 ? 's' : ''}`, `₹${r.price.toLocaleString('en-IN')} per night`];
    if (r.currentGuest) lines.push(`${r.status === 'Reserved' ? 'Arriving' : 'Staying'}: ${r.currentGuest.name} (${fmtDate(r.currentGuest.checkInDate)} → ${fmtDate(r.currentGuest.checkOutDate)})`);
    return { text: `Room ${r.roomNumber} is currently ${r.status.toLowerCase()}.`, sections: [{ label: 'Details', lines }] };
  }

  if (has(q, 'checked out', 'already left', 'have left', 'has left')) {
    return m.departuresDone.length
      ? { text: `${plural(m.departuresDone.length, 'guest')} ${m.departuresDone.length === 1 ? 'has' : 'have'} already checked out today.`, sections: [{ label: 'Checked out', lines: m.departuresDone.map(guestLine) }] }
      : { text: 'No guests have checked out yet today.' };
  }

  if (has(q, 'check out', 'checkout', 'checking out', 'check-out', 'leaving', 'depart')) {
    const sections = [];
    if (m.departuresPending.length) sections.push({ label: 'Still to check out', lines: m.departuresPending.map(guestLine) });
    if (m.departuresDone.length) sections.push({ label: 'Already checked out', lines: m.departuresDone.map(guestLine) });
    return m.departuresPending.length
      ? { text: `${plural(m.departuresPending.length, 'guest')} ${m.departuresPending.length === 1 ? 'is' : 'are'} due to check out today.`, sections }
      : { text: 'No more check-outs are pending for today.', sections };
  }

  if (has(q, 'check in', 'checkin', 'checking in', 'check-in', 'arriv', 'coming today', 'expected')) {
    const sections = [];
    if (m.arrivalsPending.length) sections.push({ label: 'Yet to arrive', lines: m.arrivalsPending.map(guestLine) });
    const arrived = m.checkInsToday.filter((g) => g.status === 'Checked-In');
    if (arrived.length) sections.push({ label: 'Already checked in', lines: arrived.map(guestLine) });
    return m.checkInsToday.length
      ? { text: `${plural(m.checkInsToday.length, 'check-in')} today — ${m.arrivalsPending.length} still to arrive.`, sections }
      : { text: 'No check-ins are scheduled for today.' };
  }

  if (has(q, 'occupancy', 'percent', '%', 'occupancy rate')) {
    const lines = [`Occupied ${s.occupied}`, `Reserved ${s.reserved}`, `Available ${s.available}`, `Cleaning ${s.cleaning}`, `Maintenance ${s.maintenance}`];
    return { text: `Today's occupancy rate is ${s.occupancyRate}% — ${s.occupied} of ${s.total} rooms are occupied.`, sections: [{ label: 'Room status', lines }] };
  }

  if (has(q, 'how many', 'count', 'number of') && has(q, 'guest', 'people', 'staying', 'resident', 'person', 'persons')) {
    const rms = new Set(m.staying.flatMap((g) => g.roomNumbers || [g.roomNumber])).size;
    return {
      text: `${plural(m.people, 'guest')} ${m.people === 1 ? 'is' : 'are'} currently staying across ${plural(rms, 'room')} (${plural(m.staying.length, 'booking')}).`,
      sections: [{ label: 'Also today', lines: [`${m.arrivalsPending.length} arrival${m.arrivalsPending.length === 1 ? '' : 's'} still to check in`, `${m.departuresPending.length} guest${m.departuresPending.length === 1 ? '' : 's'} due to check out`] }],
    };
  }

  if (has(q, 'how many', 'count', 'number of') && has(q, 'free', 'available', 'empty', 'vacant', 'unoccupied', 'room')) {
    const avail = scope.filter((r) => r.status === 'Available');
    const byFloor = [...new Set(avail.map((r) => r.floor))].sort().map((f) => {
      const list = avail.filter((r) => r.floor === f);
      return `${FLOOR_NAMES[f]} — ${plural(list.length, 'room')} (${nums(list).join(', ')})`;
    });
    return avail.length
      ? { text: `${plural(avail.length, `${cat ? `${cat} ` : ''}room`)} ${avail.length === 1 ? 'is' : 'are'} available right now, out of ${scope.length}.`, sections: [{ label: 'By floor', lines: byFloor }] }
      : { text: `There are no ${scopeLabel} available right now.` };
  }

  if (has(q, 'empty', 'vacant', 'free', 'available', 'unoccupied', 'availability', 'open room')) {
    const avail = scope.filter((r) => r.status === 'Available');
    if (!avail.length) return { text: `There are no ${scopeLabel} available right now.` };
    return {
      text: `I found ${plural(avail.length, 'currently available room')}${cat || floor !== null ? ` (${scopeLabel})` : ''}.`,
      sections: groupByCategory(avail, (c, list) => ({ label: `${c} · ${list.length}`, chips: nums(list) })),
    };
  }

  if (has(q, 'occupied', 'booked', 'taken', 'in use', 'who is in', 'who is staying', 'who are staying', 'list guests')) {
    const occ = scope.filter((r) => r.status === 'Occupied');
    if (!occ.length) return { text: `No ${scopeLabel} are occupied right now.` };
    return {
      text: `${plural(occ.length, 'room')} ${occ.length === 1 ? 'is' : 'are'} occupied right now.`,
      sections: [{ label: 'Occupied rooms', lines: occ.map((r) => `Room ${r.roomNumber} · ${r.roomType} · ${r.currentGuest ? `${r.currentGuest.name} (until ${fmtDate(r.currentGuest.checkOutDate)})` : 'Guest details unavailable'}`) }],
    };
  }

  if (has(q, 'reserved', 'reservation')) {
    const rs = scope.filter((r) => r.status === 'Reserved');
    return rs.length
      ? { text: `${plural(rs.length, 'room')} ${rs.length === 1 ? 'is' : 'are'} reserved for arrivals today.`, sections: [{ label: 'Reserved', lines: rs.map((r) => `Room ${r.roomNumber} · ${r.currentGuest?.name || 'Guest'} · arriving ${fmtDate(r.currentGuest?.checkInDate || today())}`) }] }
      : { text: 'There are no reserved rooms right now.' };
  }
  if (has(q, 'clean')) {
    const rs = rooms.filter((r) => r.status === 'Cleaning');
    return rs.length ? { text: `${plural(rs.length, 'room')} ${rs.length === 1 ? 'is' : 'are'} being cleaned.`, sections: [{ label: 'Cleaning', chips: nums(rs) }] } : { text: 'No rooms are waiting to be cleaned.' };
  }
  if (has(q, 'maintenance', 'repair', 'out of order')) {
    const rs = rooms.filter((r) => r.status === 'Maintenance');
    return rs.length ? { text: `${plural(rs.length, 'room')} ${rs.length === 1 ? 'is' : 'are'} under maintenance.`, sections: [{ label: 'Maintenance', chips: nums(rs) }] } : { text: 'No rooms are under maintenance.' };
  }
  if (has(q, 'floor')) {
    const rs = scope;
    const avail = rs.filter((r) => r.status === 'Available');
    return { text: `${floor !== null ? FLOOR_NAMES[floor] : 'This floor'} has ${plural(avail.length, 'available room')} out of ${rs.length}.`, sections: groupByCategory(avail, (c, list) => ({ label: `${c} · ${list.length}`, chips: nums(list) })) };
  }

  return {
    text: "I'm not sure I understood that. I can help with room availability, current guests, check-ins, check-outs and occupancy — try one of these:",
    follow: SUGGESTIONS,
  };
}
