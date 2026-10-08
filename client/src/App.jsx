import { Navigate, Route, Routes } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { useHotel } from './context/HotelContext';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import BookingForm from './pages/BookingForm';
import Rooms from './pages/Rooms';
import Guests from './pages/Guests';
import Analytics from './pages/Analytics';
import Assistant from './pages/Assistant';
import CheckInOut from './pages/CheckInOut';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function App() {
  const { error, loading, rooms, refresh } = useHotel();
  if (error && !rooms.length) {
    return (
      <div className="fatal">
        <div className="fatal-card">
          <AlertTriangle size={34} />
          <h2>We couldn't load the hotel data</h2>
          <p>{error}</p>
          <small>Check that the backend is running on port 5000 and that MongoDB is connected, then try again.</small>
          <button className="btn primary" onClick={() => { refresh(); }}>{loading ? <Spinner size={16} /> : <RefreshCw size={16} />}Try again</button>
        </div>
      </div>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/new" element={<BookingForm />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="guests" element={<Guests />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="check-in-out" element={<CheckInOut />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
