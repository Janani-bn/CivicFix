const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    return app;
};

describe('Auth flow: real auth works after mock removal (#51)', () => {
    let server;
    let baseUrl;

    before(async () => {
        const app = createApp();
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                const port = server.address().port;
                baseUrl = `http://127.0.0.1:${port}/api/auth`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) server.close();
    });

    test('signup with valid data returns 201 with token and user', async () => {
        const email = `test-${Date.now()}@example.com`;
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 201);
        assert.strictEqual(data.success, true);
        assert.ok(data.data.token, 'should return a JWT token');
        assert.strictEqual(data.data.user.email, email);
        assert.strictEqual(data.data.user.role, 'citizen');
    });

    test('signup with duplicate email returns 409', async () => {
        const email = `dup-${Date.now()}@example.com`;
        await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'First', email, password: 'password123' })
        });
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Second', email, password: 'password456' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 409);
        assert.strictEqual(data.success, false);
    });

    test('login with valid credentials returns token and user', async () => {
        const email = `login-${Date.now()}@example.com`;
        await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Login Test', email, password: 'password123' })
        });
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(data.success, true);
        assert.ok(data.data.token);
        assert.strictEqual(data.data.user.email, email);
    });

    test('login with wrong password returns 401', async () => {
        const email = `wrongpw-${Date.now()}@example.com`;
        await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'WrongPW', email, password: 'correctpass' })
        });
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: 'wrongpass' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 401);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Invalid credentials');
    });

    test('login with non-existent email returns 401', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'nobody@nowhere.com', password: 'pass123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 401);
        assert.strictEqual(data.success, false);
    });

    test('/auth/me with valid token returns user data', async () => {
        const email = `me-${Date.now()}@example.com`;
        const signupRes = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Me Test', email, password: 'password123' })
        });
        const signupData = await signupRes.json();
        const token = signupData.data.token;

        const res = await fetch(`${baseUrl}/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.data.user.email, email);
    });

    test('/auth/me with invalid token returns 401', async () => {
        const res = await fetch(`${baseUrl}/me`, {
            headers: { Authorization: 'Bearer invalid-token-here' }
        });
        assert.ok(res.status === 401 || res.status === 403);
    });

    test('/auth/me without token returns 401', async () => {
        const res = await fetch(`${baseUrl}/me`);
        assert.ok(res.status === 401 || res.status === 403);
    });
});
