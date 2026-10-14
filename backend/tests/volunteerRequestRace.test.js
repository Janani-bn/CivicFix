const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const initDatabase = require('../src/config/initDatabase');
const volunteerRoutes = require('../src/routes/volunteers');
const authRoutes = require('../src/routes/auth');
const VolunteerRequest = require('../src/models/VolunteerRequest');
const pool = require('../src/config/database');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;

before(async () => {
    await initDatabase();
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/volunteers', volunteerRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api`;
            resolve();
        });
    });
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

const signup = async (name, email) => {
    const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password: 'password123' })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    return data.data.token;
};

const requestVolunteer = (token) =>
    fetch(`${baseUrl}/volunteers/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

const pendingCount = async (email) => {
    const rows = await pool.query(
        `SELECT COUNT(*) AS n FROM volunteer_requests vr
         JOIN users u ON u.id = vr.user_id
         WHERE u.email = $1 AND vr.status = 'pending'`,
        [email]
    );
    return rows.rows[0].n;
};

describe('Concurrent volunteer requests', () => {
    test('two simultaneous requests leave a single pending row', async () => {
        const email = `race_${Date.now()}@example.com`;
        const token = await signup('Race User', email);

        const [first, second] = await Promise.all([
            requestVolunteer(token),
            requestVolunteer(token)
        ]);

        const statuses = [first.status, second.status].sort();
        assert.deepStrictEqual(statuses, [201, 409]);

        const loser = first.status === 409 ? first : second;
        const body = await loser.json();
        assert.strictEqual(body.success, false);
        assert.match(body.error?.message || '', /already pending/i);

        assert.strictEqual(await pendingCount(email), 1);
    });

    test('a repeat request after success still gets 409', async () => {
        const email = `repeat_${Date.now()}@example.com`;
        const token = await signup('Repeat User', email);

        const first = await requestVolunteer(token);
        assert.strictEqual(first.status, 201);

        const second = await requestVolunteer(token);
        assert.strictEqual(second.status, 409);
        assert.strictEqual(await pendingCount(email), 1);
    });

    test('the database itself rejects a second pending row', async () => {
        const email = `direct_${Date.now()}@example.com`;
        const token = await signup('Direct User', email);
        const me = await fetch(`${baseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const meData = await me.json();
        const userId = meData.data.user.id;

        await VolunteerRequest.create({ userId });
        await assert.rejects(
            VolunteerRequest.create({ userId }),
            /UNIQUE constraint failed/i
        );
    });
});
