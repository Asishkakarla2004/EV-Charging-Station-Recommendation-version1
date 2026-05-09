import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Bookings from './pages/Bookings';
import History from './pages/History';
import StationOwnerDashboard from './pages/StationOwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/index.html" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/index.html/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<Navigate to="/dashboard/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="history" element={<History />} />
            </Route>
            <Route path="/index.html/dashboard/*" element={<Navigate to="/dashboard/home" replace />} />
            <Route path="/station-owner" element={<StationOwnerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
