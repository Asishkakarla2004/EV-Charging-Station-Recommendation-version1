const express = require('express');
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.get('/users', auth, roleAuth(['admin']), (req, res) => {
  db.all(
    `SELECT
      u.*,
      COALESCE(u.is_blocked, 0) AS is_blocked,
      COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) AS managed_stations
     FROM users u
     LEFT JOIN stations s ON s.owner_id = CAST(u.id AS TEXT)
     GROUP BY u.id
     ORDER BY datetime(u.created_at) DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.put('/users/:id/block', auth, roleAuth(['admin']), (req, res) => {
  db.run(
    'UPDATE users SET is_blocked = 1 WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!this.changes) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ message: 'User blocked successfully' });
    }
  );
});

router.put('/users/:id/unblock', auth, roleAuth(['admin']), (req, res) => {
  db.run(
    'UPDATE users SET is_blocked = 0 WHERE id = ?',
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!this.changes) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ message: 'User unblocked successfully' });
    }
  );
});

router.delete('/users/:id', auth, roleAuth(['admin']), (req, res) => {
  db.get(
    `SELECT
      u.id,
      u.role,
      COUNT(CASE WHEN s.id IS NOT NULL THEN 1 END) AS managed_stations
     FROM users u
     LEFT JOIN stations s ON s.owner_id = CAST(u.id AS TEXT)
     WHERE u.id = ?
     GROUP BY u.id`,
    [req.params.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'station_owner' && user.managed_stations > 0) {
        return res.status(400).json({ error: 'Delete the owner stations first before removing this account' });
      }

      db.serialize(() => {
        db.run('DELETE FROM bookings WHERE user_id = CAST(? AS TEXT)', [req.params.id], (bookingErr) => {
          if (bookingErr) {
            return res.status(500).json({ error: bookingErr.message });
          }

          db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (deleteErr) {
            if (deleteErr) {
              return res.status(500).json({ error: deleteErr.message });
            }

            if (!this.changes) {
              return res.status(404).json({ error: 'User not found' });
            }

            return res.json({ message: 'User removed successfully' });
          });
        });
      });
    }
  );
});

router.get('/stations', auth, roleAuth(['admin']), (req, res) => {
  db.all(
    `SELECT
      s.*,
      u.name AS owner_name,
      COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS active_bookings,
      s.total_slots - COUNT(CASE WHEN b.status = 'active' THEN 1 END) AS available_slots
     FROM stations s
     LEFT JOIN users u ON s.owner_id = CAST(u.id AS TEXT)
     LEFT JOIN bookings b ON b.station_id = s.id
     GROUP BY s.id
     ORDER BY datetime(s.created_at) DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.get('/bookings', auth, roleAuth(['admin']), (req, res) => {
  db.all(
    `SELECT
      b.*,
      s.name AS station_name,
      u.name AS user_name
     FROM bookings b
     LEFT JOIN stations s ON s.id = b.station_id
     LEFT JOIN users u ON CAST(u.id AS TEXT) = b.user_id
     ORDER BY datetime(b.start_time) DESC`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(rows);
    }
  );
});

router.get('/summary', auth, roleAuth(['admin']), (req, res) => {
  db.get(
    `SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM users WHERE role = 'station_owner') AS totalOwners,
      (SELECT COUNT(*) FROM stations) AS totalStations,
      (SELECT COUNT(*) FROM bookings) AS totalBookings,
      (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'completed') AS totalRevenue,
      (SELECT COALESCE(SUM(total_slots), 0) FROM stations) AS totalSlots`,
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json(row);
    }
  );
});

module.exports = router;
