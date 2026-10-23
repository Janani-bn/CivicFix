process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(48);
const { test, before } = require('node:test');
const assert = require('node:assert');
const initDatabase = require('../src/config/initDatabase');
const Comment = require('../src/models/Comment');

before(async () => {
    await initDatabase();
});

test('a complaint with more than 200 comments lists the newest 200, oldest first', async () => {
    const complaintId = `CIV-LIST-${Date.now()}`;
    for (let i = 1; i <= 205; i++) {
        await Comment.create({ complaintId, authorName: 'Tester', message: `comment ${i}` });
    }

    const comments = await Comment.findByComplaintId(complaintId);

    assert.strictEqual(comments.length, 200);
    assert.strictEqual(comments[0].message, 'comment 6');
    assert.strictEqual(comments[199].message, 'comment 205');
});

test('comments posted in the same second keep their posting order', async () => {
    const complaintId = `CIV-ORDER-${Date.now()}`;
    for (const message of ['first', 'second', 'third']) {
        await Comment.create({ complaintId, authorName: 'Tester', message });
    }

    const comments = await Comment.findByComplaintId(complaintId);

    assert.deepStrictEqual(comments.map((c) => c.message), ['first', 'second', 'third']);
});
