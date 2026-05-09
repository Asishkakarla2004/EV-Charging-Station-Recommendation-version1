const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, (req, res) => {
  res.json(req.user);
});

// Update user profile
router.put('/profile', auth, (req, res) => {
  // Dummy update
  res.json(req.user);
});

module.exports = router;