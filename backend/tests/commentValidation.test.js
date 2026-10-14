const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);

const complaintRoutes = require('../src/routes/complaints');
const commentRoutes = require('../src/routes/comments');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;
let complaintId;

before(async () => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use('/api/complaints', complaintRoutes);
    app.use('/api/comments', commentRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api`;
            resolve();
        });
    });

    const res = await fetch(`${baseUrl}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Comment Test',
            phone: '9876543210',
            area: 'Comment Area',
            city: 'Comment City',
            issueType: 'Pothole',
            description: 'A complaint to comment on.'
        })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    complaintId = data.data.complaintId;
});

after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

const postComment = (payload) =>
    fetch(`${baseUrl}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

describe('Comment message type validation', () => {
    test('rejects object message without inserting', async () => {
        const res = await postComment({ complaintId, message: { text: 'hello' } });
        assert.strictEqual(res.status, 400);
    });

    test('rejects array message', async () => {
        const res = await postComment({ complaintId, message: ['hello'] });
        assert.strictEqual(res.status, 400);
    });

    test('rejects number message', async () => {
        const res = await postComment({ complaintId, message: 12345 });
        assert.strictEqual(res.status, 400);
    });

    test('rejects boolean message', async () => {
        const res = await postComment({ complaintId, message: true });
        assert.strictEqual(res.status, 400);
    });

    test('rejects blank string', async () => {
        const res = await postComment({ complaintId, message: '   ' });
        assert.strictEqual(res.status, 400);
    });

    test('rejects non-string name', async () => {
        const res = await postComment({ complaintId, message: 'valid text', name: 42 });
        assert.strictEqual(res.status, 400);
    });

    test('accepts a valid string comment', async () => {
        const res = await postComment({ complaintId, message: 'This is a real comment.', name: 'Tester' });
        assert.strictEqual(res.status, 201);
        const body = await res.json();
        assert.strictEqual(body.data.message, 'This is a real comment.');
    });
});
