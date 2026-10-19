const WINDOW_MS = 60_000;

function createRateLimiter(maxAttempts) {
    const map = new Map();

    return (req, res, next) => {
        const ip = req.ip;
        const now = Date.now();
        const entry = map.get(ip);

        if (!entry || now - entry.windowStart > WINDOW_MS) {
            map.set(ip, { windowStart: now, count: 1 });
            return next();
        }

        if (entry.count >= maxAttempts) {
            return res.status(429).json({
                success: false,
                error: { message: 'Too many requests. Please try again later.' }
            });
        }

        entry.count++;
        return next();
    };
}

const loginRateLimit = createRateLimiter(10);
const signupRateLimit = createRateLimiter(5);

module.exports = { loginRateLimit, signupRateLimit };
