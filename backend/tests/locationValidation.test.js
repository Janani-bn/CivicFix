const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const authRoutes = require('../src/routes/auth');
const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');
const initDatabase = require('../src/config/initDatabase');

let server;
let baseUrl;
let token;

before(async () => {
    await initDatabase();
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api`;
            resolve();
        });
    });

    const email = `loc_${Date.now()}@example.com`;
    const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Loc User', email, password: 'password123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    token = data.data.token;
});

after(async () => {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }
});

describe('Location range validation', () => {
    test('rejects out-of-range latitude on POST /auth/location', async () => {
        const res = await fetch(`${baseUrl}/auth/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ latitude: 999, longitude: 80 })
        });
        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.strictEqual(body.success, false);
    });

    test('rejects non-finite coordinates', async () => {
        const res = await fetch(`${baseUrl}/auth/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ latitude: 'Infinity', longitude: 80 })
        });
        assert.strictEqual(res.status, 400);
    });

    test('accepts boundary values', async () => {
        const res = await fetch(`${baseUrl}/auth/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ latitude: 90, longitude: -180 })
        });
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.success, true);
        assert.strictEqual(body.data.user.latitude, 90);
    });

    test('rejects out-of-range lat on GET /complaints/nearby', async () => {
        const res = await fetch(`${baseUrl}/complaints/nearby?lat=999&lng=80&radiusKm=10`);
        assert.strictEqual(res.status, 400);
    });

    test('rejects oversized radiusKm', async () => {
        const res = await fetch(`${baseUrl}/complaints/nearby?lat=13&lng=80&radiusKm=99999`);
        assert.strictEqual(res.status, 400);
    });

    test('accepts a normal nearby query', async () => {
        const res = await fetch(`${baseUrl}/complaints/nearby?lat=13.08&lng=80.27&radiusKm=10`);
        assert.strictEqual(res.status, 200);
    });
});
