const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
            resolve();
        });
    });
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Auth password byte limit', () => {
    test('signup rejects a password longer than 72 bytes', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Long Password',
                email: `longpw_${Date.now()}@example.com`,
                password: 'x'.repeat(100)
            })
        });
        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.match(body.error?.message || '', /72/);
    });

    test('a 72-byte boundary password still registers and logs in', async () => {
        const email = `boundary_${Date.now()}@example.com`;
        const password = 'y'.repeat(72);
        const signupRes = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Boundary User', email, password })
        });
        assert.strictEqual(signupRes.status, 201);

        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        assert.strictEqual(loginRes.status, 200);
    });

    test('login rejects an overlong password before comparing', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'nobody@example.com', password: 'z'.repeat(100) })
        });
        assert.strictEqual(res.status, 400);
    });
});
