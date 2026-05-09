import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DataTable from '../components/DataTable';
import StatCard from '../components/StatCard';
import { API_BASE } from '../lib/api';
import { BOOKINGS_UPDATED_EVENT, notifyBookingsUpdated } from '../lib/dashboardEvents';
import { formatCurrency, formatDateTime } from '../lib/evMath';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_BASE}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const localBookings = JSON.parse(localStorage.getItem('localRouteBookings') || '[]');
        const merged = [...localBookings, ...response.data.filter((booking) => !String(booking.id).startsWith('demo-'))];
        setBookings(merged);
      } catch (error) {
        console.error(error);
      }
    };

    fetchBookings();

    const handleBookingsUpdated = () => {
      fetchBookings();
    };

    window.addEventListener(BOOKINGS_UPDATED_EVENT, handleBookingsUpdated);
    window.addEventListener('focus', fetchBookings);
    const intervalId = window.setInterval(fetchBookings, 15000);

    return () => {
      window.removeEventListener(BOOKINGS_UPDATED_EVENT, handleBookingsUpdated);
      window.removeEventListener('focus', fetchBookings);
      window.clearInterval(intervalId);
    };
  }, []);

  const liveBookings = useMemo(
    () => bookings.filter((booking) => ['active', 'upcoming'].includes(booking.status)),
    [bookings]
  );

  const handleCancel = async (id) => {
    const isLocalBooking = String(id).startsWith('demo-');

    try {
      if (!isLocalBooking) {
        const token = localStorage.getItem('token');
        await axios.put(
          `${API_BASE}/bookings/${id}/cancel`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
      setBookings((current) =>
        current.map((booking) => (booking.id === id ? { ...booking, status: 'cancelled' } : booking))
      );
      const localBookings = JSON.parse(localStorage.getItem('localRouteBookings') || '[]').map((booking) =>
        booking.id === id ? { ...booking, status: 'cancelled' } : booking
      );
      localStorage.setItem('localRouteBookings', JSON.stringify(localBookings));
      notifyBookingsUpdated({ bookingId: id, status: 'cancelled' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleComplete = async (id) => {
    const isLocalBooking = String(id).startsWith('demo-');

    try {
      if (!isLocalBooking) {
        const token = localStorage.getItem('token');
        await axios.put(
          `${API_BASE}/bookings/${id}/complete`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      setBookings((current) =>
        current.map((booking) => (booking.id === id ? { ...booking, status: 'completed' } : booking))
      );
      const localBookings = JSON.parse(localStorage.getItem('localRouteBookings') || '[]').map((booking) =>
        booking.id === id ? { ...booking, status: 'completed' } : booking
      );
      localStorage.setItem('localRouteBookings', JSON.stringify(localBookings));
      notifyBookingsUpdated({ bookingId: id, status: 'completed' });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">Bookings</p>
        <h2 className="text-3xl font-semibold tracking-tight">Upcoming and active charging sessions</h2>
        <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
          Review reservation timing, spend, and status from one place. Live sessions can be cancelled instantly.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Live Sessions" value={liveBookings.length} hint="Bookings currently planned or in progress" />
        <StatCard
          label="Emergency Sessions"
          value={bookings.filter((booking) => booking.booking_type === 'emergency').length}
          hint="Priority bookings across your account"
        />
        <StatCard
          label="Committed Spend"
          value={formatCurrency(
            liveBookings.reduce((sum, booking) => sum + Number(booking.total_price || 0), 0)
          )}
          hint="Estimated value of active reservations"
        />
      </section>

      <DataTable
        columns={[
          { key: 'station_name', label: 'Station', render: (row) => row.station_name || `Station #${row.station_id}` },
          { key: 'booking_type', label: 'Type', render: (row) => row.booking_type === 'emergency' ? 'Emergency' : 'Normal' },
          { key: 'start_time', label: 'Start', render: (row) => formatDateTime(row.start_time) },
          { key: 'end_time', label: 'End', render: (row) => formatDateTime(row.end_time) },
          { key: 'total_price', label: 'Price', render: (row) => formatCurrency(row.total_price) },
          { key: 'status', label: 'Status', render: (row) => row.status },
          {
            key: 'actions',
            label: 'Action',
            render: (row) =>
              row.status === 'cancelled' || row.status === 'completed' ? (
                <span className="text-gray-400">Closed</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleCancel(row.id)}
                    className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleComplete(row.id)}
                    className="rounded-xl border border-black/10 bg-black px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:opacity-90 dark:border-white dark:bg-white dark:text-black"
                  >
                    Complete
                  </button>
                </div>
              ),
          },
        ]}
        rows={bookings}
        emptyMessage="Your bookings will appear here once you reserve a charging slot."
      />
    </div>
  );
};

export default Bookings;
