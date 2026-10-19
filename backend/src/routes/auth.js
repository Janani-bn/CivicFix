const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { loginRateLimit, signupRateLimit } = require('../middleware/authRateLimit');

// POST /api/auth/signup
router.post('/signup', signupRateLimit, authController.signup);

// POST /api/auth/login
router.post('/login', loginRateLimit, authController.login);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// POST /api/auth/location
router.post('/location', authenticate, authController.updateLocation);

module.exports = router;

