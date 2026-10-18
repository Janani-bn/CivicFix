
const { requireAdmin } = require('./auth');

const authorizeAdmin = (req, res, next) => {
    return requireAdmin(req, res, next);
};

module.exports = authorizeAdmin;
