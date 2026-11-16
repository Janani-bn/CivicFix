const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

/**
 * Require authentication.
 * Expects: Authorization: Bearer <token>
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            error: { message: 'Unauthorized' }
        });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        req.user = { id: payload.userId, email: payload.email };
        return next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: { message: 'Unauthorized' }
        });
    }
};

/**
 * Optional authentication.
 * If token is provided and valid, req.user will be set.
 */
const authenticateOptional = (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        req.user = { id: payload.userId, email: payload.email };
        return next();
    } catch (err) {
        req.user = null;
        return next();
    }
};

const User = require('../models/User');

/**
 * Require volunteer role.
 * User must be authenticated and have stored role 'volunteer' or 'admin'.
 */
const requireVolunteer = async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            error: { message: 'Unauthorized' }
        });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user || (user.role !== 'volunteer' && user.role !== 'admin')) {
            return res.status(403).json({
                success: false,
                error: { message: 'Forbidden: Volunteer access required' }
            });
        }
        req.dbUser = user;
        req.userRole = user.role;
        return next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { message: 'Server error checking user permissions' }
        });
    }
};

/**
 * Require admin role.
 * User must be authenticated and have the stored role 'admin'. The designated
 * admin gets that role at signup or login, but only after the configured
 * password has been checked, so a matching name and email alone is not enough.
 */
const requireAdmin = async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            error: { message: 'Unauthorized' }
        });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: 'Forbidden: Admin access required' }
            });
        }

        req.dbUser = user;
        req.userRole = 'admin';
        return next();
    } catch (err) {
        return res.status(500).json({
            success: false,
            error: { message: 'Server error checking user permissions' }
        });
    }
};

module.exports = { authenticate, authenticateOptional, requireVolunteer, requireAdmin };

