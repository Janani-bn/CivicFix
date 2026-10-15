const AUTH_RATE_LIMIT_WINDOW_MS = Number(
    process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000
);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);

module.exports = {
    AUTH_RATE_LIMIT_WINDOW_MS,
    AUTH_RATE_LIMIT_MAX
};
