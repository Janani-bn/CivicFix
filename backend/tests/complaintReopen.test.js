const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/config/jwt');
const initDatabase = require('../src/config/initDatabase');
const pool = require('../src/config/database');
const Complaint = require('../src/models/Complaint');
const User = require('../src/models/User');
const complaintRoutes = require('../src/routes/complaints');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;
let admin;
let volunteerA;
let volunteerB;
const complaintIds = [];
const users = [];

before(async () => {
    await initDatabase();
    for (const [name, role] of [['Admin', 'admin'], ['Volunteer A', 'volunteer'], ['Volunteer B', 'volunteer']]) {
        const user = await User.create({
            name,
            email: `reopen-${role}-${users.length}-${Date.now()}@example.test`,
            passwordHash: 'unused-test-fixture',
            role
        });
        users.push({ ...user, token: jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { algorithm: 'HS256' }) });
    }
    [admin, volunteerA, volunteerB] = users;
    const app = express();
    app.use(express.json());
    app.use('/api/complaints', complaintRoutes);
    app.use(errorHandler);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api/complaints`;
});

after(async () => {
    if (server) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    }
    for (const id of complaintIds) await pool.query('DELETE FROM complaints WHERE id = $1', [id]);
    for (const user of users) await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
});

async function createComplaint() {
    const complaint = await Complaint.create({
        name: 'Test Citizen', phone: '1234567890', area: 'Test Area', city: 'Test City',
        issueType: 'Road', description: 'Reopen ownership regression', severity: 'low', allowVolunteers: 'yes'
    });
    complaintIds.push(complaint.id);
    return complaint;
}

async function request(complaint, method, suffix, user, body) {
    const response = await fetch(`${baseUrl}/${complaint.id}${suffix}`, {
        method,
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, body: await response.json() };
}

async function claim(complaint, user = volunteerA) {
    const response = await request(complaint, 'POST', '/claim', user);
    assert.equal(response.status, 200);
}

function assertNoOwnership(complaint) {
    for (const field of ['claimed_by_user_id', 'claimed_by', 'resolved_by_user_id', 'resolved_by']) {
        assert.equal(complaint[field], null, `${field} must be cleared on reopen`);
    }
}

test('admin reopening a claimed complaint clears ownership and lets another volunteer claim it', async () => {
    const complaint = await createComplaint();
    await claim(complaint);
    const reopened = await request(complaint, 'PUT', '', admin, { status: 'Pending' });
    assert.equal(reopened.status, 200);
    assertNoOwnership(reopened.body.data);
    const stored = await Complaint.findById(complaint.id);
    assert.equal(stored.status, 'Pending');
    assertNoOwnership(stored);
    await claim(complaint, volunteerB);
    assert.equal((await Complaint.findById(complaint.id)).claimed_by_user_id, volunteerB.id);
});

test('reopening a resolved complaint also clears its previous resolver', async () => {
    const complaint = await createComplaint();
    await claim(complaint);
    assert.equal((await request(complaint, 'POST', '/resolve', volunteerA)).status, 200);
    const resolved = await Complaint.findById(complaint.id);
    assert.equal(resolved.resolved_by_user_id, volunteerA.id);
    const reopened = await request(complaint, 'PUT', '', admin, { status: 'Pending' });
    assert.equal(reopened.status, 200);
    assertNoOwnership(await Complaint.findById(complaint.id));
    await claim(complaint, volunteerB);
});

test('another volunteer cannot take an actively claimed complaint', async () => {
    const complaint = await createComplaint();
    await claim(complaint);
    assert.equal((await request(complaint, 'POST', '/claim', volunteerB)).status, 409);
    assert.equal((await Complaint.findById(complaint.id)).claimed_by_user_id, volunteerA.id);
});

test('non-admin status changes do not clear the current volunteer assignment', async () => {
    const complaint = await createComplaint();
    await claim(complaint);
    assert.equal((await request(complaint, 'PUT', '', volunteerB, { status: 'Pending' })).status, 403);
    const stored = await Complaint.findById(complaint.id);
    assert.equal(stored.status, 'In Progress');
    assert.equal(stored.claimed_by_user_id, volunteerA.id);
});

test('other valid status updates preserve ownership and invalid statuses leave it unchanged', async () => {
    const complaint = await createComplaint();
    await claim(complaint);
    assert.equal((await request(complaint, 'PUT', '', admin, { status: 'In Progress' })).status, 200);
    assert.equal((await Complaint.findById(complaint.id)).claimed_by_user_id, volunteerA.id);
    assert.equal((await request(complaint, 'PUT', '', admin, { status: 'unknown' })).status, 400);
    const stored = await Complaint.findById(complaint.id);
    assert.equal(stored.status, 'In Progress');
    assert.equal(stored.claimed_by_user_id, volunteerA.id);
});
