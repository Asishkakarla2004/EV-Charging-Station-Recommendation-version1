import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { API_BASE } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/evMath';

const History = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const localBookings = JSON.parse(localStorage.getItem('localRouteBookings') || '[]');
        setHistory(
          [...localBookings, ...response.data].filter(
            (booking) => booking.status === 'completed' || booking.status === 'cancelled'
          )
        );
      } catch (error) {
        console.error(error);
      }
    };

    fetchHistory();
  }, []);

  const totalSpend = useMemo(
    () =>
      history
        .filter((booking) => booking.status === 'completed')
        .reduce((sum, booking) => sum + Number(booking.total_price || 0), 0),
    [history]
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">History</p>
        <h2 className="text-3xl font-semibold tracking-tight">Completed sessions and charging spend</h2>
        <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
          Track every finished charge, compare booking types, and keep a clean record of route-side decisions.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Completed Sessions" value={history.filter((item) => item.status === 'completed').length} hint="Closed charging sessions" />
        <StatCard label="Cancelled Sessions" value={history.filter((item) => item.status === 'cancelled').length} hint="Bookings you opted out of" />
        <StatCard label="Historical Spend" value={formatCurrency(totalSpend)} hint="Completed-session spend in INR" />
      </section>

      <DataTable
        columns={[
          { key: 'station_name', label: 'Station', render: (row) => row.station_name || `Station #${row.station_id}` },
          { key: 'start_time', label: 'Started', render: (row) => formatDateTime(row.start_time) },
          { key: 'end_time', label: 'Finished', render: (row) => formatDateTime(row.end_time) },
          { key: 'booking_type', label: 'Type', render: (row) => row.booking_type === 'emergency' ? 'Emergency' : 'Normal' },
          { key: 'total_price', label: 'Price', render: (row) => formatCurrency(row.total_price) },
          { key: 'status', label: 'Status' },
        ]}
        rows={history}
        emptyMessage="Completed and cancelled sessions will show up here."
      />
    </div>
  );
};

export default History;
