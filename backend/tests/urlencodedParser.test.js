const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;

before(async () => {
    const app = express();
    // Same parser configuration as backend/server.js.
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: false }));
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

const asForm = (obj) => new URLSearchParams(obj).toString();

describe('URL-encoded parser shape', () => {
    test('a flat form complaint still returns 201', async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: asForm({
                name: 'Form Reporter',
                phone: '9876543210',
                area: 'Form Area',
                city: 'Form City',
                issueType: 'Pothole',
                description: 'Filed as a flat form post.'
            })
        });
        assert.strictEqual(res.status, 201);
    });

    test('a prototype-shaped body stays flat and side-effect free', async () => {
        const res = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'name=Hacker&constructor[prototype][polluted]=yes'
        });
        // Rejected as an invalid complaint, and crucially nothing nested
        // was built out of the brackets.
        assert.strictEqual(res.status, 400);
        assert.strictEqual({}.polluted, undefined);
        assert.strictEqual(Object.prototype.polluted, undefined);
    });
});
