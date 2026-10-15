const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');
const { COMPLAINT_FIELD_LIMITS } = require('../src/utils/complaintLimits');
const initDatabase = require('../src/config/initDatabase');

const createApp = () => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    return app;
};

const validPayload = () => ({
    name: 'Reporter',
    phone: '9876543210',
    area: 'Anna Nagar',
    city: 'Chennai',
    issueType: 'Pothole',
    description: 'Large pothole near the bus stop.'
});

describe('Complaint field length limits', () => {
    let server;
    let baseUrl;

    before(async () => {
        await initDatabase();
        const app = createApp();
        await new Promise((resolve) => {
            server = app.listen(0, () => {
                baseUrl = `http://127.0.0.1:${server.address().port}/api/complaints`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) {
            server.close();
        }
    });

    const post = (payload) =>
        fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

    test('rejects an oversized description and names the field', async () => {
        const res = await post({
            ...validPayload(),
            description: 'x'.repeat(COMPLAINT_FIELD_LIMITS.description + 1)
        });

        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.strictEqual(body.error.message, 'Validation failed');
        assert.ok(
            body.error.details.some((detail) =>
                detail.includes('Description must not exceed')
            )
        );
    });

    test('rejects an oversized name', async () => {
        const res = await post({
            ...validPayload(),
            name: 'n'.repeat(COMPLAINT_FIELD_LIMITS.name + 1)
        });

        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.ok(
            body.error.details.some((detail) =>
                detail.includes('Name must not exceed')
            )
        );
    });

    test('rejects an oversized landmark', async () => {
        const res = await post({
            ...validPayload(),
            landmark: 'l'.repeat(COMPLAINT_FIELD_LIMITS.landmark + 1)
        });

        assert.strictEqual(res.status, 400);
        const body = await res.json();
        assert.ok(
            body.error.details.some((detail) =>
                detail.includes('Landmark must not exceed')
            )
        );
    });

    test('accepts a complaint whose fields are within the limits', async () => {
        const res = await post(validPayload());

        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.success, true);
        assert.ok(body.data.complaintId);
    });
});
