import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { CATEGORIES, FLOOR_NAMES, floorName } from '../constants';
import { fmtDate, roomsLabel, today } from '../utils';
import { EmptyState, Modal, Pagination, Skeleton, StatusBadge } from '../components/ui';

const PAGE = 10;
const SCOPES = [['inhouse', 'In-house'], ['Checked-In', 'Staying'], ['Reserved', 'Reserved'], ['Checked-Out', 'Checked out'], ['Cancelled', 'Cancelled'], ['all', 'All guests']];

export default function Guests() {
  const { guests, loading, doCheckIn, openCheckout } = useHotel();
  const [q, setQ] = useState('');
  const [scope, setScope] = useState('inhouse');
  const [floor, setFloor] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState({ key: 'checkInDate', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [view, setView] = useState(null);
  const T = today();

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = guests.filter((g) =>
      (scope === 'all' || (scope === 'inhouse' ? ['Checked-In', 'Reserved'].includes(g.status) : g.status === scope)) &&
      (floor === '' || g.floor === Number(floor)) && (!cat || g.category === cat) &&
      (!term || g.name.toLowerCase().includes(term) || g.mobile.includes(term) || roomsLabel(g).includes(term) || g.guestCode.toLowerCase().includes(term)));
    const { key, dir } = sort;
    return list.sort((a, b) => {
      const x = key === 'roomNumber' ? roomsLabel(a) : a[key]; const y = key === 'roomNumber' ? roomsLabel(b) : b[key];
      return (x > y ? 1 : x < y ? -1 : 0) * (dir === 'asc' ? 1 : -1);
    });
  }, [guests, q, scope, floor, cat, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const slice = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const th = (key, label) => (
    <th className="sortable" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }))}>
      {label}{sort.key === key && (sort.dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
    </th>
  );
  const f = (fn) => (e) => { fn(e.target.value); setPage(1); };
  const live = view && guests.find((g) => g._id === view._id);

  if (loading) return <div className="stack"><Skeleton h={60} /><Skeleton h={420} r={16} /></div>;
  return (
    <div className="stack">
      <div className="welcome"><div><h2>Guests</h2><p>{guests.filter((g) => g.status === 'Checked-In').length} currently staying · {guests.filter((g) => g.status === 'Reserved').length} reserved · {guests.length} guest records</p></div></div>
      <section className="card">
        <div className="filters">
          <div className="search"><Search size={16} /><input placeholder="Search name, mobile or room" value={q} onChange={f(setQ)} /></div>
          <select value={scope} onChange={f(setScope)}>{SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select value={floor} onChange={f(setFloor)}><option value="">All floors</option>{FLOOR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
          <select value={cat} onChange={f(setCat)}><option value="">AC / Non-AC / Dorm</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        {rows.length === 0 ? <EmptyState title="No guests found" text="Adjust the search or filters to see more records." /> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>ID</th>{th('name', 'Guest')}<th>Mobile</th><th>Location</th>{th('roomNumber', 'Room')}<th>Floor</th>{th('checkInDate', 'Check-in')}{th('checkOutDate', 'Check-out')}<th>Pax</th><th>Status</th><th /></tr></thead>
              <tbody>{slice.map((g) => (
                <tr key={g._id}>
                  <td className="muted">{g.guestCode}</td><td><b>{g.name}</b></td><td>{g.mobile}</td><td>{g.location}</td>
                  <td>{roomsLabel(g)}<small className="sub">{g.roomType}</small></td><td>{floorName(g.floor)}</td><td>{fmtDate(g.checkInDate)}</td><td>{fmtDate(g.checkOutDate)}</td><td>{g.numberOfGuests}</td>
                  <td><StatusBadge status={g.status} /></td>
                  <td className="actions">
                    <button className="btn ghost sm" onClick={() => setView(g)}>View</button>
                    {g.status === 'Checked-In' && <button className="btn primary sm" onClick={() => openCheckout(g)}>Check out</button>}
                    {g.status === 'Reserved' && g.checkInDate <= T && <button className="btn primary sm" onClick={() => doCheckIn(g)}>Check in</button>}
                  </td>
                </tr>))}</tbody>
            </table></div>
            <Pagination page={cur} pages={pages} total={rows.length} pageSize={PAGE} onChange={setPage} />
          </>
        )}
      </section>
      <Modal open={!!live} onClose={() => setView(null)} title={live?.name} subtitle={live ? `${live.guestCode} · ${live.location}` : ''} footer={live?.status === 'Checked-In' && <button className="btn primary" onClick={() => { openCheckout(live); setView(null); }}>Check out</button>}>
        {live && <div className="detail">
          <div className="kv"><span>Status</span><StatusBadge status={live.status} /></div>
          <div className="kv"><span>Mobile</span><b>{live.mobile}</b></div>
          <div className="kv"><span>Email</span><b>{live.email || '—'}</b></div>
          <div className="kv"><span>Identity proof</span><b>{live.identityProofType} · {live.identityProofNumber}</b></div>
          <div className="kv"><span>Room</span><b>{roomsLabel(live)} · {live.roomType} ({live.category})</b></div>
          <div className="kv"><span>Floor</span><b>{floorName(live.floor)}</b></div>
          <div className="kv"><span>Check-in</span><b>{fmtDate(live.checkInDate)}</b></div>
          <div className="kv"><span>{live.actualCheckOut ? 'Checked out' : 'Expected check-out'}</span><b>{fmtDate(live.actualCheckOut || live.checkOutDate)}</b></div>
          <div className="kv"><span>Guests</span><b>{live.numberOfGuests}</b></div>
        </div>}
      </Modal>
    </div>
  );
}
