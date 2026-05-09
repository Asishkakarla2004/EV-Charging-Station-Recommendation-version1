export const BOOKINGS_UPDATED_EVENT = 'ev-bookings-updated';

export function notifyBookingsUpdated(detail = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(BOOKINGS_UPDATED_EVENT, { detail }));
}
