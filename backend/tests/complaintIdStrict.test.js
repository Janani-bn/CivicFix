const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');
const initDatabase = require('../src/config/initDatabase');

let server;
let baseUrl;
let createdId;
let internalId;

before(async () => {
    // Fresh checkouts have no tables yet; create the schema first so the
    // suite passes without a pre-existing database file.
    await initDatabase();
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api/complaints`;
            resolve();
        });
    });

    const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'ID Test',
            phone: '9876543210',
            area: 'ID Area',
            city: 'ID City',
            issueType: 'Pothole',
            description: 'Testing strict ID parsing.'
        })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    createdId = data.data.complaintId;

    const listRes = await fetch(`${baseUrl}/${createdId}`);
    const listData = await listRes.json();
    internalId = listData.data.id;
    assert.ok(internalId);
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Strict complaint ID parsing', () => {
    test('malformed ID with numeric prefix does not resolve', async () => {
        const res = await fetch(`${baseUrl}/${internalId}garbage`);
        assert.notStrictEqual(res.status, 200);
        assert.ok([400, 404].includes(res.status));
    });

    test('malformed join does not change supporter count', async () => {
        const beforeRes = await fetch(`${baseUrl}/${createdId}`);
        const beforeData = await beforeRes.json();
        const beforeCount = beforeData.data.supporter_count || 1;

        const res = await fetch(`${baseUrl}/${internalId}garbage/join`, { method: 'POST' });
        assert.ok([400, 404].includes(res.status));

        const afterRes = await fetch(`${baseUrl}/${createdId}`);
        const afterData = await afterRes.json();
        assert.strictEqual(afterData.data.supporter_count || 1, beforeCount);
    });

    test('exact public ID still works', async () => {
        const res = await fetch(`${baseUrl}/${createdId}`);
        assert.strictEqual(res.status, 200);
    });

    test('valid numeric ID still works', async () => {
        const res = await fetch(`${baseUrl}/${internalId}`);
        assert.strictEqual(res.status, 200);
    });
});
