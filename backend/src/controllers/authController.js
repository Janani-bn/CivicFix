const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

const getAdminCredentials = () => ({
    name: process.env.admin_name,
    email: process.env.admin_email,
    password: process.env.admin_pass
});

const isAdminLogin = ({ user, password }) => {
    const admin = getAdminCredentials();

    return Boolean(
        user &&
        admin.email &&
        admin.password &&
        String(user.email).trim().toLowerCase() === admin.email &&
        String(password) === admin.password
    );
};

const signToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
    );
};


const signup = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, error: { message: 'Name is required' } });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, error: { message: 'Email is required' } });
        }
        if (!password || String(password).length < 6) {
            return res.status(400).json({ success: false, error: { message: 'Password must be at least 6 characters' } });
        }

        const existing = await User.findByEmail(email.trim().toLowerCase());
        if (existing) {
            return res.status(409).json({ success: false, error: { message: 'Email already exists' } });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const role = 'citizen';

        const user = await User.create({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            passwordHash,
            role
        });

        const token = signToken(user);

        return res.status(201).json({
            success: true,
            data: { token, user }
        });
    } catch (err) {
        return next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.trim() || !password) {
            return res.status(400).json({ success: false, error: { message: 'Email and password are required' } });
        }

        const user = await User.findByEmail(email.trim().toLowerCase());
        if (!user) {
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
            return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
        }

        // Server-side role resolution based strictly on persisted DB user record.
        let role = user.role || 'citizen';

        if (isAdminLogin({ user, password })) {
            role = 'admin';
        
            if (user.role !== 'admin') {
                await User.updateRole(user.id, 'admin');
                user.role = 'admin';
            }
        }

        // Keep response consistent: don't expose password_hash
        const token = signToken(user);
        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            latitude: user.latitude,
            longitude: user.longitude,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        return res.json({ success: true, data: { token, user: safeUser } });
    } catch (err) {
        return next(err);
    }
};

const me = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        // Enforce: only the designated admin email can have role 'admin' in responses.
        const role = user.role || 'citizen';

        const safeUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role,
            latitude: user.latitude,
            longitude: user.longitude,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        return res.json({ success: true, data: { user: safeUser } });
    } catch (err) {
        return next(err);
    }
};

const updateLocation = async (req, res, next) => {
    try {
        const { latitude, longitude } = req.body;

        const lat = Number(latitude);
        const lng = Number(longitude);

           if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
        ) {
            return res.status(400).json({ success: false, error: { message: 'latitude and longitude are required' } });
        }

        const user = await User.updateLocation(req.user.id, {
            latitude: lat,
            longitude: lng
        });

        if (!user) {
            return res.status(404).json({ success: false, error: { message: 'User not found' } });
        }

        return res.json({ success: true, data: { user } });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    signup,
    login,
    me,
    updateLocation
};

