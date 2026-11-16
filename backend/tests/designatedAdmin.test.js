const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcrypt');

const initDatabase = require('../src/config/initDatabase');
const User = require('../src/models/User');
const authRoutes = require('../src/routes/auth');
const volunteerRoutes = require('../src/routes/volunteers');
const { errorHandler } = require('../src/middleware/errorHandler');

const ADMIN_NAME = 'Designated Admin';
const ADMIN_PASS = 'correct-admin-pass';

const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/volunteers', volunteerRoutes);
    app.use(errorHandler);
    return app;
};

const uniqueEmail = (label) => `${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

describe('Designated admin needs the configured password', () => {
    let server;
    let baseUrl;

    const call = async (path, { method = 'GET', token, body } = {}) => {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
        return { status: res.status, body: await res.json() };
    };

    const useDesignatedAdmin = (email) => {
        process.env.admin_name = ADMIN_NAME;
        process.env.admin_email = email;
        process.env.admin_pass = ADMIN_PASS;
    };

    before(async () => {
        await initDatabase();
        await new Promise((resolve) => {
            server = createApp().listen(0, () => {
                baseUrl = `http://127.0.0.1:${server.address().port}/api`;
                resolve();
            });
        });
    });

    after(() => {
        if (server) server.close();
    });

    test('signing up with the admin name and email but another password grants nothing', async () => {
        const email = uniqueEmail('squatter');
        useDesignatedAdmin(email);

        const signup = await call('/auth/signup', {
            method: 'POST',
            body: { name: ADMIN_NAME, email, password: 'not-the-admin-pass' }
        });
        assert.equal(signup.status, 201);
        assert.equal(signup.body.data.user.role, 'citizen');
        const token = signup.body.data.token;

        const me = await call('/auth/me', { token });
        assert.equal(me.body.data.user.role, 'citizen');

        const pending = await call('/volunteers/pending', { token });
        assert.equal(pending.status, 403);

        const request = await call('/volunteers/request', { method: 'POST', token });
        assert.equal(request.status, 201);

        const approve = await call(`/volunteers/${request.body.data.request.id}/approve`, { method: 'POST', token });
        assert.equal(approve.status, 403);

        const stored = await User.findByEmail(email);
        assert.equal(stored.role, 'citizen');
    });

    test('signing up with the configured password still creates an admin', async () => {
        const email = uniqueEmail('admin_signup');
        useDesignatedAdmin(email);

        const signup = await call('/auth/signup', {
            method: 'POST',
            body: { name: ADMIN_NAME, email, password: ADMIN_PASS }
        });
        assert.equal(signup.status, 201);
        assert.equal(signup.body.data.user.role, 'admin');

        const pending = await call('/volunteers/pending', { token: signup.body.data.token });
        assert.equal(pending.status, 200);
    });

    test('an existing account is promoted only after logging in with the configured password', async () => {
        const email = uniqueEmail('admin_login');
        useDesignatedAdmin(email);
        await User.create({
            name: ADMIN_NAME,
            email,
            passwordHash: await bcrypt.hash(ADMIN_PASS, 10),
            role: 'citizen'
        });

        const login = await call('/auth/login', {
            method: 'POST',
            body: { email, password: ADMIN_PASS }
        });
        assert.equal(login.status, 200);
        assert.equal(login.body.data.user.role, 'admin');

        const token = login.body.data.token;
        const me = await call('/auth/me', { token });
        assert.equal(me.body.data.user.role, 'admin');

        const pending = await call('/volunteers/pending', { token });
        assert.equal(pending.status, 200);
    });
});
