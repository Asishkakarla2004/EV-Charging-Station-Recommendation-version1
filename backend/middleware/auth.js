const jwt = require('jsonwebtoken');
const db = require('../db');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ev-demo-secret');

    if (decoded.id === 'admin') {
      req.user = {
        _id: 'admin',
        role: 'admin',
        name: 'Admin',
        email: 'admin@example.com',
      };
      return next();
    }

    db.get('SELECT id, name, email, phone, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = {
        _id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      };

      return next();
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const roleAuth = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

module.exports = { auth, roleAuth };
