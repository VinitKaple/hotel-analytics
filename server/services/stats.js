// Bookings that occupy a room on date `d`.
//  past days   -> checked-in / checked-out stays covering the night
//  today       -> guests currently in house
//  future days -> confirmed + in-house bookings (forecast)
function occupiedBookings(bookings, d, T) {
  return bookings.filter((b) => {
    if (b.checkInDate > d) return false;
    const s = b.bookingStatus;
    if (d < T) return (s === 'Checked-In' || s === 'Checked-Out') && b.checkOutDate > d;
    if (d === T) return s === 'Checked-In';
    return (s === 'Confirmed' || s === 'Checked-In') && b.checkOutDate > d;
  });
}
const rate = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
module.exports = { occupiedBookings, rate };
