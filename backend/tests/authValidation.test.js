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

describe('Issue #111: Auth input type validation', () => {
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
        if (server) {
            server.close();
        }
    });

    // --- Signup Validation Tests ---

    test('signup with numeric name returns 400 validation error, not 500', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 42, email: 'valid@example.com', password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Name is required');
    });

    test('signup with boolean name returns 400 validation error', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: true, email: 'valid@example.com', password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Name is required');
    });

    test('signup with object name returns 400 validation error', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: { first: 'John' }, email: 'valid@example.com', password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Name is required');
    });

    test('signup with numeric email returns 400 validation error, not 500', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'John Doe', email: 12345, password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Email is required');
    });

    test('signup with numeric password returns 400 validation error, not 500', async () => {
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'John Doe', email: 'valid@example.com', password: 123456 })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Password must be at least 6 characters');
    });

    // --- Login Validation Tests ---

    test('login with numeric email returns 400 validation error, not 500', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 12345, password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Email and password are required');
    });

    test('login with numeric password returns 400 validation error, not 500', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'valid@example.com', password: 123456 })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Email and password are required');
    });

    test('login with object email returns 400 validation error', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: { address: 'a@b.com' }, password: 'password123' })
        });
        const data = await res.json();
        assert.strictEqual(res.status, 400);
        assert.strictEqual(data.success, false);
        assert.strictEqual(data.error.message, 'Email and password are required');
    });

    // --- Controls ---

    test('signup with missing fields returns 400 with expected error messages', async () => {
        const resNoName = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'valid@example.com', password: 'password123' })
        });
        assert.strictEqual(resNoName.status, 400);
        const dataNoName = await resNoName.json();
        assert.strictEqual(dataNoName.error.message, 'Name is required');

        const resNoEmail = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'John Doe', password: 'password123' })
        });
        assert.strictEqual(resNoEmail.status, 400);
        const dataNoEmail = await resNoEmail.json();
        assert.strictEqual(dataNoEmail.error.message, 'Email is required');

        const resNoPass = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'John Doe', email: 'valid@example.com' })
        });
        assert.strictEqual(resNoPass.status, 400);
        const dataNoPass = await resNoPass.json();
        assert.strictEqual(dataNoPass.error.message, 'Password must be at least 6 characters');
    });

    test('login with missing fields returns 400 with expected error message', async () => {
        const res = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'valid@example.com' })
        });
        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.strictEqual(data.error.message, 'Email and password are required');
    });
});
