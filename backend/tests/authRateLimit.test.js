const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

// Configure a small window before the routes (and the limiter) are loaded.
process.env.JWT_SECRET = 'x'.repeat(48);
process.env.AUTH_RATE_LIMIT_MAX = '3';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');
const initDatabase = require('../src/config/initDatabase');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    return app;
};

describe('Auth rate limiting', () => {
    let server;
    let baseUrl;

    before(async () => {
        // Fresh checkouts have no tables yet; without this the login
        // attempts fail with 500 instead of reaching the limiter.
        await initDatabase();
        const app = createApp();
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) {
            server.close();
        }
    });

    const login = (email) =>
        fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'wrong-password' })
        });

    test('login stops accepting attempts past the configured maximum', async () => {
        const email = 'ratelimited@example.com';

        const first = await login(email);
        assert.strictEqual(first.status, 401);

        const second = await login(email);
        assert.strictEqual(second.status, 401);

        const third = await login(email);
        assert.strictEqual(third.status, 401);

        const fourth = await login(email);
        assert.strictEqual(fourth.status, 429);
        const body = await fourth.json();
        assert.strictEqual(body.success, false);
        assert.ok(body.error?.message);
    });

    test('signup has its own bucket and is not blocked by login attempts', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 42, email: 'x@example.com', password: 'password123' })
        });

        // Still reaches validation, so the login bucket did not apply here.
        assert.strictEqual(res.status, 400);
    });

    test('case and trailing-slash spellings share one login bucket', async () => {
        // Reload the routes for a fresh limiter so earlier tests cannot
        // leak counts into this one.
        delete require.cache[require.resolve('../src/routes/auth')];
        const freshRoutes = require('../src/routes/auth');
        const freshApp = express();
        freshApp.use(express.json());
        freshApp.use('/api/auth', freshRoutes);
        freshApp.use(errorHandler);
        const freshServer = await new Promise((resolve) => {
            const s = freshApp.listen(0, () => resolve(s));
        });
        const freshBase = `http://127.0.0.1:${freshServer.address().port}/api/auth`;

        try {
            const attempt = (path) =>
                fetch(`${freshBase}${path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'alias@example.com', password: 'wrong-password' })
                });

            // Three attempts across three spellings of the same route.
            assert.strictEqual((await attempt('/login')).status, 401);
            assert.strictEqual((await attempt('/LOGIN')).status, 401);
            assert.strictEqual((await attempt('/login/')).status, 401);

            // A fourth attempt on any spelling is throttled only when the
            // three spellings counted against one shared bucket.
            assert.strictEqual((await attempt('/login')).status, 429);
        } finally {
            await new Promise((resolve) => freshServer.close(resolve));
        }
    });
});
