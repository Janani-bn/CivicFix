const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX
} = require('../utils/authLimits');

// Throttle credential endpoints so password guessing cannot run unbounded.
// Each method + path gets its own bucket, keyed on the client IP.
const authRateLimiter = createRateLimiter({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
    max: AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts. Please try again later.'
});

// POST /api/auth/signup
router.post('/signup', authRateLimiter.middleware, authController.signup);

// POST /api/auth/login
router.post('/login', authRateLimiter.middleware, authController.login);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// POST /api/auth/location
router.post('/location', authenticate, authController.updateLocation);

module.exports = router;
