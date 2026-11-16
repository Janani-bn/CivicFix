const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

const authRoutes = require('../src/routes/auth');
const { errorHandler } = require('../src/middleware/errorHandler');
const initDatabase = require('../src/config/initDatabase');
const VolunteerRequest = require('../src/models/VolunteerRequest');

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
    return app;
};

describe('Volunteer signup creates a pending request (#84)', () => {
    let server;
    let baseUrl;

    before(async () => {
        await initDatabase();
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

    test('signup with role=volunteer creates user as citizen and returns pendingVolunteer: true', async () => {
        const email = `vol-${Date.now()}@example.com`;
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Volunteer Test',
                email,
                password: 'password123',
                role: 'volunteer'
            })
        });
        const data = await res.json();

        assert.strictEqual(res.status, 201);
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.data.user.role, 'citizen');
        assert.strictEqual(data.data.pendingVolunteer, true);

        const pending = await VolunteerRequest.findPendingByUserId(data.data.user.id);
        assert.ok(pending, 'A pending volunteer request should exist');
        assert.strictEqual(pending.status, 'pending');
    });

    test('signup with role=Citizen does not create a volunteer request', async () => {
        const email = `cit-${Date.now()}@example.com`;
        const res = await fetch(`${baseUrl}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Citizen Test',
                email,
                password: 'password123',
                role: 'Citizen'
            })
        });
        const data = await res.json();

        assert.strictEqual(res.status, 201);
        assert.strictEqual(data.data.pendingVolunteer, false);

        const pending = await VolunteerRequest.findPendingByUserId(data.data.user.id);
        assert.strictEqual(pending, null);
    });
});
