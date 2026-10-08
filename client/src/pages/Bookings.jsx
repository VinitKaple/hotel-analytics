import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { ConfirmDialog, EmptyState, Modal, Pagination, Skeleton, StatusBadge } from '../components/ui';
import { fmtDate, fmtShort, money } from '../utils';
import { PAYMENT } from './bookingShared';

const PAGE = 10;

export default function Bookings() {
  const { bookings, loading, refresh, toast, pushEvent } = useHotel();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('search') || '');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState(null); // {type, booking, value}
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return bookings.filter((b) =>
      (!status || b.bookingStatus === status) && (!date || (b.checkInDate <= date && date <= b.checkOutDate)) &&
      (!t || b.bookingId.toLowerCase().includes(t) || b.roomNumber.includes(t) || b.guest?.name?.toLowerCase().includes(t) || b.guest?.mobile?.includes(t)));
  }, [bookings, q, status, date]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const live = view && bookings.find((b) => b._id === view._id);
  const reset = (fn) => (e) => { fn(e.target.value); setPage(1); };

  const run = async () => {
    setBusy(true);
    try {
      const { type, booking, value } = confirm;
      const res = type === 'cancel' ? await api.patch(`/bookings/${booking._id}/cancel`) : await api.patch(`/bookings/${booking._id}`, { paymentStatus: value });
      toast.success(res.message);
      if (type === 'cancel') pushEvent({ type: 'info', title: 'Booking cancelled', text: res.message });
      setConfirm(null);
      await refresh();
    } catch (e) { toast.error(e.message); setConfirm(null); } finally { setBusy(false); }
  };

  if (loading) return <div className="stack"><Skeleton h={60} /><Skeleton h={420} r={16} /></div>;
  return (
    <div className="stack">
      <div className="welcome"><div><h2>Bookings</h2><p>{bookings.filter((b) => b.bookingStatus === 'Confirmed').length} upcoming · {bookings.filter((b) => b.bookingStatus === 'Checked-In').length} in house · {bookings.length} total</p></div>
        <button className="btn primary" onClick={() => navigate('/bookings/new')}><Plus size={17} />New booking</button></div>
      <section className="card">
        <div className="filters">
          <div className="search"><Search size={16} /><input placeholder="Search guest, booking ID or room" value={q} onChange={reset(setQ)} /></div>
          <select value={status} onChange={reset(setStatus)}><option value="">All statuses</option>{['Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
          <label className="date-filter"><span>Stay on</span><input type="date" value={date} onChange={reset(setDate)} /></label>
          {(q || status || date) && <button className="link" onClick={() => { setQ(''); setStatus(''); setDate(''); }}>Clear</button>}
        </div>
        {rows.length === 0 ? <EmptyState title="No bookings found" text="Try a different search, or create a new booking." action={<button className="btn primary" onClick={() => navigate('/bookings/new')}>New booking</button>} /> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th><th>Amount</th><th>Payment</th><th>Status</th><th /></tr></thead>
              <tbody>{rows.slice((cur - 1) * PAGE, cur * PAGE).map((b) => (
                <tr key={b._id}>
                  <td><b>{b.bookingId}</b></td><td>{b.guest?.name}<small className="sub">{b.guest?.mobile}</small></td><td>{b.roomNumber}<small className="sub">{b.roomType}</small></td>
                  <td>{fmtShort(b.checkInDate)}</td><td>{fmtShort(b.checkOutDate)}</td><td>{money(b.amount)}</td><td><StatusBadge status={b.paymentStatus} /></td><td><StatusBadge status={b.bookingStatus} /></td>
                  <td className="actions">
                    <button className="btn ghost sm" onClick={() => setView(b)}>View</button>
                    {b.bookingStatus === 'Confirmed' && <button className="btn ghost sm danger-text" onClick={() => setConfirm({ type: 'cancel', booking: b })}>Cancel</button>}
                  </td>
                </tr>))}</tbody>
            </table></div>
            <Pagination page={cur} pages={pages} total={rows.length} pageSize={PAGE} onChange={setPage} />
          </>
        )}
      </section>

      <Modal open={!!live} onClose={() => setView(null)} title={live ? `Booking ${live.bookingId}` : ''} subtitle={live?.guest?.name}>
        {live && <div className="detail">
          <div className="kv"><span>Status</span><StatusBadge status={live.bookingStatus} /></div>
          <div className="kv"><span>Room</span><b>{live.roomNumber} · {live.roomType}</b></div>
          <div className="kv"><span>Stay</span><b>{fmtDate(live.checkInDate)} → {fmtDate(live.checkOutDate)}</b></div>
          <div className="kv"><span>Guests</span><b>{live.numberOfGuests}</b></div>
          <div className="kv"><span>Amount</span><b>{money(live.amount)}</b></div>
          <div className="kv"><span>Payment</span><StatusBadge status={live.paymentStatus} /></div>
          {live.specialRequests && <div className="kv"><span>Requests</span><b>{live.specialRequests}</b></div>}
          {live.bookingStatus !== 'Cancelled' && (
            <label className="field" style={{ marginTop: 12 }}><span>Change payment status</span>
              <select value={live.paymentStatus} onChange={(e) => setConfirm({ type: 'payment', booking: live, value: e.target.value })}>{PAYMENT.map((p) => <option key={p}>{p}</option>)}</select>
            </label>)}
        </div>}
      </Modal>
      <ConfirmDialog open={!!confirm} busy={busy} tone={confirm?.type === 'cancel' ? 'danger' : 'primary'}
        title={confirm?.type === 'cancel' ? 'Cancel booking' : 'Change booking status'} confirmText={confirm?.type === 'cancel' ? 'Cancel booking' : 'Update status'}
        message={confirm ? (confirm.type === 'cancel' ? `Cancel booking ${confirm.booking.bookingId}? The room will be released.` : `Mark booking ${confirm.booking.bookingId} as ${confirm.value}?`) : ''}
        onCancel={() => setConfirm(null)} onConfirm={run} />
    </div>
  );
}
