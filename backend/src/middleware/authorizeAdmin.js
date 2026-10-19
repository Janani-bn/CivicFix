const User = require('../models/User');

const authorizeAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
        }

        const adminName = process.env.admin_name;
        const adminEmail = process.env.admin_email;
        const isDesignatedAdmin = Boolean(
            adminEmail && adminName &&
            String(user.name).trim() === adminName &&
            String(user.email).trim().toLowerCase() === String(adminEmail).trim().toLowerCase()
        );

        if (user.role !== 'admin' && !isDesignatedAdmin) {
            return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
        }

        return next();
    } catch (err) {
        return next(err);
    }
};

module.exports = authorizeAdmin;