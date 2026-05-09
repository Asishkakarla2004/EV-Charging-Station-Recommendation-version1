import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AppShell from '../components/AppShell';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { API_BASE } from '../lib/api';
import { BOOKINGS_UPDATED_EVENT } from '../lib/dashboardEvents';
import { formatCompactNumber, formatCurrency, formatDateTime } from '../lib/evMath';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [stations, setStations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [busyUserId, setBusyUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [usersResponse, stationsResponse, bookingsResponse, summaryResponse] = await Promise.all([
          axios.get(`${API_BASE}/admin/users`, { headers }),
          axios.get(`${API_BASE}/admin/stations`, { headers }),
          axios.get(`${API_BASE}/admin/bookings`, { headers }),
          axios.get(`${API_BASE}/admin/summary`, { headers }),
        ]);

        setUsers(usersResponse.data);
        setStations(stationsResponse.data);
        setBookings(bookingsResponse.data);
        setSummary(summaryResponse.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();

    window.addEventListener(BOOKINGS_UPDATED_EVENT, fetchData);
    window.addEventListener('focus', fetchData);
    const intervalId = window.setInterval(fetchData, 15000);

    return () => {
      window.removeEventListener(BOOKINGS_UPDATED_EVENT, fetchData);
      window.removeEventListener('focus', fetchData);
      window.clearInterval(intervalId);
    };
  }, []);

  const ownerCount = useMemo(() => users.filter((user) => user.role === 'station_owner').length, [users]);

  const handleUserAction = async (user, action) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const isDelete = action === 'delete';
    const endpoint =
      action === 'block'
        ? `${API_BASE}/admin/users/${user.id}/block`
        : action === 'unblock'
          ? `${API_BASE}/admin/users/${user.id}/unblock`
          : `${API_BASE}/admin/users/${user.id}`;

    setBusyUserId(`${action}-${user.id}`);
    setAdminMessage('');

    try {
      if (isDelete) {
        await axios.delete(endpoint, { headers });
      } else {
        await axios.put(endpoint, {}, { headers });
      }

      setUsers((current) =>
        isDelete
          ? current.filter((entry) => entry.id !== user.id)
          : current.map((entry) =>
              entry.id === user.id
                ? { ...entry, is_blocked: action === 'block' ? 1 : 0 }
                : entry
            )
      );
      setAdminMessage(
        isDelete
          ? `${user.name} removed successfully.`
          : `${user.name} ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`
      );
    } catch (error) {
      setAdminMessage(error.response?.data?.error || error.response?.data?.message || 'Unable to update user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const renderContent = () => {
    if (activeTab === 'users') {
      return (
        <div className="space-y-4">
          {adminMessage ? (
            <div className="app-panel-muted px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
              {adminMessage}
            </div>
          ) : null}
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              {
                key: 'role',
                label: 'Role',
                render: (row) => row.role === 'station_owner' ? 'Station Owner' : 'EV User',
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => (
                  <span className={row.is_blocked ? 'font-semibold text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                    {row.is_blocked ? 'Blocked' : 'Active'}
                  </span>
                ),
              },
              { key: 'created_at', label: 'Joined', render: (row) => formatDateTime(row.created_at) },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className="flex min-w-[220px] flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyUserId === `${row.is_blocked ? 'unblock' : 'block'}-${row.id}`}
                      onClick={() => handleUserAction(row, row.is_blocked ? 'unblock' : 'block')}
                      className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-700 transition hover:border-black hover:text-black disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:border-white dark:hover:text-white"
                    >
                      {busyUserId === `${row.is_blocked ? 'unblock' : 'block'}-${row.id}`
                        ? 'Saving...'
                        : row.is_blocked
                          ? 'Unblock'
                          : 'Block'}
                    </button>
                    <button
                      type="button"
                      disabled={busyUserId === `delete-${row.id}`}
                      onClick={() => handleUserAction(row, 'delete')}
                      className="rounded-full border border-black/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gray-700 transition hover:border-black hover:text-black disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:border-white dark:hover:text-white"
                    >
                      {busyUserId === `delete-${row.id}` ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                ),
              },
            ]}
            rows={users}
            emptyMessage="Registered users will appear here."
          />
        </div>
      );
    }

    if (activeTab === 'owners') {
      return (
        <DataTable
          columns={[
            { key: 'name', label: 'Owner' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'managed_stations', label: 'Stations' },
            { key: 'role', label: 'Role' },
          ]}
          rows={users.filter((user) => user.role === 'station_owner')}
          emptyMessage="Station owners will appear here."
        />
      );
    }

    if (activeTab === 'stations') {
      return (
        <DataTable
          columns={[
            { key: 'name', label: 'Station' },
            { key: 'owner_name', label: 'Owner' },
            { key: 'total_slots', label: 'Slots' },
            { key: 'available_slots', label: 'Available' },
            { key: 'charging_speed', label: 'Speed', render: (row) => `${row.charging_speed} kW` },
            { key: 'price_per_hour', label: 'Price', render: (row) => formatCurrency(row.price_per_hour) },
          ]}
          rows={stations}
          emptyMessage="Stations will appear here."
        />
      );
    }

    if (activeTab === 'bookings') {
      return (
        <DataTable
          columns={[
            { key: 'station_name', label: 'Station' },
            { key: 'user_name', label: 'Customer' },
            { key: 'booking_type', label: 'Mode', render: (row) => row.booking_type === 'emergency' ? 'Emergency' : 'Normal' },
            { key: 'start_time', label: 'Start', render: (row) => formatDateTime(row.start_time) },
            { key: 'end_time', label: 'End', render: (row) => formatDateTime(row.end_time) },
            { key: 'status', label: 'Status' },
          ]}
          rows={bookings}
          emptyMessage="Bookings will appear here."
        />
      );
    }

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel-muted p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Platform Revenue</p>
          <h3 className="mt-3 text-3xl font-semibold">{formatCurrency(summary?.totalRevenue || 0)}</h3>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Based on completed charging sessions across the platform.
          </p>
        </div>
        <div className="app-panel-muted p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Network Coverage</p>
          <h3 className="mt-3 text-3xl font-semibold">{formatCompactNumber(summary?.totalSlots || 0)} slots</h3>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Published inventory across all active stations.
          </p>
        </div>
        <div className="app-panel-muted p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Station Owners</p>
          <h3 className="mt-3 text-3xl font-semibold">{ownerCount}</h3>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Owner accounts with managed charging stations.
          </p>
        </div>
        <div className="app-panel-muted p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Bookings Tracked</p>
          <h3 className="mt-3 text-3xl font-semibold">{formatCompactNumber(bookings.length)}</h3>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Combined active, completed, and cancelled sessions.
          </p>
        </div>
      </div>
    );
  };

  return (
    <AppShell
      badge="Super Admin"
      title="Platform command center"
      subtitle="Review customer growth, station capacity, and booking operations from one disciplined monochrome dashboard."
      navItems={[
        { key: 'users', label: 'Manage Users', description: 'Registered EV drivers across the platform' },
        { key: 'owners', label: 'Manage Owners', description: 'Station-owner accounts and coverage' },
        { key: 'stations', label: 'View Stations', description: 'All charging infrastructure' },
        { key: 'bookings', label: 'View Bookings', description: 'Platform-wide charging sessions' },
        { key: 'analytics', label: 'Platform Analytics', description: 'Revenue, capacity, and growth' },
      ]}
      activeKey={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Users" value={users.length} hint="All registered accounts" />
          <StatCard label="Owners" value={ownerCount} hint="Station operator accounts" />
          <StatCard label="Stations" value={stations.length} hint="Published charging locations" />
          <StatCard label="Revenue" value={formatCurrency(summary?.totalRevenue || 0)} hint="Completed-session revenue" />
        </section>
        <section>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Admin View</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {activeTab === 'users'
              ? 'Customer directory'
              : activeTab === 'owners'
                ? 'Station owner management'
                : activeTab === 'stations'
                  ? 'Infrastructure overview'
                  : activeTab === 'bookings'
                    ? 'Booking operations'
                    : 'Platform-wide analytics'}
          </h2>
        </section>
        {renderContent()}
      </div>
    </AppShell>
  );
};

export default AdminDashboard;
