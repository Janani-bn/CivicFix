
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const initDatabase = require('../src/config/initDatabase');

let server;
let baseUrl;
let citizenToken;

before(async () => {
    const timestamp = Date.now();

    process.env.admin_name = 'Test Admin';
    process.env.admin_email = `admin_${timestamp}@example.com`;
    process.env.admin_pass = 'adminpass123';

    await initDatabase();

    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://localhost:${server.address().port}`;
            resolve();
        });
    });

    const response = await fetch(`${baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Citizen',
            email: `citizen_${timestamp}@example.com`,
            password: 'password123'
        })
    });

    assert.equal(response.status, 201);
    const data = await response.json();
    citizenToken = data.data.token;
});

after(async () => {
    if (server) {
        await new Promise((resolve, reject) => {
            server.close((err) => err ? reject(err) : resolve());
        });
    }
});

const assignmentEndpoints = [
    '/api/assign',
    '/api/complaints/assign'
];

for (const endpoint of assignmentEndpoints) {
    test(`${endpoint} rejects unauthenticated requests`, async () => {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                complaintId: 'nonexistent-test-complaint',
                department: 'Roads'
            })
        });

        assert.equal(response.status, 401);
    });

    test(`${endpoint} rejects authenticated citizens`, async () => {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${citizenToken}`
            },
            body: JSON.stringify({
                complaintId: 'nonexistent-test-complaint',
                department: 'Roads'
            })
        });

        assert.equal(response.status, 403);
    });
}
