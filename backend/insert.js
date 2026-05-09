const db = require('./db');

db.run(
  'INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ['Station A', 40.7128, -74.0060, 10, 50, 5, 25, 'admin'],
  function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Station inserted');
    }
  }
);

db.run(
  'INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ['Station B', 34.0522, -118.2437, 8, 75, 7, 30, 'admin'],
  function(err) {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Station inserted');
    }
  }
);