import { Outlet } from 'react-router-dom';
import AppShell from '../components/AppShell';

const Dashboard = () => {
  return (
    <AppShell
      badge="EV User Workspace"
      title="Drive with confidence"
      subtitle="Plan routes, compare charging stops, and manage every booking in one focused control center."
      navItems={[
        { key: 'home', label: 'Home', description: 'Map, route planning, and charging recommendations', to: '/dashboard/home' },
        { key: 'bookings', label: 'Bookings', description: 'Upcoming and live charging reservations', to: '/dashboard/bookings' },
        { key: 'history', label: 'History', description: 'Completed sessions and spend history', to: '/dashboard/history' },
      ]}
    >
      <div className="space-y-6">
        <Outlet />
      </div>
    </AppShell>
  );
};

export default Dashboard;
