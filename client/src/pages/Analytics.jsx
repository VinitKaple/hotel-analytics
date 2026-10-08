import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { CATEGORIES, CATEGORY_COLORS, FLOOR_NAMES, ROOM_TYPES, TYPE_COLORS, floorName } from '../constants';
import { addDays, fmtDate, today } from '../utils';
import { Field, Gauge, Progress, Skeleton, StatusBadge, Tabs } from '../components/ui';

export default function Analytics() {
  const { version, toast } = useHotel();
  const [f, setF] = useState({ from: addDays(today(), -13), to: today(), floor: '', category: '', roomType: '' });
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState('staying');

  useEffect(() => {
    let live = true;
    setBusy(true);
    const q = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v !== '' && q.set(k, v));
    const t = setTimeout(() => api.get(`/analytics?${q}`).then((r) => live && setD(r)).catch((e) => toast.error(e.message)).finally(() => live && setBusy(false)), 150);
    return () => { live = false; clearTimeout(t); };
  }, [f, version, toast]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const types = Object.keys(ROOM_TYPES).filter((t) => !f.category || ROOM_TYPES[t].category === f.category);
  const mv = d?.movement;
  const tabs = mv && [
    { id: 'staying', label: 'Currently staying', count: mv.staying.length },
    { id: 'expectedCheckIn', label: 'Expected check-in', count: mv.expectedCheckIn.length },
    { id: 'expectedCheckOut', label: 'Expected check-out', count: mv.expectedCheckOut.length },
    { id: 'checkedOut', label: 'Checked out', count: mv.checkedOut.length },
  ];

  return (
    <div className="stack">
      <section className="card filter-card">
        <div className="form-grid five">
          <Field label="From"><input type="date" value={f.from} max={f.to} onChange={(e) => e.target.value && set('from', e.target.value)} /></Field>
          <Field label="To"><input type="date" value={f.to} min={f.from} onChange={(e) => e.target.value && set('to', e.target.value)} /></Field>
          <Field label="Floor"><select value={f.floor} onChange={(e) => set('floor', e.target.value)}><option value="">All floors</option>{FLOOR_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
          <Field label="Category"><select value={f.category} onChange={(e) => { set('category', e.target.value); set('roomType', ''); }}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Room type"><select value={f.roomType} onChange={(e) => set('roomType', e.target.value)}><option value="">All types</option>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
        </div>
      </section>

      {!d ? (
        <div className="stack"><Skeleton h={220} r={16} /><div className="grid g2"><Skeleton h={300} r={16} /><Skeleton h={300} r={16} /></div></div>
      ) : (
        <div className={`stack ${busy ? 'busy' : ''}`}>
          <div className="grid g3-1">
            <section className="card center-card"><div className="card-head"><h3>Current occupancy</h3></div>
              <Gauge value={d.summary.occupancyRate} size={190} />
              <p className="muted">{d.summary.occupied} of {d.summary.total} rooms · {d.summary.reserved} reserved · {d.summary.available} available</p></section>
            <section className="card"><div className="card-head"><h3>Room distribution</h3></div>
              <div className="dist">
                {d.byCategory.filter((c) => c.total > 0).map((c) => (
                  <div key={c.category} className="dist-row">
                    <div className="dist-title"><i style={{ background: CATEGORY_COLORS[c.category] }} /><b>{c.category === 'Dormitory' ? 'Dormitory' : `${c.category} rooms`}</b><span>{c.total} total</span></div>
                    <Progress value={c.total ? ((c.occupied + c.reserved) / c.total) * 100 : 0} color={CATEGORY_COLORS[c.category]} />
                    <div className="dist-nums"><span>Available <b>{c.available}</b></span><span>Occupied <b>{c.occupied}</b></span><span>Reserved <b>{c.reserved}</b></span></div>
                  </div>
                ))}
              </div></section>
          </div>

          <div className="grid g2">
            <section className="card"><div className="card-head"><h3>Occupancy trend</h3><span className="muted">{fmtDate(d.range.from)} – {fmtDate(d.range.to)}</span></div>
              <div className="chart-box"><ResponsiveContainer><LineChart data={d.trend} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#e4e9e7" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} unit="%" domain={[0, 100]} /><Tooltip formatter={(v, n, p) => [`${v}% (${p.payload.occupied} rooms)`, 'Occupancy']} />
                <Line type="monotone" dataKey="rate" stroke="#0f766e" strokeWidth={2.5} dot={d.trend.length < 20} activeDot={{ r: 5 }} />
              </LineChart></ResponsiveContainer></div></section>
            <section className="card"><div className="card-head"><h3>Check-ins vs check-outs</h3></div>
              <div className="chart-box"><ResponsiveContainer><BarChart data={d.flow} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#e4e9e7" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} /><Tooltip /><Legend iconType="circle" />
                <Bar dataKey="checkIns" name="Check-ins" fill="#0f766e" radius={[4, 4, 0, 0]} /><Bar dataKey="checkOuts" name="Check-outs" fill="#c8a35a" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer></div></section>
          </div>

          <div className="grid g2">
            <section className="card"><div className="card-head"><h3>Floor-wise occupancy</h3></div>
              <div className="chart-box"><ResponsiveContainer><BarChart data={d.byFloor.map((x) => ({ ...x, label: floorName(x.floor).replace(' Floor', '') }))} margin={{ left: -16, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#e4e9e7" /><XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} /><YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip /><Legend iconType="circle" />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#0f766e" /><Bar dataKey="reserved" name="Reserved" stackId="a" fill="#c8a35a" /><Bar dataKey="available" name="Available" stackId="a" fill="#cfe7e3" radius={[4, 4, 0, 0]} />
              </BarChart></ResponsiveContainer></div>
              <div className="table-wrap flush"><table><thead><tr><th>Floor</th><th>AC free</th><th>Non-AC free</th><th>Dorm free</th><th>Occupancy</th></tr></thead>
                <tbody>{d.byFloor.map((x) => <tr key={x.floor}><td><b>{x.name}</b></td><td>{x.availableByCategory.AC}</td><td>{x.availableByCategory['Non-AC']}</td><td>{x.availableByCategory.Dormitory}</td><td>{x.occupancyRate}%</td></tr>)}</tbody></table></div></section>
            <section className="card"><div className="card-head"><h3>Room type distribution</h3></div>
              <div className="chart-box"><ResponsiveContainer><PieChart>
                <Pie data={d.roomTypes} dataKey="total" nameKey="roomType" innerRadius={62} outerRadius={104} paddingAngle={2}>{d.roomTypes.map((x, i) => <Cell key={x.roomType} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}</Pie>
                <Tooltip formatter={(v, n, p) => [`${v} rooms · ${p.payload.occupied} occupied · ${p.payload.available} free`, p.payload.roomType]} /><Legend iconType="circle" />
              </PieChart></ResponsiveContainer></div></section>
          </div>

          <section className="card">
            <div className="card-head"><h3>Guest movement</h3><span className="muted">For {fmtDate(d.range.from)} – {fmtDate(d.range.to)}</span></div>
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
            {mv[tab].length === 0 ? <p className="muted pad">No guests in this group for the selected filters.</p> : (
              <div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Floor</th><th>Type</th><th>Check-in</th><th>Check-out</th><th>Status</th></tr></thead>
                <tbody>{mv[tab].slice(0, 25).map((g) => <tr key={g._id}><td><b>{g.name}</b></td><td>{g.roomNumber}</td><td>{floorName(g.floor)}</td><td>{g.roomType}</td><td>{fmtDate(g.checkInDate)}</td><td>{fmtDate(g.actualCheckOut || g.checkOutDate)}</td><td><StatusBadge status={g.status} /></td></tr>)}</tbody></table></div>
            )}
            {mv[tab].length > 25 && <p className="muted small">Showing 25 of {mv[tab].length}. Narrow the filters to see others.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
