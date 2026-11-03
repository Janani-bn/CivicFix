const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');
const initDatabase = require('../src/config/initDatabase');
const Complaint = require('../src/models/Complaint');

let server;
let baseUrl;

before(async () => {
    await initDatabase();
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            const port = server.address().port;
            baseUrl = `http://localhost:${port}/api`;
            resolve();
        });
    });

    await Complaint.create({
        name: 'Sensitive User',
        phone: '9876543210',
        email: 'secret@example.com',
        area: 'PII Test Area',
        city: 'PII Test City',
        issueType: 'Pothole',
        description: 'PII regression test complaint',
        severity: 'medium'
    }, 42);
});

after(() => {
    if (server) server.close();
});

const PII_FIELDS = ['phone', 'email', 'user_id', 'name', 'want_updates'];

describe('Public complaint endpoints strip PII (#53)', () => {
    test('GET /complaints does not include phone, email, or user_id', async () => {
        const res = await fetch(`${baseUrl}/complaints`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();
        assert.strictEqual(body.success, true);

        for (const complaint of body.data) {
            for (const field of PII_FIELDS) {
                assert.strictEqual(
                    complaint[field],
                    undefined,
                    `Public list should not include ${field}`
                );
            }
        }
    });

    test('GET /complaints/:id does not include phone, email, or user_id', async () => {
        const listRes = await fetch(`${baseUrl}/complaints`);
        const listBody = await listRes.json();
        const first = listBody.data[0];
        assert.ok(first, 'Need at least one complaint');

        const id = first.complaint_id || first.id;
        const res = await fetch(`${baseUrl}/complaints/${id}`);
        assert.strictEqual(res.status, 200);
        const body = await res.json();

        for (const field of PII_FIELDS) {
            assert.strictEqual(
                body.data[field],
                undefined,
                `Public detail should not include ${field}`
            );
        }
    });

    test('public responses still include non-PII fields', async () => {
        const res = await fetch(`${baseUrl}/complaints`);
        const body = await res.json();
        const complaint = body.data.find(c => c.area === 'PII Test Area');
        assert.ok(complaint, 'Test complaint should be in the list');
        assert.strictEqual(complaint.issue_type, 'Pothole');
        assert.strictEqual(complaint.city, 'PII Test City');
        assert.ok(complaint.complaint_id);
        assert.ok(complaint.status);
    });
});
