const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { errorHandler } = require('../src/middleware/errorHandler');

const run = (err, nodeEnv) => {
    const prev = process.env.NODE_ENV;
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    const res = {
        statusCode: null,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
    // Silence the handler log for these cases.
    const originalError = console.error;
    console.error = () => {};
    try {
        errorHandler(err, {}, res, () => {});
    } finally {
        console.error = originalError;
        if (prev === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = prev;
    }
    return res;
};

describe('Error handler outward messages', () => {
    let prevEnv;
    beforeEach(() => {
        prevEnv = process.env.NODE_ENV;
        delete process.env.NODE_ENV;
    });
    afterEach(() => {
        if (prevEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = prevEnv;
    });

    test('an unexpected crash returns 500 with a generic message', () => {
        const res = run(new Error('no such table: complaints'));
        assert.strictEqual(res.statusCode, 500);
        assert.strictEqual(res.payload.success, false);
        assert.strictEqual(res.payload.error.message, 'Internal Server Error');
    });

    test('a deliberate client error keeps its message', () => {
        const err = new Error('Complaint not found');
        err.statusCode = 404;
        const res = run(err);
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.payload.error.message, 'Complaint not found');
    });

    test('the stack field still appears only in development', () => {
        const prod = run(new Error('boom'), 'production');
        assert.strictEqual('stack' in prod.payload.error, false);
        const dev = run(new Error('boom'), 'development');
        assert.ok(dev.payload.error.stack);
        assert.strictEqual(dev.payload.error.message, 'Internal Server Error');
    });
});
