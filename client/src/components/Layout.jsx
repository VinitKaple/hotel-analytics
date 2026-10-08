import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, BarChart3, BedDouble, Bell, BookOpenCheck, CalendarCheck, ChevronLeft, ChevronRight, FileText, Hotel, LayoutDashboard,
  Settings as SettingsIcon, Sparkles, Users, UserCog, Building2, SlidersHorizontal,
} from 'lucide-react';
import { useHotel } from '../context/HotelContext';
import { ConfirmDialog, Toasts } from './ui';
import { roomsLabel, timeAgo } from '../utils';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/guests', label: 'Guests', icon: Users },
  { to: '/analytics', label: 'Occupancy Analytics', icon: BarChart3 },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { to: '/check-in-out', label: 'Check-In / Check-Out', icon: ArrowLeftRight },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];
const TITLES = { '/': 'Dashboard', '/bookings': 'Bookings', '/bookings/new': 'New Booking', '/rooms': 'Rooms', '/guests': 'Guests', '/analytics': 'Occupancy Analytics', '/assistant': 'AI Assistant', '/check-in-out': 'Check-In / Check-Out', '/reports': 'Reports', '/settings': 'Settings' };

function CheckoutDialog() {
  const { checkoutTarget, closeCheckout, confirmCheckout, settings } = useHotel();
  const [roomStatus, setRoomStatus] = useState('Available');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (checkoutTarget) setRoomStatus(settings?.cleaningAfterCheckout ? 'Cleaning' : 'Available'); }, [checkoutTarget, settings]);
  if (!checkoutTarget) return null;
  const g = checkoutTarget;
  return (
    <ConfirmDialog open title="Confirm check-out" confirmText="Check out" busy={busy}
      message={<>Check out <b>{g.name}</b> from Room <b>{roomsLabel(g)}</b>? The room will be released and occupancy will update.</>}
      onCancel={closeCheckout}
      onConfirm={async () => { setBusy(true); await confirmCheckout(g, roomStatus); setBusy(false); }}>
      <label className="field" style={{ marginTop: 14 }}>
        <span>Room status after check-out</span>
        <select value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)}>
          <option value="Available">Available — ready to book</option>
          <option value="Cleaning">Cleaning — housekeeping needed</option>
        </select>
      </label>
    </ConfirmDialog>
  );
}

export default function Layout() {
  const { settings, unread, notifications, markAllRead, toasts, dismiss } = useHotel();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1100);
  const [bell, setBell] = useState(false);
  const [profile, setProfile] = useState(false);
  const bellRef = useRef(null);
  const profRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBell(false);
      if (profRef.current && !profRef.current.contains(e.target)) setProfile(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  useEffect(() => { setBell(false); setProfile(false); }, [pathname]);

  const go = (to) => { setProfile(false); navigate(to); };

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo"><Hotel size={20} /></div>
          <div className="brand-text"><b>{settings?.hotelName || 'Grand Aurelia'}</b><small>Hotel operations</small></div>
        </div>
        <nav>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} title={label} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={19} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-foot" ref={profRef}>
          {profile && (
            <div className="profile-menu">
              <button onClick={() => go('/rooms')}><BedDouble size={16} />Manage Rooms</button>
              <button onClick={() => go('/guests')}><Users size={16} />Manage Guests</button>
              <button onClick={() => go('/bookings')}><BookOpenCheck size={16} />Manage Bookings</button>
              <button onClick={() => go('/settings')}><Building2 size={16} />Manage Hotel Information</button>
              <button onClick={() => { setProfile(false); setBell(true); }}><Bell size={16} />Notifications</button>
              <button onClick={() => go('/settings')}><SlidersHorizontal size={16} />System Preferences</button>
            </div>
          )}
          <button className="profile" onClick={() => setProfile((p) => !p)}>
            <div className="avatar"><UserCog size={18} /></div>
            <div className="profile-text"><b>Hotel Administrator</b><small>Administrator</small></div>
          </button>
          <button className="collapse" onClick={() => setCollapsed((c) => !c)} aria-label="Collapse sidebar">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}<span>Collapse</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{TITLES[pathname] || 'Hotel'}</h1>
          <div className="top-actions">
            <button className="btn primary sm" onClick={() => navigate('/bookings/new')}>New booking</button>
            <div className="bell-wrap" ref={bellRef}>
              <button className="icon-btn bell" onClick={() => setBell((b) => !b)} aria-label="Notifications">
                <Bell size={19} />{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}
              </button>
              {bell && (
                <div className="notif-panel">
                  <div className="notif-head"><b>Notifications</b><button className="link" onClick={markAllRead}>Mark all read</button></div>
                  <div className="notif-list">
                    {notifications.length === 0 && <p className="muted pad">You're all caught up.</p>}
                    {notifications.map((n) => (
                      <div key={n.key} className={`notif ${n.type}`}>
                        <i />
                        <div><b>{n.title}</b><p>{n.text}</p>{n.time && <small>{timeAgo(n.time)}</small>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="page" key={pathname}><Outlet /></main>
      </div>
      <CheckoutDialog />
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
