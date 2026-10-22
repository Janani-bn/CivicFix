process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);
const { test, before } = require('node:test');
const assert = require('node:assert');
const initDatabase = require('../src/config/initDatabase');
const Complaint = require('../src/models/Complaint');
const pool = require('../src/config/database');

before(async () => {
    await initDatabase();
});

test('joining a complaint that does not exist records nothing', async () => {
    const { rows } = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM complaints');
    const missingId = Number(rows[0].max_id) + 100000;
    const sessionId = `join-test-${Date.now()}`;

    const result = await Complaint.join(missingId, null, sessionId);

    assert.strictEqual(result, null);
    const joins = await pool.query(
        'SELECT COUNT(*) AS n FROM complaint_joins WHERE complaint_id = $1',
        [missingId]
    );
    assert.strictEqual(Number(joins.rows[0].n), 0);
});
