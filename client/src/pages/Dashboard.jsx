import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, BedDouble, CalendarCheck, DoorClosed, DoorOpen, LogIn, LogOut, Percent, Plus } from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { api } from '../api';
import { floorBreakdown, guestMetrics, roomStats } from '../stats';
import { addDays, fmtShort, greeting, longDate, money, roomsLabel, today } from '../utils';
import FloorCard from '../components/FloorCard';
import { Gauge, Skeleton, StatCard, StatusBadge } from '../components/ui';

function DashboardSkeleton() {
  return (
    <div className="stack">
      <Skeleton h={54} w="40%" />
      <div className="grid g6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={92} r={16} />)}</div>
      <div className="grid g2"><Skeleton h={260} r={16} /><Skeleton h={260} r={16} /></div>
      <Skeleton h={180} r={16} />
    </div>
  );
}

export default function Dashboard() {
  const { rooms, guests, bookings, loading, version, doCheckIn, openCheckout } = useHotel();
  const navigate = useNavigate();
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    const T = today();
    api.get(`/analytics?from=${addDays(T, -6)}&to=${T}`).then((d) => setTrend(d.trend)).catch(() => setTrend([]));
  }, [version]);

  if (loading) return <DashboardSkeleton />;
  const s = roomStats(rooms);
  const m = guestMetrics(guests);
  const floors = floorBreakdown(rooms);
  const recent = bookings.slice(0, 6);

  return (
    <div className="stack">
      <div className="welcome">
        <div><h2>{greeting()}, Admin</h2><p>{longDate()}</p></div>
        <button className="btn primary" onClick={() => navigate('/bookings/new')}><Plus size={17} />New booking</button>
      </div>

      <div className="grid g6">
        <StatCard icon={BedDouble} label="Total Rooms" value={s.total} sub={`${s.maintenance} under maintenance`} onClick={() => navigate('/rooms')} />
        <StatCard icon={DoorOpen} tone="green" label="Available" value={s.available} sub={`${s.cleaning} being cleaned`} onClick={() => navigate('/rooms?status=Available')} />
        <StatCard icon={DoorClosed} tone="blue" label="Occupied" value={s.occupied} sub={`${s.reserved} reserved`} onClick={() => navigate('/rooms?status=Occupied')} />
        <StatCard icon={Percent} tone="gold" label="Occupancy Rate" value={`${s.occupancyRate}%`} sub="Occupied ÷ total rooms" />
        <StatCard icon={LogIn} tone="teal" label="Check-ins Today" value={m.checkInsToday.length} sub={`${m.arrivalsPending.length} still to arrive`} onClick={() => navigate('/check-in-out')} />
        <StatCard icon={LogOut} tone="violet" label="Check-outs Today" value={m.departuresPending.length + m.departuresDone.length} sub={`${m.departuresDone.length} completed`} onClick={() => navigate('/check-in-out')} />
      </div>

      <div className="grid g2">
        <section className="card">
          <div className="card-head"><h3>Room status</h3></div>
          <div className="status-split">
            <Gauge value={s.occupancyRate} />
            <ul className="legend">
              {[['Occupied', s.occupied, 'blue'], ['Reserved', s.reserved, 'amber'], ['Available', s.available, 'green'], ['Cleaning', s.cleaning, 'violet'], ['Maintenance', s.maintenance, 'red']].map(([l, n, t]) => (
                <li key={l}><i className={`dot ${t}`} />{l}<b>{n}</b></li>
              ))}
            </ul>
          </div>
        </section>
        <section className="card">
          <div className="card-head"><h3>Occupancy, last 7 days</h3><button className="link" onClick={() => navigate('/analytics')}>Full analytics <ArrowRight size={14} /></button></div>
          {!trend ? <Skeleton h={200} r={12} /> : (
            <div className="chart-box short">
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                  <defs><linearGradient id="occ" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="#e4e9e7" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Occupancy']} />
                  <Area type="monotone" dataKey="rate" stroke="#0f766e" strokeWidth={2.5} fill="url(#occ)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section>
        <div className="card-head plain"><h3>Availability by floor</h3><button className="link" onClick={() => navigate('/rooms')}>Browse rooms <ArrowRight size={14} /></button></div>
        <div className="grid g5">{floors.map((f) => <FloorCard key={f.floor} data={f} onClick={() => navigate(`/rooms?floor=${f.floor}`)} />)}</div>
      </section>

      <div className="grid g2">
        <section className="card">
          <div className="card-head"><h3>Arriving today</h3><span className="muted">{m.arrivalsPending.length} pending</span></div>
          <ul className="people">
            {m.arrivalsPending.length === 0 && <li className="muted">No arrivals waiting.</li>}
            {m.arrivalsPending.map((g) => (
              <li key={g._id}><div><b>{g.name}</b><small>Room {roomsLabel(g)} · {g.roomType}</small></div><button className="btn ghost sm" onClick={() => doCheckIn(g)}>Check in</button></li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-head"><h3>Leaving today</h3><span className="muted">{m.departuresPending.length} pending</span></div>
          <ul className="people">
            {m.departuresPending.length === 0 && <li className="muted">Everyone has checked out.</li>}
            {m.departuresPending.map((g) => (
              <li key={g._id}><div><b>{g.name}</b><small>Room {roomsLabel(g)} · {g.roomType}</small></div><button className="btn ghost sm" onClick={() => openCheckout(g)}>Check out</button></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h3>Recent bookings</h3><button className="link" onClick={() => navigate('/bookings')}>All bookings <ArrowRight size={14} /></button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Guest</th><th>Room</th><th>Stay</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b._id} onClick={() => navigate(`/bookings?search=${b.bookingId}`)} className="row-link">
                  <td><b>{b.bookingId}</b></td><td>{b.guest?.name}</td><td>{b.roomNumber} · {b.roomType}</td>
                  <td>{fmtShort(b.checkInDate)} → {fmtShort(b.checkOutDate)}</td><td>{money(b.amount)}</td><td><StatusBadge status={b.bookingStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
