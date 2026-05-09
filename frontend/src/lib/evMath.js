export const destinationCatalog = [
  { name: 'Kempegowda International Airport', lat: 13.1986, lng: 77.7066, region: 'North Bengaluru' },
  { name: 'Koramangala 5th Block', lat: 12.9352, lng: 77.6245, region: 'Central Bengaluru' },
  { name: 'Indiranagar Metro', lat: 12.9784, lng: 77.6408, region: 'East Bengaluru' },
  { name: 'Whitefield Tech Hub', lat: 12.9698, lng: 77.7499, region: 'East Bengaluru' },
  { name: 'Electronic City Phase 1', lat: 12.8399, lng: 77.677, region: 'South Bengaluru' },
  { name: 'MG Road', lat: 12.9756, lng: 77.605, region: 'Central Bengaluru' },
  { name: 'Hebbal Flyover', lat: 13.0395, lng: 77.597, region: 'North Bengaluru' },
];

export const fallbackSource = {
  name: 'Current Position',
  lat: 12.9716,
  lng: 77.5946,
};

export function haversineDistanceKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function interpolateRoute(source, destination, points = 24) {
  return Array.from({ length: points + 1 }, (_, index) => {
    const progress = index / points;
    const bend = Math.sin(progress * Math.PI) * 0.015;
    return {
      lat: source.lat + (destination.lat - source.lat) * progress + bend,
      lng: source.lng + (destination.lng - source.lng) * progress - bend * 0.65,
    };
  });
}

export function nearestPointDistanceKm(point, routePoints) {
  return routePoints.reduce((minDistance, routePoint) => {
    const distance = haversineDistanceKm(point, routePoint);
    return Math.min(minDistance, distance);
  }, Number.POSITIVE_INFINITY);
}

export function nearestRoutePointIndex(point, routePoints) {
  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  routePoints.forEach((routePoint, index) => {
    const distance = haversineDistanceKm(point, routePoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export function resolveDestination(searchTerm) {
  const query = searchTerm.trim().toLowerCase();
  return destinationCatalog.find(
    (destination) =>
      destination.name.toLowerCase() === query ||
      destination.name.toLowerCase().includes(query)
  );
}

export function deriveAvailability(station) {
  const reserved = (station.active_bookings ?? (station.id % 4) + 1);
  return Math.max((station.total_slots ?? 0) - reserved, 0);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round((amount || 0) * 83));
}

export function formatDateTime(value) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
}
