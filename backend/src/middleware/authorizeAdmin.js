const User = require('../models/User');

const authorizeAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user || user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: { message: 'Forbidden' }
            });
        }

        return next();
    } catch (err) {
        return next(err);
    }
};

module.exports = authorizeAdmin;