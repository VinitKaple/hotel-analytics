import { CATEGORIES, CATEGORY_COLORS } from '../constants';
import { Progress } from './ui';

export default function FloorCard({ data, active, onClick }) {
  const pct = data.total ? Math.round(((data.occupied + data.reserved) / data.total) * 100) : 0;
  return (
    <button className={`floor-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="floor-head"><b>{data.name}</b><span>{data.available} of {data.total} free</span></div>
      <div className="floor-cats">
        {CATEGORIES.map((c) => (
          <div key={c}>
            <small style={{ color: CATEGORY_COLORS[c] }}>{c} available</small>
            <strong>{data.availableByCategory[c]}</strong>
          </div>
        ))}
      </div>
      <Progress value={pct} />
      <small className="muted">{pct}% booked or occupied</small>
    </button>
  );
}
