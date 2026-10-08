import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { CATEGORIES, ID_TYPES, ROOM_TYPES, floorName } from '../constants';
import { addDays, diffDays, fmtDate, money, today } from '../utils';
import { Field, Modal, Skeleton, Spinner, StatusBadge } from '../components/ui';

const blank = () => ({
  guestName: '', mobile: '', email: '', location: '', identityProofType: 'Aadhaar', identityProofNumber: '',
  checkInDate: today(), checkOutDate: addDays(today(), 1), numberOfGuests: 1, category: '', roomType: '', numberOfRooms: 1, specialRequests: '',
});

function validate(f, maxNights) {
  const e = {};
  if (f.guestName.trim().length < 2) e.guestName = 'Enter the guest name.';
  if (!/^[6-9]\d{9}$/.test(f.mobile.trim())) e.mobile = 'Enter a valid 10-digit mobile number.';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (f.location.trim().length < 2) e.location = 'Enter the guest location.';
  const id = f.identityProofNumber.trim();
  if (id.length < 4) e.identityProofNumber = 'Enter the identity proof number.';
  else if (f.identityProofType === 'Aadhaar' && !/^\d{4}\s?\d{4}\s?\d{4}$/.test(id)) e.identityProofNumber = 'Aadhaar must have 12 digits.';
  else if (f.identityProofType === 'PAN' && !/^[A-Za-z]{5}\d{4}[A-Za-z]$/.test(id)) e.identityProofNumber = 'PAN format is ABCDE1234F.';
  if (!f.checkInDate) e.checkInDate = 'Select a check-in date.';
  else if (f.checkInDate < today()) e.checkInDate = 'Check-in cannot be in the past.';
  if (!f.checkOutDate) e.checkOutDate = 'Select a check-out date.';
  else if (f.checkOutDate <= f.checkInDate) e.checkOutDate = 'Check-out must be after check-in.';
  else if (diffDays(f.checkInDate, f.checkOutDate) > maxNights) e.checkOutDate = `Maximum stay is ${maxNights} nights.`;
  const g = Number(f.numberOfGuests), r = Number(f.numberOfRooms);
  if (!Number.isInteger(g) || g < 1 || g > 40) e.numberOfGuests = 'Enter between 1 and 40 guests.';
  if (!Number.isInteger(r) || r < 1 || r > 5) e.numberOfRooms = 'Book 1 to 5 rooms at a time.';
  if (!e.numberOfGuests && !e.numberOfRooms && f.roomType && ROOM_TYPES[f.roomType].category !== 'Dormitory') {
    const cap = ROOM_TYPES[f.roomType].capacity;
    if (Math.ceil(g / r) > cap) e.numberOfGuests = `${f.roomType} fits ${cap} guest${cap > 1 ? 's' : ''} per room. Add rooms or choose a larger type.`;
  }
  return e;
}

export default function BookingForm() {
  const { rooms, settings, loading, refresh, version, toast, pushEvent } = useHotel();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState({});
  const [avail, setAvail] = useState(null);
  const [availErr, setAvailErr] = useState('');
  const [checking, setChecking] = useState(false);
  const [picked, setPicked] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const maxNights = settings?.maxBookingDuration || 30;

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: undefined })); };

  useEffect(() => {
    const n = sp.get('room');
    const r = n && rooms.find((x) => x.roomNumber === n);
    if (r) { setF((p) => ({ ...p, category: r.category, roomType: r.roomType })); setPicked([r.roomNumber]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms.length]);

  useEffect(() => {
    if (!f.checkInDate || !f.checkOutDate || f.checkOutDate <= f.checkInDate || f.checkInDate < today()) {
      setAvail(null); setAvailErr(f.checkInDate && f.checkInDate < today() ? 'Check-in cannot be in the past.' : ''); return undefined;
    }
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const q = new URLSearchParams({ checkIn: f.checkInDate, checkOut: f.checkOutDate, guests: f.numberOfGuests || 1, rooms: f.numberOfRooms || 1 });
        if (f.category) q.set('category', f.category);
        if (f.roomType) q.set('roomType', f.roomType);
        const data = await api.get(`/rooms/available?${q}`);
        setAvail(data); setAvailErr('');
        setPicked((p) => p.filter((n) => data.some((r) => r.roomNumber === n)));
      } catch (e) { setAvail([]); setAvailErr(e.message); } finally { setChecking(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [f.checkInDate, f.checkOutDate, f.category, f.roomType, f.numberOfGuests, f.numberOfRooms, version]);

  const types = Object.keys(ROOM_TYPES).filter((t) => !f.category || ROOM_TYPES[t].category === f.category);
  const nights = f.checkOutDate > f.checkInDate ? diffDays(f.checkInDate, f.checkOutDate) : 0;
  const rn = Number(f.numberOfRooms) || 1;
  const estimate = useMemo(() => {
    if (!avail || !nights) return 0;
    const chosen = picked.length ? avail.filter((r) => picked.includes(r.roomNumber)) : avail.slice(0, rn);
    return chosen.reduce((s, r) => s + r.price, 0) * nights;
  }, [avail, picked, rn, nights]);

  const togglePick = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length >= rn ? [...p.slice(1), n] : [...p, n]));

  const submit = async (ev) => {
    ev.preventDefault();
    const errs = validate(f, maxNights);
    setErrors(errs);
    if (Object.keys(errs).length) { toast.error('Please correct the highlighted fields.'); return; }
    if (picked.length && picked.length !== rn) { toast.error(`Select ${rn} room${rn > 1 ? 's' : ''}, or clear your selection to auto-assign.`); return; }
    setSubmitting(true);
    try {
      const [res] = await Promise.all([
        api.post('/bookings', { ...f, numberOfGuests: Number(f.numberOfGuests), numberOfRooms: rn, roomNumbers: picked }),
        new Promise((r) => setTimeout(r, 900)),
      ]);
      await refresh();
      toast.success('Booking successfully created.');
      pushEvent({ type: 'success', title: 'New booking', text: `${res.bookings.map((b) => b.bookingId).join(', ')} · Room ${res.bookings.map((b) => b.roomNumber).join(', ')} booked for ${res.guest.name}.` });
      setDone(res);
    } catch (e) {
      if (e.fields) setErrors(e.fields);
      toast.error(e.message);
    } finally { setSubmitting(false); }
  };

  const reset = () => { setF(blank()); setPicked([]); setErrors({}); setDone(null); };
  if (loading) return <Skeleton h={500} r={16} />;

  return (
    <form className="booking-layout" onSubmit={submit} noValidate>
      <div className="stack">
        <section className="card">
          <div className="card-head"><h3>Guest details</h3></div>
          <div className="form-grid">
            <Field label="Guest name" error={errors.guestName}><input value={f.guestName} onChange={(e) => set('guestName', e.target.value)} placeholder="e.g. Rahul Sharma" /></Field>
            <Field label="Mobile number" error={errors.mobile}><input value={f.mobile} inputMode="numeric" maxLength={10} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, ''))} placeholder="10-digit number" /></Field>
            <Field label="Email" error={errors.email}><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@example.com" /></Field>
            <Field label="Location" error={errors.location}><input value={f.location} onChange={(e) => set('location', e.target.value)} placeholder="City, State" /></Field>
            <Field label="Identity proof type" error={errors.identityProofType}><select value={f.identityProofType} onChange={(e) => set('identityProofType', e.target.value)}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Identity proof number" error={errors.identityProofNumber}><input value={f.identityProofNumber} onChange={(e) => set('identityProofNumber', e.target.value)} placeholder={f.identityProofType === 'Aadhaar' ? '1234 5678 9012' : f.identityProofType === 'PAN' ? 'ABCDE1234F' : 'Document number'} /></Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>Stay details</h3>{nights > 0 && <span className="muted">{nights} night{nights > 1 ? 's' : ''}</span>}</div>
          <div className="form-grid">
            <Field label="Check-in date" error={errors.checkInDate}><input type="date" min={today()} value={f.checkInDate} onChange={(e) => { set('checkInDate', e.target.value); if (f.checkOutDate <= e.target.value) set('checkOutDate', addDays(e.target.value, 1)); }} /></Field>
            <Field label="Check-out date" error={errors.checkOutDate}><input type="date" min={addDays(f.checkInDate || today(), 1)} value={f.checkOutDate} onChange={(e) => set('checkOutDate', e.target.value)} /></Field>
            <Field label="Number of guests" error={errors.numberOfGuests}><input type="number" min="1" max="40" value={f.numberOfGuests} onChange={(e) => set('numberOfGuests', e.target.value)} /></Field>
            <Field label="Number of rooms" error={errors.numberOfRooms}><input type="number" min="1" max="5" value={f.numberOfRooms} onChange={(e) => set('numberOfRooms', e.target.value)} /></Field>
            <Field label="AC / Non-AC preference"><select value={f.category} onChange={(e) => { set('category', e.target.value); if (f.roomType && e.target.value && ROOM_TYPES[f.roomType].category !== e.target.value) set('roomType', ''); }}><option value="">No preference</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Room type" error={errors.roomType}><select value={f.roomType} onChange={(e) => { set('roomType', e.target.value); if (e.target.value) set('category', ROOM_TYPES[e.target.value].category); }}><option value="">Any type</option>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Special requests" className="span2"><textarea rows={3} maxLength={500} value={f.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} placeholder="Late arrival, extra bed, dietary needs…" /></Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>Available rooms</h3>{checking ? <span className="muted"><Spinner size={14} /> Checking…</span> : avail && <span className="muted">{avail.length} match{avail.length === 1 ? '' : 'es'}</span>}</div>
          {availErr && <p className="inline-alert"><Info size={16} />{availErr}</p>}
          {!availErr && avail && avail.length === 0 && !checking && <p className="inline-alert"><Info size={16} />No rooms are available for these dates and preferences. Try another type or date.</p>}
          {avail && avail.length > 0 && (
            <>
              <p className="muted small">Pick {rn} room{rn > 1 ? 's' : ''} yourself, or leave unselected and we'll assign the best match.</p>
              <div className="pick-grid">
                {avail.map((r) => (
                  <button type="button" key={r._id} className={`pick ${picked.includes(r.roomNumber) ? 'on' : ''}`} onClick={() => togglePick(r.roomNumber)}>
                    <b>{r.roomNumber}</b><span>{r.roomType}</span><small>{floorName(r.floor)} · {money(r.price)}</small>
                  </button>
                ))}
              </div>
              {picked.length > 0 && <button type="button" className="link" onClick={() => setPicked([])}>Clear selection</button>}
            </>
          )}
        </section>
      </div>

      <aside className="summary card">
        <h3>Booking summary</h3>
        <div className="kv"><span>Check-in</span><b>{fmtDate(f.checkInDate)}</b></div>
        <div className="kv"><span>Check-out</span><b>{fmtDate(f.checkOutDate)}</b></div>
        <div className="kv"><span>Nights</span><b>{nights || '—'}</b></div>
        <div className="kv"><span>Rooms</span><b>{rn} · {picked.length ? picked.join(', ') : 'Auto-assign'}</b></div>
        <div className="kv"><span>Guests</span><b>{f.numberOfGuests}</b></div>
        <div className="total"><span>Estimated total</span><strong>{money(estimate)}</strong></div>
        <button className="btn primary full" type="submit" disabled={submitting}>{submitting && <Spinner size={16} />}Confirm booking</button>
        <small className="muted">Same-day arrivals reserve the room straight away.</small>
      </aside>

      {submitting && <div className="processing"><div><Spinner size={34} /><h4>Processing your booking…</h4><p>Checking availability and securing the room.</p></div></div>}

      <Modal open={!!done} size="md" onClose={reset}>
        {done && (
          <div className="confirmed">
            <div className="tick"><CheckCircle2 size={38} /></div>
            <h2>Booking Confirmed</h2>
            <div className="conf-card">
              <div className="kv"><span>Booking ID</span><b>{done.bookings.map((b) => b.bookingId).join(', ')}</b></div>
              <div className="kv"><span>Guest</span><b>{done.guest.name}</b></div>
              <div className="kv"><span>Room</span><b>{done.bookings.map((b) => b.roomNumber).join(', ')}</b></div>
              <div className="kv"><span>Room Type</span><b>{[...new Set(done.bookings.map((b) => b.roomType))].join(', ')}</b></div>
              <div className="kv"><span>Check-in</span><b>{fmtDate(done.guest.checkInDate)}</b></div>
              <div className="kv"><span>Check-out</span><b>{fmtDate(done.guest.checkOutDate)}</b></div>
              <div className="kv"><span>Status</span><StatusBadge status="Confirmed" /></div>
            </div>
            <p className="muted">Booking successfully confirmed.</p>
            <div className="conf-actions">
              <button className="btn ghost" onClick={() => navigate(`/bookings?search=${done.bookings[0].bookingId}`)}>View Booking</button>
              <button className="btn primary" onClick={() => navigate('/')}>Back to Dashboard</button>
            </div>
          </div>
        )}
      </Modal>
    </form>
  );
}
