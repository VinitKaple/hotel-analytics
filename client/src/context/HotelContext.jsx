import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { guestMetrics, roomStats } from '../stats';

const Ctx = createContext(null);
export const useHotel = () => useContext(Ctx);

export function HotelProvider({ children }) {
  const [data, setData] = useState({ rooms: [], guests: [], bookings: [], settings: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [events, setEvents] = useState([]);
  const [seen, setSeen] = useState(() => new Set());
  const [checkoutTarget, setCheckoutTarget] = useState(null);
  const idRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [rooms, guests, bookings, settings] = await Promise.all([api.get('/rooms'), api.get('/guests'), api.get('/bookings'), api.get('/settings')]);
      setData({ rooms, guests, bookings, settings });
      setError(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const addToast = useCallback((type, message) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, message }].slice(-4));
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  const toast = useMemo(() => ({
    success: (m) => addToast('success', m),
    error: (m) => addToast('error', m),
    info: (m) => addToast('info', m),
  }), [addToast]);

  const pushEvent = useCallback((e) => setEvents((list) => [{ key: `ev-${++idRef.current}`, time: new Date().toISOString(), ...e }, ...list].slice(0, 15)), []);

  const doCheckIn = useCallback(async (guest) => {
    try {
      const res = await api.post('/checkin', { guestId: guest._id });
      toast.success(res.message);
      pushEvent({ type: 'success', title: 'Guest checked in', text: res.message });
      await refresh();
    } catch (e) { toast.error(e.message); }
  }, [refresh, toast, pushEvent]);

  const confirmCheckout = useCallback(async (guest, roomStatus) => {
    try {
      const res = await api.post('/checkout', { guestId: guest._id, roomStatus });
      toast.success(res.message);
      pushEvent({ type: 'info', title: roomStatus === 'Cleaning' ? 'Room needs cleaning' : 'Room available', text: res.message });
      setCheckoutTarget(null);
      await refresh();
    } catch (e) { toast.error(e.message); setCheckoutTarget(null); }
  }, [refresh, toast, pushEvent]);

  // Notification centre: live signals from the hotel data + actions taken this session.
  const notifications = useMemo(() => {
    const { rooms, guests, bookings, settings } = data;
    const list = [...events];
    if (!rooms.length) return list;
    const s = roomStats(rooms);
    const m = guestMetrics(guests);
    const n = settings?.notifications || {};
    bookings.slice(0, 2).forEach((b) => list.push({ key: `bk-${b._id}`, type: 'success', title: 'New booking', text: `${b.bookingId} · Room ${b.roomNumber} booked for ${b.guest?.name || 'a guest'}.`, time: b.createdAt }));
    if (n.checkOut !== false && m.departuresPending.length) list.push({ key: `out-${m.departuresPending.length}`, type: 'warn', title: 'Upcoming check-outs', text: `${m.departuresPending.length} guest${m.departuresPending.length > 1 ? 's are' : ' is'} due to check out today.` });
    if (n.checkIn !== false && m.arrivalsPending.length) list.push({ key: `in-${m.arrivalsPending.length}`, type: 'info', title: "Today's check-ins", text: `${m.arrivalsPending.length} arrival${m.arrivalsPending.length > 1 ? 's' : ''} expected today.` });
    if (s.total && s.available / s.total < 0.15) list.push({ key: `low-${s.available}`, type: 'danger', title: 'Low room availability', text: `Only ${s.available} of ${s.total} rooms are available.` });
    if (s.cleaning) list.push({ key: `clean-${s.cleaning}`, type: 'info', title: 'Rooms becoming available', text: `${s.cleaning} room${s.cleaning > 1 ? 's are' : ' is'} being cleaned and will be ready soon.` });
    return list;
  }, [data, events]);
  const unread = notifications.filter((n) => !seen.has(n.key)).length;
  const markAllRead = useCallback(() => setSeen(new Set(notifications.map((n) => n.key))), [notifications]);

  const value = {
    ...data, loading, error, version, refresh,
    toast, toasts, dismiss, pushEvent,
    notifications, unread, markAllRead,
    checkoutTarget, openCheckout: setCheckoutTarget, closeCheckout: () => setCheckoutTarget(null),
    doCheckIn, confirmCheckout,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
