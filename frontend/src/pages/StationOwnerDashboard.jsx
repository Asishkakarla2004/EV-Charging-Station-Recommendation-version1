import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AppShell from '../components/AppShell';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { API_BASE } from '../lib/api';
import { BOOKINGS_UPDATED_EVENT } from '../lib/dashboardEvents';
import { formatCompactNumber, formatCurrency, formatDateTime } from '../lib/evMath';

const StationOwnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [stations, setStations] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [stationForm, setStationForm] = useState({
    name: '',
    location_lat: '',
    location_lng: '',
    total_slots: '',
    charging_speed: '',
    price_per_hour: '',
    emergency_price_percent: '',
  });
  const [stationMessage, setStationMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [stationsResponse, bookingsResponse] = await Promise.all([
          axios.get(`${API_BASE}/stations/my`, { headers }),
          axios.get(`${API_BASE}/bookings/owner`, { headers }),
        ]);
        setStations(stationsResponse.data);
        setOwnerBookings(bookingsResponse.data);
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

  const activeBookings = ownerBookings.filter((booking) => booking.status === 'active');
  const completedBookings = ownerBookings.filter((booking) => booking.status === 'completed');
  const revenue = completedBookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0);
  const usageRate = stations.length
    ? Math.round(
        (stations.reduce((sum, station) => sum + Number(station.active_bookings || 0), 0) /
          Math.max(stations.reduce((sum, station) => sum + Number(station.total_slots || 0), 0), 1)) *
          100
      )
    : 0;
  const revenueTrend = useMemo(() => {
    const grouped = completedBookings.reduce((accumulator, booking) => {
      const date = new Date(booking.end_time || booking.start_time);
      const key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      accumulator[key] = (accumulator[key] || 0) + Number(booking.total_price || 0);
      return accumulator;
    }, {});

    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [completedBookings]);

  const stationUtilization = useMemo(
    () =>
      stations.map((station) => ({
        label: station.name,
        active: Number(station.active_bookings || 0),
        total: Number(station.total_slots || 0),
        percent: station.total_slots
          ? Math.round((Number(station.active_bookings || 0) / Number(station.total_slots || 1)) * 100)
          : 0,
      })),
    [stations]
  );

  const handleStationInput = (field, value) => {
    setStationForm((current) => ({ ...current, [field]: value }));
  };

  const handleAddStation = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      setStationMessage('');
      await axios.post(
        `${API_BASE}/stations`,
        {
          ...stationForm,
          location_lat: Number(stationForm.location_lat),
          location_lng: Number(stationForm.location_lng),
          total_slots: Number(stationForm.total_slots),
          charging_speed: Number(stationForm.charging_speed),
          price_per_hour: Number(stationForm.price_per_hour),
          emergency_price_percent: Number(stationForm.emergency_price_percent),
        },
        { headers }
      );

      const refreshedStations = await axios.get(`${API_BASE}/stations/my`, { headers });
      setStations(refreshedStations.data);
      setStationForm({
        name: '',
        location_lat: '',
        location_lng: '',
        total_slots: '',
        charging_speed: '',
        price_per_hour: '',
        emergency_price_percent: '',
      });
      setStationMessage('Station added successfully.');
    } catch (error) {
      setStationMessage(error.response?.data?.error || 'Unable to add station.');
    }
  };

  const handleDeleteStation = async (stationId) => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      setStationMessage('');
      await axios.delete(`${API_BASE}/stations/${stationId}`, { headers });
      const [refreshedStations, refreshedBookings] = await Promise.all([
        axios.get(`${API_BASE}/stations/my`, { headers }),
        axios.get(`${API_BASE}/bookings/owner`, { headers }),
      ]);
      setStations(refreshedStations.data);
      setOwnerBookings(refreshedBookings.data);
      setStationMessage('Station deleted successfully.');
    } catch (error) {
      setStationMessage(error.response?.data?.error || 'Unable to delete station.');
    }
  };

  const renderContent = () => {
    if (activeTab === 'active') {
      return (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Active Bookings" value={activeBookings.length} hint="Live sessions across managed stations" />
            <StatCard label="Managed Stations" value={stations.length} hint="Published charging hubs" />
            <StatCard label="Usage Rate" value={`${usageRate}%`} hint="Slots occupied right now" />
          </section>
          <DataTable
            columns={[
              { key: 'station_name', label: 'Station' },
              { key: 'user_name', label: 'Customer' },
              { key: 'start_time', label: 'Start', render: (row) => formatDateTime(row.start_time) },
              { key: 'end_time', label: 'End', render: (row) => formatDateTime(row.end_time) },
              { key: 'booking_type', label: 'Mode', render: (row) => row.booking_type === 'emergency' ? 'Emergency' : 'Normal' },
              { key: 'total_price', label: 'Value', render: (row) => formatCurrency(row.total_price) },
            ]}
            rows={activeBookings}
            emptyMessage="No live bookings yet for your stations."
          />
        </div>
      );
    }

    if (activeTab === 'completed') {
      return (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Completed Sessions" value={completedBookings.length} hint="Finished charging sessions" />
            <StatCard label="Collected Revenue" value={formatCurrency(revenue)} hint="Completed-session earnings" />
            <StatCard label="Average Ticket" value={formatCurrency(revenue / Math.max(completedBookings.length, 1))} hint="Average completed booking value" />
          </section>
          <DataTable
            columns={[
              { key: 'station_name', label: 'Station' },
              { key: 'user_name', label: 'Customer' },
              { key: 'end_time', label: 'Finished', render: (row) => formatDateTime(row.end_time) },
              { key: 'booking_type', label: 'Type', render: (row) => row.booking_type === 'emergency' ? 'Emergency' : 'Normal' },
              { key: 'total_price', label: 'Revenue', render: (row) => formatCurrency(row.total_price) },
              { key: 'status', label: 'Status' },
            ]}
            rows={completedBookings}
            emptyMessage="Completed charging history will appear here."
          />
        </div>
      );
    }

    if (activeTab === 'manage') {
      return (
        <div className="space-y-6">
          <form onSubmit={handleAddStation} className="app-panel-muted grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Station Name</span>
              <input value={stationForm.name} onChange={(event) => handleStationInput('name', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Latitude</span>
              <input value={stationForm.location_lat} onChange={(event) => handleStationInput('location_lat', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Longitude</span>
              <input value={stationForm.location_lng} onChange={(event) => handleStationInput('location_lng', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Slots</span>
              <input value={stationForm.total_slots} onChange={(event) => handleStationInput('total_slots', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Charging Speed</span>
              <input value={stationForm.charging_speed} onChange={(event) => handleStationInput('charging_speed', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Price / Hour</span>
              <input value={stationForm.price_per_hour} onChange={(event) => handleStationInput('price_per_hour', event.target.value)} className="app-input" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-600 dark:text-gray-300">Emergency %</span>
              <input value={stationForm.emergency_price_percent} onChange={(event) => handleStationInput('emergency_price_percent', event.target.value)} className="app-input" required />
            </label>
            <div className="flex items-end">
              <button type="submit" className="app-button-primary w-full">Add Station</button>
            </div>
          </form>
          {stationMessage ? <p className="text-sm text-gray-500 dark:text-gray-400">{stationMessage}</p> : null}
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total Slots" value={formatCompactNumber(stations.reduce((sum, station) => sum + Number(station.total_slots || 0), 0))} hint="Across all stations" />
            <StatCard label="Fastest Charger" value={`${Math.max(...stations.map((station) => station.charging_speed || 0), 0)} kW`} hint="Highest supported speed" />
            <StatCard label="Emergency Margin" value={`${Math.max(...stations.map((station) => station.emergency_price_percent || 0), 0)}%`} hint="Top emergency uplift configured" />
          </section>
          <DataTable
            columns={[
              { key: 'name', label: 'Station' },
              { key: 'total_slots', label: 'Slots' },
              { key: 'available_slots', label: 'Available' },
              { key: 'charging_speed', label: 'Speed', render: (row) => `${row.charging_speed} kW` },
              { key: 'price_per_hour', label: 'Price', render: (row) => formatCurrency(row.price_per_hour) },
              { key: 'emergency_price_percent', label: 'Emergency', render: (row) => `+${row.emergency_price_percent}%` },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => handleDeleteStation(row.id)}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            rows={stations}
            emptyMessage="Add your first station to begin managing inventory."
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard label="Revenue" value={formatCurrency(revenue)} hint="Completed-session earnings" />
          <StatCard label="Bookings" value={ownerBookings.length} hint="All booking records" />
          <StatCard label="Active Load" value={`${usageRate}%`} hint="Live occupancy" />
          <StatCard label="Stations" value={stations.length} hint="Published charging points" />
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Revenue Trend</p>
            <h3 className="mt-3 text-xl font-semibold">Completed session revenue by day</h3>
            <div className="mt-6 rounded-[20px] border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex h-[190px] items-end gap-6 border-b border-dashed border-black/15 px-2 pb-4 dark:border-white/15">
                {(revenueTrend.length ? revenueTrend : [{ label: 'No Data', value: 0 }]).map((item) => {
                  const maxValue = Math.max(...(revenueTrend.length ? revenueTrend.map((entry) => entry.value) : [1]), 1);
                  const heightPercent = item.value ? Math.max((item.value / maxValue) * 100, 12) : 12;

                  return (
                    <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-3">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {item.value ? formatCurrency(item.value) : 'No data'}
                      </p>
                      <div
                        className="w-full max-w-[72px] rounded-t-[14px] bg-black transition-all dark:bg-white"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-6 px-2">
                {(revenueTrend.length ? revenueTrend : [{ label: 'No Data', value: 0 }]).map((item) => (
                  <div key={item.label} className="flex flex-1 justify-center">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="app-panel-muted p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Utilization</p>
            <h3 className="mt-3 text-xl font-semibold">Live load by station</h3>
            <div className="mt-6 space-y-4">
              {(stationUtilization.length ? stationUtilization : [{ label: 'No stations', active: 0, total: 0, percent: 0 }]).map((station) => (
                <div key={station.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <p className="font-medium">{station.label}</p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {station.active}/{station.total} slots
                    </p>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-black transition-all dark:bg-white"
                      style={{ width: `${Math.max(station.percent, station.total ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...stations]
            .sort((left, right) => Number(right.price_per_hour) - Number(left.price_per_hour))
            .slice(0, 4)
            .map((station) => (
              <div key={station.id} className="app-panel-muted p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Station Snapshot</p>
                <h3 className="mt-3 text-xl font-semibold">{station.name}</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-300">
                  <p>{station.total_slots} slots</p>
                  <p>{station.available_slots} currently open</p>
                  <p>{station.charging_speed} kW</p>
                  <p>{formatCurrency(station.price_per_hour)} / hr</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <AppShell
      badge="Station Owner Panel"
      title="Operate a premium charging network"
      subtitle="Monitor active sessions, optimize station performance, and keep revenue visibility high without leaving the control room."
      navItems={[
        { key: 'active', label: 'Active Bookings', description: 'Live sessions and queue pressure' },
        { key: 'completed', label: 'Completed Bookings', description: 'Past revenue and session history' },
        { key: 'manage', label: 'Manage Stations', description: 'Slots, speed, and pricing overview' },
        { key: 'analytics', label: 'Analytics', description: 'Performance across your network' },
      ]}
      activeKey={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-6">
        <section>
          <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
            {activeTab === 'active'
              ? 'Live Network'
              : activeTab === 'completed'
                ? 'Revenue Archive'
                : activeTab === 'manage'
                  ? 'Station Inventory'
                  : 'Analytics'}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            {activeTab === 'active'
              ? 'Active charging sessions'
              : activeTab === 'completed'
                ? 'Completed bookings and payouts'
                : activeTab === 'manage'
                  ? 'Managed stations and capacity'
                  : 'Business performance overview'}
          </h2>
        </section>
        {renderContent()}
      </div>
    </AppShell>
  );
};

export default StationOwnerDashboard;
