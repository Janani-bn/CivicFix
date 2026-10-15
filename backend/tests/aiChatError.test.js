const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');

process.env.JWT_SECRET = 'x'.repeat(48);
delete process.env.GEMINI_API_KEY;

const gemini = require('../src/services/geminiService');
const aiRoutes = require('../src/routes/ai');
const { errorHandler } = require('../src/middleware/errorHandler');

let server;
let baseUrl;
let originalChat;

before(async () => {
    originalChat = gemini.chat;
    const app = express();
    app.use(express.json());
    app.use('/api/ai', aiRoutes);
    app.use(errorHandler);
    await new Promise((resolve) => {
        server = app.listen(0, () => {
            baseUrl = `http://127.0.0.1:${server.address().port}/api/ai`;
            resolve();
        });
    });
});

after(async () => {
    gemini.chat = originalChat;
    if (server) await new Promise((resolve) => server.close(resolve));
});

describe('AI chat upstream failures', () => {
    test('returns 502 with success false when the provider throws', async () => {
        gemini.chat = async () => {
            throw new Error('provider down');
        };
        const res = await fetch(`${baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'hello' })
        });
        assert.strictEqual(res.status, 502);
        const body = await res.json();
        assert.strictEqual(body.success, false);
        assert.ok(body.error?.message);
    });

    test('still validates message before calling the provider', async () => {
        gemini.chat = async () => {
            throw new Error('should not be called');
        };
        const res = await fetch(`${baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '' })
        });
        assert.strictEqual(res.status, 400);
    });
});
