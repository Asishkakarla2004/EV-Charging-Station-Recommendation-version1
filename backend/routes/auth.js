const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../db');

const router = express.Router();

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('phone').notEmpty(),
  body('role').optional().isIn(['user', 'station_owner']),
  body('password').isLength({ min: 6 }),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, phone, password, role = 'user' } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    db.run(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, hashedPassword, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed: users.email')) {
            return res.status(400).json({ error: 'Email is already registered' });
          }
          return res.status(500).json({ error: err.message });
        }

        return res.status(201).json({
          message: 'User registered successfully. You can log in now.',
          user: {
            id: this.lastID,
            name,
            email,
            phone,
            role
          }
        });
      }
    );
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  // For demo, just return success
  res.json({ message: 'Email verified successfully' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  const jwtSecret = process.env.JWT_SECRET || 'ev-demo-secret';

  if (email === 'admin@example.com' && password === 'admin123') {
    const token = jwt.sign({ id: 'admin', role: 'admin' }, jwtSecret, { expiresIn: '1d' });
    return res.json({ token, user: { id: 'admin', name: 'Admin', email: 'admin@example.com', role: 'admin' } });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'This account has been blocked by the admin team' });
    }

    if (role && user.role !== role) {
      return res.status(401).json({ error: `This account is registered as ${user.role === 'station_owner' ? 'Station Owner' : 'EV User'}` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '1d' });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  });
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  // For demo, just return success
  res.json({ message: 'OTP sent to your email' });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  // For demo, just return success
  res.json({ message: 'Password reset successfully' });
});

module.exports = router;
