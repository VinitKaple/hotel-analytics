import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Pencil, Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { CATEGORIES, FLOOR_NAMES, ROOM_STATUSES, ROOM_TYPES, floorName } from '../constants';
import { floorBreakdown, roomStats } from '../stats';
import { fmtDate, money } from '../utils';
import FloorCard from '../components/FloorCard';
import { ConfirmDialog, EmptyState, Field, Modal, Skeleton, Spinner, StatusBadge } from '../components/ui';

function RoomForm({ room, onClose, onSaved }) {
  const { toast } = useHotel();
  const editing = !!room;
  const [f, setF] = useState(room ? { roomNumber: room.roomNumber, floor: room.floor, roomType: room.roomType, capacity: room.capacity, price: room.price, status: room.status } : { roomNumber: '', floor: 0, roomType: 'AC Double', capacity: 2, price: 3200, status: 'Available' });
  const [busy, setBusy] = useState(false);
  const locked = editing && ['Occupied', 'Reserved'].includes(room.status);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const changeType = (t) => setF((p) => ({ ...p, roomType: t, capacity: ROOM_TYPES[t].capacity, price: ROOM_TYPES[t].price }));
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, floor: Number(f.floor), capacity: Number(f.capacity), price: Number(f.price) };
      const res = editing ? await api.patch(`/rooms/${room._id}`, body) : await api.post('/rooms', body);
      toast.success(res.message);
      onSaved();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={editing ? `Edit Room ${room.roomNumber}` : 'Add a room'} subtitle={locked ? 'This room has a guest, so only price and capacity can change.' : undefined}
      footer={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save} disabled={busy}>{busy && <Spinner size={15} />}{editing ? 'Save changes' : 'Add room'}</button></>}>
      <div className="form-grid">
        {!editing && <Field label="Room number"><input value={f.roomNumber} onChange={(e) => set('roomNumber', e.target.value)} placeholder="e.g. 216" /></Field>}
        <Field label="Floor"><select value={f.floor} onChange={(e) => set('floor', e.target.value)} disabled={locked}>{FLOOR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
        <Field label="Room type"><select value={f.roomType} onChange={(e) => changeType(e.target.value)} disabled={locked}>{Object.keys(ROOM_TYPES).map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Capacity"><input type="number" min="1" value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
        <Field label="Price per night (₹)"><input type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} /></Field>
        {editing && !locked && <Field label="Status"><select value={f.status} onChange={(e) => set('status', e.target.value)}>{['Available', 'Cleaning', 'Maintenance'].map((s) => <option key={s}>{s}</option>)}</select></Field>}
      </div>
    </Modal>
  );
}

export default function Rooms() {
  const { rooms, loading, refresh, toast } = useHotel();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [view, setView] = useState('grid');
  const [q, setQ] = useState('');
  const [fl, setFl] = useState({ floor: sp.get('floor') ?? '', roomType: '', category: '', status: sp.get('status') ?? '', capacity: '' });
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // room | 'new'
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const setFilter = (k, v) => { setFl((p) => ({ ...p, [k]: v })); if (k === 'floor') { const n = new URLSearchParams(sp); v === '' ? n.delete('floor') : n.set('floor', v); setSp(n, { replace: true }); } };
  const floors = useMemo(() => floorBreakdown(rooms), [rooms]);
  const s = roomStats(rooms);
  const list = useMemo(() => rooms.filter((r) =>
    (fl.floor === '' || r.floor === Number(fl.floor)) && (!fl.roomType || r.roomType === fl.roomType) && (!fl.category || r.category === fl.category) &&
    (!fl.status || r.status === fl.status) && (!fl.capacity || r.capacity >= Number(fl.capacity)) &&
    (!q || r.roomNumber.includes(q.trim()) || r.currentGuest?.name?.toLowerCase().includes(q.trim().toLowerCase()))), [rooms, fl, q]);

  const live = selected && rooms.find((r) => r._id === selected._id);
  const quick = async (room, status) => {
    try { const res = await api.patch(`/rooms/${room._id}`, { status }); toast.success(res.message.replace('has been updated', `is now ${status.toLowerCase()}`)); await refresh(); } catch (e) { toast.error(e.message); }
  };
  const remove = async () => {
    setBusy(true);
    try { const res = await api.del(`/rooms/${deleting._id}`); toast.success(res.message); setDeleting(null); setSelected(null); await refresh(); } catch (e) { toast.error(e.message); setDeleting(null); } finally { setBusy(false); }
  };

  if (loading) return <div className="stack"><Skeleton h={150} r={16} /><Skeleton h={400} r={16} /></div>;
  return (
    <div className="stack">
      <div className="welcome"><div><h2>Rooms</h2><p>{s.available} available · {s.occupied} occupied · {s.reserved} reserved · {s.cleaning} cleaning · {s.maintenance} maintenance</p></div>
        <button className="btn primary" onClick={() => setEditing('new')}><Plus size={17} />Add room</button></div>

      <section>
        <div className="card-head plain"><h3>Floor-wise availability</h3>{fl.floor !== '' && <button className="link" onClick={() => setFilter('floor', '')}>Show all floors</button>}</div>
        <div className="grid g5">{floors.map((f) => <FloorCard key={f.floor} data={f} active={String(fl.floor) === String(f.floor)} onClick={() => setFilter('floor', String(fl.floor) === String(f.floor) ? '' : String(f.floor))} />)}</div>
      </section>

      <section className="card">
        <div className="filters">
          <div className="search"><Search size={16} /><input placeholder="Search room or guest" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select value={fl.floor} onChange={(e) => setFilter('floor', e.target.value)}><option value="">All floors</option>{FLOOR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
          <select value={fl.category} onChange={(e) => setFilter('category', e.target.value)}><option value="">AC / Non-AC / Dorm</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={fl.roomType} onChange={(e) => setFilter('roomType', e.target.value)}><option value="">All room types</option>{Object.keys(ROOM_TYPES).map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fl.status} onChange={(e) => setFilter('status', e.target.value)}><option value="">All statuses</option>{ROOM_STATUSES.map((t) => <option key={t}>{t}</option>)}</select>
          <select value={fl.capacity} onChange={(e) => setFilter('capacity', e.target.value)}><option value="">Any capacity</option>{[1, 2, 3, 4, 8].map((c) => <option key={c} value={c}>{c}+ guests</option>)}</select>
          <div className="seg"><button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label="Grid view"><LayoutGrid size={16} /></button><button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')} aria-label="Table view"><List size={16} /></button></div>
        </div>
        <p className="muted result-count">{list.length} room{list.length === 1 ? '' : 's'}</p>

        {list.length === 0 ? <EmptyState title="No rooms match" text="Try removing a filter." /> : view === 'grid' ? (
          <div className="room-grid">
            {list.map((r) => (
              <button key={r._id} className={`room-card st-${r.status.toLowerCase()}`} onClick={() => setSelected(r)}>
                <div className="room-top"><strong>{r.roomNumber}</strong><StatusBadge status={r.status} /></div>
                <span className="room-type">{r.roomType}</span>
                <small className="muted">{floorName(r.floor)} · <UsersIcon size={12} /> {r.capacity}</small>
                <div className="room-bottom"><b>{money(r.price)}</b><small>{r.currentGuest ? r.currentGuest.name : r.status === 'Available' ? 'Ready to book' : '—'}</small></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Room</th><th>Floor</th><th>Type</th><th>Cat.</th><th>Capacity</th><th>Price</th><th>Status</th><th>Current guest</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r._id} className="row-link" onClick={() => setSelected(r)}>
                <td><b>{r.roomNumber}</b></td><td>{floorName(r.floor)}</td><td>{r.roomType}</td><td>{r.category}</td><td>{r.capacity}</td><td>{money(r.price)}</td><td><StatusBadge status={r.status} /></td><td>{r.currentGuest?.name || '—'}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>

      <Modal open={!!live} onClose={() => setSelected(null)} title={live ? `Room ${live.roomNumber}` : ''} subtitle={live ? `${live.roomType} · ${floorName(live.floor)}` : ''}
        footer={live && <>
          <button className="btn ghost danger-text" onClick={() => setDeleting(live)}><Trash2 size={15} />Delete</button>
          <button className="btn ghost" onClick={() => { setEditing(live); setSelected(null); }}><Pencil size={15} />Edit</button>
          {live.status === 'Available' && <button className="btn primary" onClick={() => navigate(`/bookings/new?room=${live.roomNumber}`)}>Book this room</button>}
        </>}>
        {live && (
          <div className="detail">
            <div className="kv"><span>Status</span><StatusBadge status={live.status} /></div>
            <div className="kv"><span>Category</span><b>{live.category}</b></div>
            <div className="kv"><span>Capacity</span><b>{live.capacity} guest{live.capacity > 1 ? 's' : ''}</b></div>
            <div className="kv"><span>Price per night</span><b>{money(live.price)}</b></div>
            {live.currentGuest && <>
              <div className="kv"><span>Guest</span><b>{live.currentGuest.name}</b></div>
              <div className="kv"><span>Stay</span><b>{fmtDate(live.currentGuest.checkInDate)} → {fmtDate(live.currentGuest.checkOutDate)}</b></div>
            </>}
            {['Cleaning', 'Maintenance'].includes(live.status) && <button className="btn primary full" onClick={() => quick(live, 'Available')}>Mark as available</button>}
            {live.status === 'Available' && <button className="btn ghost full" onClick={() => quick(live, 'Maintenance')}>Send to maintenance</button>}
          </div>
        )}
      </Modal>
      {editing && <RoomForm room={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await refresh(); }} />}
      <ConfirmDialog open={!!deleting} title="Delete room" tone="danger" confirmText="Delete room" busy={busy} message={deleting ? `Delete Room ${deleting.roomNumber}? This can't be undone.` : ''} onCancel={() => setDeleting(null)} onConfirm={remove} />
    </div>
  );
}
