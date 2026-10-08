import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { api } from '../api';
import { useHotel } from '../context/HotelContext';
import { fmtDate, downloadCSV, money, today } from '../utils';
import { Progress, Skeleton, Tabs } from '../components/ui';

export default function Reports() {
  const { version, toast } = useHotel();
  const [r, setR] = useState(null);
  const [tab, setTab] = useState('daily');
  useEffect(() => { api.get('/analytics/reports').then(setR).catch((e) => toast.error(e.message)); }, [version, toast]);

  const exportCsv = () => {
    const rows = [['Hotel report', fmtDate(today())], [], ['Daily occupancy'], ['Date', 'Occupied rooms', 'Occupancy %', 'Check-ins', 'Check-outs', 'Revenue']];
    r.daily.forEach((x) => rows.push([x.date, x.occupied, x.rate, x.checkIns, x.checkOuts, x.revenue]));
    rows.push([], ['Weekly occupancy'], ['Week', 'Avg occupancy %', 'Check-ins', 'Check-outs', 'Revenue']);
    r.weekly.forEach((x) => rows.push([x.label, x.avgOccupancy, x.checkIns, x.checkOuts, x.revenue]));
    rows.push([], ['Monthly occupancy'], ['Month', 'Avg occupancy %', 'Check-ins', 'Check-outs', 'Revenue']);
    r.monthly.forEach((x) => rows.push([x.label, x.avgOccupancy, x.checkIns, x.checkOuts, x.revenue]));
    rows.push([], ['Room-type performance (last 30 days)'], ['Room type', 'Rooms', 'Bookings', 'Room-nights', 'Utilisation %', 'Revenue']);
    r.roomTypePerformance.forEach((x) => rows.push([x.roomType, x.rooms, x.bookings, x.nights, x.utilization, x.revenue]));
    rows.push([], ['Room utilisation (last 30 days)'], ['Room', 'Type', 'Nights', 'Utilisation %']);
    r.utilization.forEach((x) => rows.push([x.roomNumber, x.roomType, x.nights, x.utilization]));
    downloadCSV(`hotel-report-${today()}.csv`, rows);
    toast.success('Report exported as CSV.');
  };

  if (!r) return <div className="stack"><Skeleton h={60} /><Skeleton h={380} r={16} /></div>;
  const rowsFor = { daily: r.daily, weekly: r.weekly, monthly: r.monthly }[tab];
  const label = (x) => x.label;
  return (
    <div className="stack">
      <div className="welcome">
        <div><h2>Reports</h2><p>Generated {new Date(r.generatedAt).toLocaleString('en-IN')} · {r.totalRooms} rooms</p></div>
        <div className="row-gap no-print"><button className="btn ghost" onClick={() => window.print()}><Printer size={16} />Print report</button><button className="btn primary" onClick={exportCsv}><Download size={16} />Export report</button></div>
      </div>

      <div className="grid g3">
        <section className="card mini"><h4>Check-in statistics</h4><div className="mini-row"><div><strong>{r.stats.checkIns.today}</strong><small>Today</small></div><div><strong>{r.stats.checkIns.last7}</strong><small>Last 7 days</small></div><div><strong>{r.stats.checkIns.last30}</strong><small>Last 30 days</small></div></div></section>
        <section className="card mini"><h4>Check-out statistics</h4><div className="mini-row"><div><strong>{r.stats.checkOuts.today}</strong><small>Today</small></div><div><strong>{r.stats.checkOuts.last7}</strong><small>Last 7 days</small></div><div><strong>{r.stats.checkOuts.last30}</strong><small>Last 30 days</small></div></div></section>
        <section className="card mini"><h4>Average stay</h4><div className="mini-row"><div><strong>{r.stats.avgStay}</strong><small>nights per booking</small></div></div></section>
      </div>

      <section className="card">
        <div className="no-print"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'daily', label: 'Daily occupancy' }, { id: 'weekly', label: 'Weekly occupancy' }, { id: 'monthly', label: 'Monthly occupancy' }]} /></div>
        <div className="table-wrap"><table>
          <thead><tr><th>{tab === 'daily' ? 'Date' : tab === 'weekly' ? 'Week' : 'Month'}</th>{tab === 'daily' && <th>Occupied rooms</th>}<th>{tab === 'daily' ? 'Occupancy' : 'Avg occupancy'}</th><th>Check-ins</th><th>Check-outs</th><th>Room revenue</th></tr></thead>
          <tbody>{[...rowsFor].reverse().map((x) => (
            <tr key={x.date || x.label}><td><b>{tab === 'daily' ? fmtDate(x.date) : label(x)}</b></td>{tab === 'daily' && <td>{x.occupied}</td>}
              <td><div className="rate-cell"><Progress value={tab === 'daily' ? x.rate : x.avgOccupancy} /><span>{tab === 'daily' ? x.rate : x.avgOccupancy}%</span></div></td>
              <td>{x.checkIns}</td><td>{x.checkOuts}</td><td>{money(x.revenue)}</td></tr>))}</tbody>
        </table></div>
      </section>

      <div className="grid g2">
        <section className="card"><div className="card-head"><h3>Room-type performance</h3><span className="muted">Last 30 days</span></div>
          <div className="table-wrap flush"><table><thead><tr><th>Type</th><th>Rooms</th><th>Bookings</th><th>Utilisation</th><th>Revenue</th></tr></thead>
            <tbody>{r.roomTypePerformance.map((x) => <tr key={x.roomType}><td><b>{x.roomType}</b></td><td>{x.rooms}</td><td>{x.bookings}</td><td>{x.utilization}%</td><td>{money(x.revenue)}</td></tr>)}</tbody></table></div></section>
        <section className="card"><div className="card-head"><h3>Room utilisation</h3><span className="muted">Busiest and quietest rooms</span></div>
          <div className="util-cols">
            <div><h5>Highest</h5>{r.utilization.slice(0, 6).map((x) => <div className="util" key={x.roomNumber}><span>{x.roomNumber}</span><Progress value={x.utilization} /><b>{x.utilization}%</b></div>)}</div>
            <div><h5>Lowest</h5>{r.utilization.slice(-6).reverse().map((x) => <div className="util" key={x.roomNumber}><span>{x.roomNumber}</span><Progress value={x.utilization} color="#c8a35a" /><b>{x.utilization}%</b></div>)}</div>
          </div></section>
      </div>
    </div>
  );
}
