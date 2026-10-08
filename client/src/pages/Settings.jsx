import { useEffect, useState } from 'react';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { ROOM_TYPES } from '../constants';
import { Field, Skeleton, Spinner } from '../components/ui';

const Toggle = ({ checked, onChange, label, hint }) => (
  <div className="toggle-row"><div><b>{label}</b>{hint && <small>{hint}</small>}</div>
    <button type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i /></button></div>
);

export default function Settings() {
  const { settings, rooms, loading, refresh, toast } = useHotel();
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState('');
  const [types, setTypes] = useState({});
  useEffect(() => { if (settings) setS(JSON.parse(JSON.stringify(settings))); }, [settings]);
  useEffect(() => {
    const t = {};
    Object.keys(ROOM_TYPES).forEach((k) => { const r = rooms.find((x) => x.roomType === k); if (r) t[k] = { price: r.price, capacity: r.capacity, count: rooms.filter((x) => x.roomType === k).length }; });
    setTypes(t);
  }, [rooms]);
  if (loading || !s) return <div className="stack"><Skeleton h={260} r={16} /><Skeleton h={260} r={16} /></div>;

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const setN = (k, v) => setS((p) => ({ ...p, notifications: { ...p.notifications, [k]: v } }));
  const save = async (section, body) => {
    setSaving(section);
    try { const res = await api.put('/settings', body); toast.success(res.message); await refresh(); } catch (e) { toast.error(e.message); } finally { setSaving(''); }
  };
  const saveType = async (roomType) => {
    setSaving(roomType);
    try { const res = await api.put('/settings/room-types', { roomType, ...types[roomType] }); toast.success(res.message); await refresh(); } catch (e) { toast.error(e.message); } finally { setSaving(''); }
  };
  const SaveBtn = ({ id, onClick }) => <button className="btn primary" onClick={onClick} disabled={saving === id}>{saving === id && <Spinner size={15} />}Save changes</button>;

  return (
    <div className="stack narrow">
      <section className="card"><div className="card-head"><h3>Hotel settings</h3></div>
        <div className="form-grid">
          <Field label="Hotel name"><input value={s.hotelName} onChange={(e) => set('hotelName', e.target.value)} /></Field>
          <Field label="Contact number"><input value={s.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Address" className="span2"><input value={s.address} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Email"><input type="email" value={s.email} onChange={(e) => set('email', e.target.value)} /></Field>
        </div>
        <div className="card-foot"><SaveBtn id="hotel" onClick={() => save('hotel', { hotelName: s.hotelName, phone: s.phone, address: s.address, email: s.email })} /></div></section>

      <section className="card"><div className="card-head"><h3>Booking settings</h3></div>
        <div className="form-grid">
          <Field label="Check-in time"><input type="time" value={s.checkInTime} onChange={(e) => set('checkInTime', e.target.value)} /></Field>
          <Field label="Check-out time"><input type="time" value={s.checkOutTime} onChange={(e) => set('checkOutTime', e.target.value)} /></Field>
          <Field label="Maximum booking duration (nights)"><input type="number" min="1" max="365" value={s.maxBookingDuration} onChange={(e) => set('maxBookingDuration', e.target.value)} /></Field>
        </div>
        <Toggle checked={s.cleaningAfterCheckout} onChange={(v) => set('cleaningAfterCheckout', v)} label="Send rooms to cleaning after check-out" hint="Otherwise rooms become available straight away. You can still choose at check-out." />
        <div className="card-foot"><SaveBtn id="booking" onClick={() => save('booking', { checkInTime: s.checkInTime, checkOutTime: s.checkOutTime, maxBookingDuration: Number(s.maxBookingDuration), cleaningAfterCheckout: s.cleaningAfterCheckout })} /></div></section>

      <section className="card"><div className="card-head"><h3>Room settings</h3><span className="muted">Changes apply to every room of that type</span></div>
        <div className="table-wrap flush"><table><thead><tr><th>Room type</th><th>Category</th><th>Rooms</th><th>Price / night (₹)</th><th>Capacity</th><th /></tr></thead>
          <tbody>{Object.entries(types).map(([k, v]) => (
            <tr key={k}><td><b>{k}</b></td><td>{ROOM_TYPES[k].category}</td><td>{v.count}</td>
              <td><input className="cell-input" type="number" min="0" value={v.price} onChange={(e) => setTypes((p) => ({ ...p, [k]: { ...p[k], price: e.target.value } }))} /></td>
              <td><input className="cell-input sm" type="number" min="1" value={v.capacity} onChange={(e) => setTypes((p) => ({ ...p, [k]: { ...p[k], capacity: e.target.value } }))} /></td>
              <td className="actions"><button className="btn ghost sm" onClick={() => saveType(k)} disabled={saving === k}>{saving === k && <Spinner size={13} />}Update</button></td></tr>))}</tbody></table></div></section>

      <section className="card" id="preferences"><div className="card-head"><h3>Notification settings</h3></div>
        <Toggle checked={s.notifications.booking} onChange={(v) => setN('booking', v)} label="Booking notifications" hint="Send a thank-you email whenever a booking is created." />
        <Toggle checked={s.notifications.checkIn} onChange={(v) => setN('checkIn', v)} label="Check-in notifications" hint="Show today's arrivals in the notification centre." />
        <Toggle checked={s.notifications.checkOut} onChange={(v) => setN('checkOut', v)} label="Check-out notifications" hint="Show upcoming departures in the notification centre." />
        <div className="card-foot"><SaveBtn id="notif" onClick={() => save('notif', { notifications: s.notifications })} /></div></section>
    </div>
  );
}
