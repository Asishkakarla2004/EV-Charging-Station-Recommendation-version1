CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_verified BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  location_lat REAL NOT NULL,
  location_lng REAL NOT NULL,
  total_slots INTEGER NOT NULL,
  charging_speed REAL NOT NULL,
  price_per_hour REAL NOT NULL,
  emergency_price_percent REAL NOT NULL,
  owner_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_id INTEGER REFERENCES stations(id),
  slot_number INTEGER NOT NULL,
  type TEXT NOT NULL,
  is_available BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  station_id INTEGER REFERENCES stations(id),
  slot_id INTEGER REFERENCES slots(id),
  booking_type TEXT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  total_price REAL NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id),
  amount REAL NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, phone, password, role, is_verified)
SELECT 'Rahul Sharma', 'rahul.user@example.com', '9876543210', '$2a$10$Zp95SosEvNppaTHlg/Hc8ucZvg/AVWMzSjK8AThFI428A003dkNci', 'user', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rahul.user@example.com');

INSERT INTO users (name, email, phone, password, role, is_verified)
SELECT 'Aman Verma', 'aman.driver@example.com', '9988776655', '$2a$10$ChjxpFcJ1yv4nfXWJD1mZeZs6LUWri68.Zi/PACrB6oZed190IZCy', 'user', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'aman.driver@example.com');

INSERT INTO users (name, email, phone, password, role, is_verified)
SELECT 'Priya Station', 'priya.owner@example.com', '9123456780', '$2a$10$1c29tII8mHo/CHARGQIRbOx5dE.Gluok9DT2XUnmtwLKeD3jXch0y', 'station_owner', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'priya.owner@example.com');

INSERT INTO users (name, email, phone, password, role, is_verified)
SELECT 'Arjun Charge', 'arjun.owner@example.com', '9011223344', '$2a$10$RETr56OydFGQg1N8N1o9Cu1EkXCh1ujKrNCcPk9MGjJKFD3Xdzf5.', 'station_owner', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'arjun.owner@example.com');

INSERT INTO users (name, email, phone, password, role, is_verified)
SELECT 'Ather Grid Ops', 'ather.owner@example.com', '9000012345', '$2a$10$oHaXkFe/QEdkbgxqhPMRH.q9bDWuaofB39cUBBe5oQgvBofmuMDwq', 'station_owner', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'ather.owner@example.com');

UPDATE users
SET password = '$2a$10$oHaXkFe/QEdkbgxqhPMRH.q9bDWuaofB39cUBBe5oQgvBofmuMDwq'
WHERE email = 'ather.owner@example.com';

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Volt Black Koramangala', 12.9352, 77.6245, 12, 60, 5.8, 25, CAST((SELECT id FROM users WHERE email = 'priya.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Volt Black Koramangala');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Indiranagar Pulse Hub', 12.9784, 77.6408, 10, 90, 6.4, 25, CAST((SELECT id FROM users WHERE email = 'priya.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Indiranagar Pulse Hub');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Whitefield Rapid Yard', 12.9698, 77.7499, 14, 120, 7.4, 30, CAST((SELECT id FROM users WHERE email = 'priya.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Whitefield Rapid Yard');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Hebbal Orbit Station', 13.0395, 77.5970, 9, 75, 6.1, 20, CAST((SELECT id FROM users WHERE email = 'arjun.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Hebbal Orbit Station');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Electronic City Grid', 12.8399, 77.6770, 16, 100, 6.9, 30, CAST((SELECT id FROM users WHERE email = 'arjun.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Electronic City Grid');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'MG Road Charge Deck', 12.9756, 77.6050, 8, 50, 5.2, 18, CAST((SELECT id FROM users WHERE email = 'arjun.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'MG Road Charge Deck');

INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id)
SELECT 'Ather Grid Charging Station', 12.9751, 77.6063, 4, 120, 3.13, 22, CAST((SELECT id FROM users WHERE email = 'ather.owner@example.com') AS TEXT)
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Ather Grid Charging Station');

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station'),
  NULL,
  'normal',
  '2026-03-29 10:30:00',
  '2026-03-29 12:30:00',
  260,
  'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE user_id = CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT)
    AND station_id = (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station')
    AND start_time = '2026-03-29 10:30:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'aman.driver@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station'),
  NULL,
  'emergency',
  '2026-03-28 15:00:00',
  '2026-03-28 16:30:00',
  420,
  'completed'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE user_id = CAST((SELECT id FROM users WHERE email = 'aman.driver@example.com') AS TEXT)
    AND station_id = (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station')
    AND start_time = '2026-03-28 15:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station'),
  NULL,
  'normal',
  '2026-03-27 18:00:00',
  '2026-03-27 19:00:00',
  180,
  'completed'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE user_id = CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT)
    AND station_id = (SELECT id FROM stations WHERE name = 'Ather Grid Charging Station')
    AND start_time = '2026-03-27 18:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Volt Black Koramangala'),
  NULL,
  'normal',
  '2026-03-28 09:00:00',
  '2026-03-28 10:30:00',
  522,
  'completed'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE station_id = (SELECT id FROM stations WHERE name = 'Volt Black Koramangala')
    AND start_time = '2026-03-28 09:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'aman.driver@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Indiranagar Pulse Hub'),
  NULL,
  'emergency',
  '2026-03-27 14:00:00',
  '2026-03-27 15:00:00',
  664,
  'completed'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE station_id = (SELECT id FROM stations WHERE name = 'Indiranagar Pulse Hub')
    AND start_time = '2026-03-27 14:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'MG Road Charge Deck'),
  NULL,
  'normal',
  '2026-03-26 11:00:00',
  '2026-03-26 12:00:00',
  324,
  'completed'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE station_id = (SELECT id FROM stations WHERE name = 'MG Road Charge Deck')
    AND start_time = '2026-03-26 11:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'rahul.user@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Volt Black Koramangala'),
  NULL,
  'normal',
  '2026-03-29 18:00:00',
  '2026-03-29 19:30:00',
  522,
  'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE station_id = (SELECT id FROM stations WHERE name = 'Volt Black Koramangala')
    AND start_time = '2026-03-29 18:00:00'
);

INSERT INTO bookings (user_id, station_id, slot_id, booking_type, start_time, end_time, total_price, status)
SELECT
  CAST((SELECT id FROM users WHERE email = 'aman.driver@example.com') AS TEXT),
  (SELECT id FROM stations WHERE name = 'Indiranagar Pulse Hub'),
  NULL,
  'emergency',
  '2026-03-29 20:00:00',
  '2026-03-29 21:00:00',
  664,
  'active'
WHERE NOT EXISTS (
  SELECT 1
  FROM bookings
  WHERE station_id = (SELECT id FROM stations WHERE name = 'Indiranagar Pulse Hub')
    AND start_time = '2026-03-29 20:00:00'
);
