const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

function createBookingForStation({ req, res, station, stationId, slotId, bookingType, startTime, endTime }) {
  const pricePerHour = Number(station.price_per_hour || 0);
  const emergencyPercent = Number(station.emergency_price_percent || 0);
  const hours = Math.max((new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60), 0.5);
  const basePrice = pricePerHour * hours;
  const totalPrice =
    bookingType === 'emergency' ? basePrice * (1 + emergencyPercent / 100) : basePrice;

  db.run(
    `INSERT INTO bookings
     (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [String(req.user._id), stationId, slotId, bookingType, startTime, endTime, totalPrice, 'active'],
    function(insertErr) {
      if (insertErr) {
        return res.status(500).json({ error: insertErr.message });
      }

      db.get(
        `SELECT
           s.id,
           s.total_slots,
           COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS active_bookings,
           s.total_slots - COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS available_slots
         FROM stations s
         LEFT JOIN bookings b ON b.station_id = s.id
         WHERE s.id = ?
         GROUP BY s.id`,
        [stationId],
        (stationErr, stationSummary) => {
          if (stationErr) {
            return res.status(500).json({ error: stationErr.message });
          }

          return res.status(201).json({
            id: this.lastID,
            total_price: totalPrice,
            station_id: stationId,
            active_bookings: Number(stationSummary?.active_bookings || 0),
            available_slots: Number(stationSummary?.available_slots || 0),
          });
        }
      );
    }
  );
}

router.get('/my', auth, (req, res) => {
  db.all(
    `SELECT
      b.*,
      s.name AS station_name
     FROM bookings b
     LEFT JOIN stations s ON s.id = b.station_id
     WHERE b.user_id = ?
     ORDER BY datetime(b.start_time) DESC`,
    [String(req.user._id)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.get('/owner', auth, roleAuth(['station_owner']), (req, res) => {
  db.all(
    `SELECT
      b.*,
      s.name AS station_name,
      u.name AS user_name
     FROM bookings b
     INNER JOIN stations s ON s.id = b.station_id
     LEFT JOIN users u ON CAST(u.id AS TEXT) = b.user_id
     WHERE s.owner_id = ?
     ORDER BY datetime(b.start_time) DESC`,
    [String(req.user._id)],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.post('/', auth, roleAuth(['user']), (req, res) => {
  const {
    station_id,
    station_name,
    station_location_lat,
    station_location_lng,
    station_total_slots,
    station_charging_speed,
    station_price_per_hour,
    station_emergency_price_percent,
    slot_id,
    booking_type,
    start_time,
    end_time,
  } = req.body;

  if (String(station_id).startsWith('google-') || String(station_id).startsWith('ocm-')) {
    if ((station_name || '').toLowerCase().includes('ather grid charging station')) {
      return db.get(
        'SELECT * FROM stations WHERE name = ?',
        ['Ather Grid Charging Station'],
        (lookupErr, mappedStation) => {
          if (lookupErr) {
            return res.status(500).json({ error: lookupErr.message });
          }

          if (mappedStation) {
            return createBookingForStation({
              req,
              res,
              station: mappedStation,
              stationId: mappedStation.id,
              slotId: slot_id,
              bookingType: booking_type,
              startTime: start_time,
              endTime: end_time,
            });
          }

          return db.get(
            'SELECT id FROM users WHERE email = ?',
            ['ather.owner@example.com'],
            (ownerErr, owner) => {
              if (ownerErr) {
                return res.status(500).json({ error: ownerErr.message });
              }

              if (!owner) {
                return res.status(500).json({ error: 'Ather owner profile is missing' });
              }

              db.run(
                `INSERT INTO stations
                 (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  'Ather Grid Charging Station',
                  Number(station_location_lat || 12.9751),
                  Number(station_location_lng || 77.6063),
                  Number(station_total_slots || 4),
                  Number(station_charging_speed || 120),
                  Number(station_price_per_hour || 3.13),
                  Number(station_emergency_price_percent || 22),
                  String(owner.id),
                ],
                function(insertStationErr) {
                  if (insertStationErr) {
                    return res.status(500).json({ error: insertStationErr.message });
                  }

                  return createBookingForStation({
                    req,
                    res,
                    station: {
                      price_per_hour: station_price_per_hour || 3.13,
                      emergency_price_percent: station_emergency_price_percent || 22,
                    },
                    stationId: this.lastID,
                    slotId: slot_id,
                    bookingType: booking_type,
                    startTime: start_time,
                    endTime: end_time,
                  });
                }
              );
            }
          );
        }
      );
    }

    const demoBasePrice = booking_type === 'emergency' ? 8.5 : 6.5;
    return res.status(201).json({
      id: `demo-${Date.now()}`,
      total_price: demoBasePrice,
      station_id,
      active_bookings: 1,
      available_slots: Math.max(3 - 1, 0),
      message: 'Demo booking created for live-discovered station.',
    });
  }

  db.get('SELECT * FROM stations WHERE id = ?', [station_id], (err, station) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }

    return createBookingForStation({
      req,
      res,
      station,
      stationId: station_id,
      slotId: slot_id,
      bookingType: booking_type,
      startTime: start_time,
      endTime: end_time,
    });
  });
});

router.put('/:id/cancel', auth, (req, res) => {
  db.run(
    'UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?',
    ['cancelled', req.params.id, String(req.user._id)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      db.get(
        `SELECT
           s.id,
           s.total_slots,
           COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS active_bookings,
           s.total_slots - COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS available_slots
         FROM stations s
         LEFT JOIN bookings b ON b.station_id = s.id
         LEFT JOIN bookings target ON target.id = ?
         WHERE s.id = target.station_id
         GROUP BY s.id`,
        [req.params.id],
        (stationErr, stationSummary) => {
          if (stationErr) {
            return res.status(500).json({ error: stationErr.message });
          }

          return res.json({
            message: 'Booking cancelled',
            station_id: stationSummary?.id,
            active_bookings: Number(stationSummary?.active_bookings || 0),
            available_slots: Number(stationSummary?.available_slots || 0),
          });
        }
      );
    }
  );
});

router.put('/:id/complete', auth, (req, res) => {
  db.run(
    'UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?',
    ['completed', req.params.id, String(req.user._id)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      db.get(
        `SELECT
           s.id,
           s.total_slots,
           COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS active_bookings,
           s.total_slots - COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS available_slots
         FROM stations s
         LEFT JOIN bookings b ON b.station_id = s.id
         LEFT JOIN bookings target ON target.id = ?
         WHERE s.id = target.station_id
         GROUP BY s.id`,
        [req.params.id],
        (stationErr, stationSummary) => {
          if (stationErr) {
            return res.status(500).json({ error: stationErr.message });
          }

          return res.json({
            message: 'Booking completed',
            station_id: stationSummary?.id,
            active_bookings: Number(stationSummary?.active_bookings || 0),
            available_slots: Number(stationSummary?.available_slots || 0),
          });
        }
      );
    }
  );
});

module.exports = router;
