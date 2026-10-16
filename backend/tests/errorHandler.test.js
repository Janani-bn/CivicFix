import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const mkRes = () => {
  const out = { statusCode: 200, body: null };
  return {
    res: {
      status(c) { out.statusCode = c; return this; },
      json(b) { out.body = b; return this; },
    },
    out,
  };
};

describe('errorHandler information leak (#150)', () => {
  it('a plain crash (no statusCode) returns a generic message', async () => {
    const { errorHandler } = await import('../src/middleware/errorHandler.js');
    const { res, out } = mkRes();
    errorHandler(new Error('SQLITE_ERROR: no such table: complaints_secret'), {}, res, () => {});
    assert.equal(out.statusCode, 500);
    assert.equal(out.body.error.message, 'Internal Server Error');
    assert.ok(!JSON.stringify(out.body).includes('no such table'), 'driver internals must not leak');
  });

  it('a deliberate 4xx keeps its client-authored message', async () => {
    const { errorHandler } = await import('../src/middleware/errorHandler.js');
    const err = new Error('latitude must be within [-90, 90]');
    err.statusCode = 400;
    const { res, out } = mkRes();
    errorHandler(err, {}, res, () => {});
    assert.equal(out.statusCode, 400);
    assert.equal(out.body.error.message, 'latitude must be within [-90, 90]');
  });

  it('development mode still includes the stack trace', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const { errorHandler } = await import('../src/middleware/errorHandler.js');
      const { res, out } = mkRes();
      errorHandler(new Error('boom'), {}, res, () => {});
      assert.ok(out.body.error.stack, 'dev keeps the stack');
      assert.equal(out.body.error.message, 'Internal Server Error');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
