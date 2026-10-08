import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Inbox, Loader2, X, XCircle } from 'lucide-react';
import { STATUS_TONE } from '../constants';

export const Badge = ({ tone = 'gray', children, dot }) => <span className={`badge ${tone}`}>{dot && <i />}{children}</span>;
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status] || 'gray'} dot>{status}</Badge>;
export const Spinner = ({ size = 18 }) => <Loader2 className="spin" size={size} />;
export const Skeleton = ({ h = 16, w = '100%', r = 8, style }) => <div className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} />;

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="modal-head">
            <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
            {onClose && <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmText = 'Confirm', tone = 'primary', onConfirm, onCancel, busy, children }) {
  return (
    <Modal open={open} onClose={busy ? undefined : onCancel} size="sm" title={title}
      footer={<>
        <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className={`btn ${tone === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>{busy && <Spinner size={15} />}{confirmText}</button>
      </>}>
      <div className="confirm-icon"><AlertTriangle size={22} /></div>
      <p className="confirm-msg">{message}</p>
      {children}
    </Modal>
  );
}

export function StatCard({ icon: Icon, label, value, sub, tone = 'teal', onClick }) {
  return (
    <div className={`stat ${tone} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="stat-icon"><Icon size={20} /></div>
      <div className="stat-body"><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</div>
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, onChange }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="pager">
      <span>Showing {from}–{to} of {total}</span>
      <div>
        <button className="icon-btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
        <b>{page} / {pages}</b>
        <button className="icon-btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

export const EmptyState = ({ title, text, action }) => (
  <div className="empty"><Inbox size={30} /><h4>{title}</h4>{text && <p>{text}</p>}{action}</div>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs" role="tablist">
    {tabs.map((t) => (
      <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
        {t.label}{t.count !== undefined && <span>{t.count}</span>}
      </button>
    ))}
  </div>
);

export const Progress = ({ value, color }) => (
  <div className="progress"><div style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} /></div>
);

export function Gauge({ value, size = 168, label = 'Occupied' }) {
  const r = 54, c = 2 * Math.PI * r;
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} className="g-track" />
        <circle cx="70" cy="70" r={r} className="g-bar" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, value)) / 100} />
      </svg>
      <div><strong>{value}%</strong><span>{label}</span></div>
    </div>
  );
}

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      <span>{label}</span>
      {children}
      {error ? <em>{error}</em> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

const TOAST_ICON = { success: CheckCircle2, error: XCircle, info: Info };
export function Toasts({ toasts, dismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.type] || Info;
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <Icon size={19} /><p>{t.message}</p>
            <button className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}
