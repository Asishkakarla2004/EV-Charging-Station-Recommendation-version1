const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

const stationSelect = `
  SELECT
    s.*,
    u.name AS owner_name,
    COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS active_bookings,
    s.total_slots - COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS available_slots
  FROM stations s
  LEFT JOIN users u ON CAST(u.id AS TEXT) = s.owner_id
  LEFT JOIN bookings b ON b.station_id = s.id
`;

router.get('/', (req, res) => {
  db.all(
    `${stationSelect}
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.post('/', auth, roleAuth(['station_owner']), (req, res) => {
  const {
    name,
    location_lat,
    location_lng,
    total_slots,
    charging_speed,
    price_per_hour,
    emergency_price_percent,
  } = req.body;

  db.run(
    `INSERT INTO stations
     (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, String(req.user._id)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.status(201).json({ id: this.lastID });
    }
  );
});

router.delete('/:id', auth, roleAuth(['station_owner']), (req, res) => {
  db.run(
    'DELETE FROM bookings WHERE station_id = ?',
    [req.params.id],
    (bookingErr) => {
      if (bookingErr) {
        return res.status(500).json({ error: bookingErr.message });
      }

      db.run(
        'DELETE FROM stations WHERE id = ? AND owner_id = ?',
        [req.params.id, String(req.user._id)],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          if (this.changes === 0) {
            return res.status(404).json({ error: 'Station not found' });
          }
          return res.json({ message: 'Station deleted' });
        }
      );
    }
  );
});

router.get('/my', auth, roleAuth(['station_owner']), (req, res) => {
  db.all(
    `${stationSelect}
     WHERE s.owner_id = ?
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    [String(req.user._id)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

module.exports = router;
