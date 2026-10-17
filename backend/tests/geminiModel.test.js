const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const SERVICE_PATH = require.resolve('../src/services/geminiService');

// The service caches its model, so each test loads a fresh copy.
const loadService = () => {
    delete require.cache[SERVICE_PATH];
    return require('../src/services/geminiService');
};

const fakeGenerateContentResponse = (text) => new Response(
    JSON.stringify({
        candidates: [{
            content: { role: 'model', parts: [{ text }] },
            finishReason: 'STOP',
            index: 0
        }]
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
);

describe('Gemini model selection', () => {
    const originalFetch = globalThis.fetch;
    const originalKey = process.env.GEMINI_API_KEY;
    const originalModel = process.env.GEMINI_MODEL;
    let requestedUrls;

    beforeEach(() => {
        requestedUrls = [];
        process.env.GEMINI_API_KEY = 'test-key';
        delete process.env.GEMINI_MODEL;
        globalThis.fetch = async (url) => {
            requestedUrls.push(String(url));
            return fakeGenerateContentResponse('Hello from the test model');
        };
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
        if (originalModel === undefined) delete process.env.GEMINI_MODEL;
        else process.env.GEMINI_MODEL = originalModel;
        delete require.cache[SERVICE_PATH];
    });

    test('defaults to a model that has not been shut down', () => {
        const gemini = loadService();
        assert.strictEqual(gemini.getModelName(), 'gemini-3.6-flash');
        assert.notStrictEqual(gemini.getModelName(), 'gemini-2.0-flash');
    });

    test('chat requests go to the default model endpoint', async () => {
        const gemini = loadService();
        const result = await gemini.chat('hello');

        assert.strictEqual(result.reply, 'Hello from the test model');
        assert.strictEqual(requestedUrls.length, 1);
        assert.match(requestedUrls[0], /\/models\/gemini-3\.6-flash:generateContent/);
        assert.doesNotMatch(requestedUrls[0], /gemini-2\.0-flash/);
    });

    test('GEMINI_MODEL overrides the default for every AI call', async () => {
        process.env.GEMINI_MODEL = '  gemini-3.8-flash  ';
        const gemini = loadService();

        await gemini.chat('hello');
        await gemini.enhanceDescription('Large pothole near the bus stop on Main Road');

        assert.strictEqual(requestedUrls.length, 2);
        for (const url of requestedUrls) {
            assert.match(url, /\/models\/gemini-3\.8-flash:generateContent/);
        }
    });

    test('a blank GEMINI_MODEL falls back to the default', () => {
        process.env.GEMINI_MODEL = '   ';
        const gemini = loadService();
        assert.strictEqual(gemini.getModelName(), gemini.DEFAULT_GEMINI_MODEL);
    });

    test('without an API key no request is made', async () => {
        delete process.env.GEMINI_API_KEY;
        const gemini = loadService();

        const result = await gemini.chat('hello');

        assert.strictEqual(result.action, null);
        assert.strictEqual(requestedUrls.length, 0);
    });
});
