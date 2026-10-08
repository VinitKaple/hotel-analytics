import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { FLOOR_NAMES, floorName } from '../constants';
import { guestMetrics } from '../stats';
import { fmtDate, fmtShort, roomsLabel } from '../utils';
import { EmptyState, Skeleton, StatusBadge, Tabs } from '../components/ui';

export default function CheckInOut() {
  const { guests, loading, doCheckIn, openCheckout } = useHotel();
  const [tab, setTab] = useState('in');
  const [q, setQ] = useState('');
  const [floor, setFloor] = useState('');
  const m = useMemo(() => guestMetrics(guests), [guests]);

  const sets = {
    in: m.arrivalsPending,
    staying: m.staying,
    out: m.departuresPending,
    done: m.checkedOut.filter((g) => g.actualCheckOut).sort((a, b) => (b.actualCheckOut || '').localeCompare(a.actualCheckOut || '')).slice(0, 60),
  };
  const rows = sets[tab].filter((g) => (floor === '' || g.floor === Number(floor)) && (!q || g.name.toLowerCase().includes(q.toLowerCase()) || roomsLabel(g).includes(q.trim())));

  if (loading) return <div className="stack"><Skeleton h={52} /><Skeleton h={380} r={16} /></div>;
  return (
    <div className="stack">
      <div className="welcome"><div><h2>Check-in / Check-out</h2><p>{m.arrivalsPending.length} arrivals waiting · {m.departuresPending.length} departures due · {m.staying.length} guests in house</p></div></div>
      <section className="card">
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'in', label: "Today's check-ins", count: m.arrivalsPending.length },
          { id: 'staying', label: 'Currently staying', count: m.staying.length },
          { id: 'out', label: "Today's check-outs", count: m.departuresPending.length },
          { id: 'done', label: 'Checked out', count: m.checkedOut.length },
        ]} />
        <div className="filters" style={{ marginTop: 14 }}>
          <div className="search"><Search size={16} /><input placeholder="Search guest or room" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select value={floor} onChange={(e) => setFloor(e.target.value)}><option value="">All floors</option>{FLOOR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={tab === 'in' ? 'No arrivals waiting' : tab === 'out' ? 'No departures pending' : 'Nothing to show'} text="Guests will appear here as their status changes." />
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Guest</th><th>Room</th><th>Floor</th><th>Check-in</th><th>{tab === 'done' ? 'Checked out' : 'Check-out'}</th><th>Guests</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map((g) => (
              <tr key={g._id}>
                <td><b>{g.name}</b><small className="sub">{g.mobile}</small></td><td>{roomsLabel(g)}<small className="sub">{g.roomType}</small></td><td>{floorName(g.floor)}</td>
                <td>{fmtDate(g.checkInDate)}</td><td>{tab === 'done' ? fmtDate(g.actualCheckOut) : fmtDate(g.checkOutDate)}</td><td>{g.numberOfGuests}</td><td><StatusBadge status={g.status} /></td>
                <td className="actions">
                  {g.status === 'Reserved' && <button className="btn primary sm" onClick={() => doCheckIn(g)}>Check in</button>}
                  {g.status === 'Checked-In' && <button className={`btn sm ${g.checkOutDate <= m.T ? 'primary' : 'ghost'}`} onClick={() => openCheckout(g)}>Check out</button>}
                </td>
              </tr>))}</tbody>
          </table></div>
        )}
        {tab === 'in' && m.upcoming.length > 0 && (
          <p className="muted small" style={{ marginTop: 14 }}>{m.upcoming.length} more guest{m.upcoming.length > 1 ? 's are' : ' is'} booked for later dates (next: {fmtShort(m.upcoming.map((g) => g.checkInDate).sort()[0])}).</p>
        )}
      </section>
    </div>
  );
}
