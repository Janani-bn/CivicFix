/**
 * Small fixed-window in-memory rate limiter.
 *
 * The window is not a sliding one: the first request of a window starts the
 * clock and every request within `windowMs` counts against `max`. When the
 * window elapses the counter is reset on the next request. This is the same
 * behaviour the AI controller used locally before, extracted here so auth and
 * AI routes share one implementation.
 */
const DEFAULT_MESSAGE = 'Too many requests. Please try again later.';

const createRateLimiter = ({ windowMs, max, message = DEFAULT_MESSAGE }) => {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
        throw new Error('createRateLimiter requires a positive windowMs');
    }
    if (!Number.isFinite(max) || max <= 0) {
        throw new Error('createRateLimiter requires a positive max');
    }

    const hits = new Map();

    const check = (key) => {
        const now = Date.now();
        const entry = hits.get(key);

        if (!entry || now - entry.windowStart >= windowMs) {
            hits.set(key, { windowStart: now, count: 1 });
            return true;
        }

        if (entry.count >= max) {
            return false;
        }

        entry.count += 1;
        return true;
    };

    const middleware = (req, res, next) => {
        const key = `${req.method}:${req.baseUrl}${req.path}:${req.ip}`;

        if (!check(key)) {
            return res.status(429).json({
                success: false,
                error: { message }
            });
        }

        return next();
    };

    // Exposed for tests and for handlers that need to count manually.
    const reset = () => hits.clear();

    return { check, middleware, reset };
};

module.exports = { createRateLimiter };
