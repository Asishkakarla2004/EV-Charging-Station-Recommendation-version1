const express = require('express');

const router = express.Router();

const haversineDistanceKm = (a, b) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

router.post('/route', async (req, res) => {
  const routePoints = Array.isArray(req.body?.routePoints) ? req.body.routePoints : [];

  if (routePoints.length < 2) {
    return res.status(400).json({ error: 'At least two route points are required.' });
  }

  const normalizedPoints = routePoints
    .map((point) => ({
      lat: Number(point.lat),
      lng: Number(point.lng),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (normalizedPoints.length < 2) {
    return res.status(400).json({ error: 'Route points are invalid.' });
  }

  const center = normalizedPoints.reduce(
    (accumulator, point) => ({
      lat: accumulator.lat + point.lat / normalizedPoints.length,
      lng: accumulator.lng + point.lng / normalizedPoints.length,
    }),
    { lat: 0, lng: 0 }
  );

  const radiusKm = Math.min(
    Math.max(
      ...normalizedPoints.map((point) => haversineDistanceKm(center, point)),
      8
    ) + 10,
    80
  );

  const params = new URLSearchParams({
    output: 'json',
    latitude: String(center.lat),
    longitude: String(center.lng),
    distance: String(Math.ceil(radiusKm)),
    distanceunit: 'KM',
    maxresults: '100',
    compact: 'true',
    verbose: 'false',
  });

  const headers = {
    'X-API-Referer': 'EV Smart Charging Platform',
    'User-Agent': 'EV-Smart-Charging-Platform/1.0',
  };

  if (process.env.OPENCHARGEMAP_API_KEY) {
    headers['X-API-Key'] = process.env.OPENCHARGEMAP_API_KEY;
  }

  try {
    const response = await fetch(`https://api.openchargemap.io/v3/poi?${params.toString()}`, {
      headers,
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch live charging station data.' });
    }

    const data = await response.json();
    const stations = (Array.isArray(data) ? data : []).map((item) => ({
      id: `ocm-${item.ID}`,
      source: 'internet',
      name: item.AddressInfo?.Title || 'EV Charging Station',
      address: [
        item.AddressInfo?.AddressLine1,
        item.AddressInfo?.Town,
        item.AddressInfo?.StateOrProvince,
        item.AddressInfo?.Postcode,
      ]
        .filter(Boolean)
        .join(', '),
      location_lat: item.AddressInfo?.Latitude,
      location_lng: item.AddressInfo?.Longitude,
      total_slots: item.NumberOfPoints || item.Connections?.length || 0,
      available_slots: item.StatusType?.IsOperational ? item.NumberOfPoints || item.Connections?.length || 0 : 0,
      charging_speed: Math.max(
        ...(item.Connections || []).map((connection) => Number(connection.PowerKW || 0)),
        0
      ),
      price_per_hour: 0,
      emergency_price_percent: 0,
      status_text: item.StatusType?.Title || 'Unknown',
      usage_cost: item.UsageCost || 'Check operator details',
      operator_name: item.OperatorInfo?.Title || 'Unknown operator',
    }));

    return res.json({
      source: 'Open Charge Map',
      count: stations.length,
      stations,
    });
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach the live station provider.' });
  }
});

module.exports = router;
