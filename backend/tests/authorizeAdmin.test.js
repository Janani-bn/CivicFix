const { test, describe, before } = require('node:test');
const assert = require('node:assert');

process.env.JWT_SECRET = 'x'.repeat(48);

const initDatabase = require('../src/config/initDatabase');
const User = require('../src/models/User');
const authorizeAdmin = require('../src/middleware/authorizeAdmin');

const call = async (userId) => {
    let status = null;
    let payload = null;
    let nexted = false;
    const req = { user: { id: userId } };
    const res = {
        status(code) {
            status = code;
            return this;
        },
        json(body) {
            payload = body;
            return this;
        }
    };
    await authorizeAdmin(req, res, () => {
        nexted = true;
    });
    return { status, payload, nexted };
};

describe('authorizeAdmin designated admin', () => {
    let designated;
    let ordinary;
    let storedAdmin;

    before(async () => {
        await initDatabase();
        process.env.admin_name = 'Designated Admin';
        process.env.admin_email = `designated_${Date.now()}@example.com`;

        designated = await User.create({
            name: 'Designated Admin',
            email: process.env.admin_email,
            passwordHash: 'hash',
            role: 'citizen'
        });
        ordinary = await User.create({
            name: 'Ordinary User',
            email: `ordinary_${Date.now()}@example.com`,
            passwordHash: 'hash',
            role: 'citizen'
        });
        storedAdmin = await User.create({
            name: 'Stored Admin',
            email: `storedadmin_${Date.now()}@example.com`,
            passwordHash: 'hash',
            role: 'admin'
        });
    });

    test('a designated admin with a citizen role passes', async () => {
        const out = await call(designated.id);
        assert.strictEqual(out.nexted, true);
    });

    test('an ordinary citizen still gets 403', async () => {
        const out = await call(ordinary.id);
        assert.strictEqual(out.nexted, false);
        assert.strictEqual(out.status, 403);
    });

    test('a stored admin still passes', async () => {
        const out = await call(storedAdmin.id);
        assert.strictEqual(out.nexted, true);
    });
});
