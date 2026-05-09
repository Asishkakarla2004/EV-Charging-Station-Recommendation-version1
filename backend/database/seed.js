const mongoose = require('mongoose');
const db = require('../db');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const seedData = async () => {
  // Seed admin user
  const admin = new User({
    name: 'Admin',
    email: 'admin@example.com',
    phone: '1234567890',
    password: 'admin123',
    username: 'admin',
    role: 'admin',
    isVerified: true
  });
  await admin.save();

  // Seed stations
  const stations = [
    { name: 'Station A', lat: 40.7128, lng: -74.0060, slots: 10, speed: 50, price: 5, emergency_percent: 25, owner_id: admin._id.toString() },
    { name: 'Station B', lat: 34.0522, lng: -118.2437, slots: 8, speed: 75, price: 7, emergency_percent: 30, owner_id: admin._id.toString() },
    // Add more
  ];

  for (const station of stations) {
    db.run(
      'INSERT INTO stations (name, location_lat, location_lng, total_slots, charging_speed, price_per_hour, emergency_price_percent, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [station.name, station.lat, station.lng, station.slots, station.speed, station.price, station.emergency_percent, station.owner_id],
      function(err) {
        if (err) {
          console.error(err.message);
        }
      }
    );
  }

  console.log('Seed data inserted');
  process.exit();
};

seedData();