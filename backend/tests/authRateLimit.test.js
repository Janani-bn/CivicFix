const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

// Configure a small window before the routes (and the limiter) are loaded.
process.env.JWT_SECRET = 'x'.repeat(48);
process.env.AUTH_RATE_LIMIT_MAX = '3';
process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';

const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

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
});
