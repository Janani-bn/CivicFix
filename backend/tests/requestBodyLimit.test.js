const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');
const { JSON_BODY_LIMIT } = require('../src/utils/requestLimits');

let server;
let baseUrl;

before(async () => {
    const app = express();
    // Same parser configuration as backend/server.js.
    app.use(express.json({ limit: JSON_BODY_LIMIT }));
    app.use(express.urlencoded({ limit: JSON_BODY_LIMIT, extended: true }));
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api/complaints`;
            resolve();
        });
    });
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

describe('JSON body size limit', () => {
    test('a multi-megabyte JSON payload is rejected before validation', async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Bulk',
                phone: '9876543210',
                area: 'Area',
                city: 'City',
                issueType: 'Pothole',
                description: 'x'.repeat(5 * 1024 * 1024)
            })
        });
        assert.strictEqual(res.status, 413);
    });

    test('a normal complaint still returns 201', async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Normal Reporter',
                phone: '9876543210',
                area: 'Anna Nagar',
                city: 'Chennai',
                issueType: 'Pothole',
                description: 'A normal sized report.'
            })
        });
        assert.strictEqual(res.status, 201);
    });
});
