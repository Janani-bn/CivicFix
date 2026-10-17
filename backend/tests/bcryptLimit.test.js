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

describe('bcrypt 72-byte ceiling (#153)', () => {
  it('signup rejects a 100-character password', async () => {
    const { signup } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    await signup({ body: { name: 'Test', email: 't@example.com', password: 'a'.repeat(100) } }, res, () => {});
    assert.equal(out.statusCode, 400);
    assert.match(out.body.error.message, /72 bytes/);
  });

  it('signup accepts a password exactly at 72 bytes (fails later on existing-email lookup, not length)', async () => {
    const { signup } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    await signup({ body: { name: 'Test', email: 'new-' + Date.now() + '@example.com', password: 'a'.repeat(72) } }, res, () => {});
    assert.notEqual(out.statusCode, 400, 'the 72-byte boundary must not 400');
  });

  it('signup rejects multibyte passwords whose BYTE length exceeds 72', async () => {
    const { signup } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    // 30 characters × 3 bytes = 90 bytes — under 72 chars but over 72 bytes
    await signup({ body: { name: 'T', email: 'm@example.com', password: '汉'.repeat(30) } }, res, () => {});
    assert.equal(out.statusCode, 400);
  });

  it('login rejects overlong passwords with 400 (never verifies through truncation)', async () => {
    const { login } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    await login({ body: { email: 'any@example.com', password: 'a'.repeat(80) } }, res, () => {});
    assert.equal(out.statusCode, 400);
    assert.match(out.body.error.message, /72 bytes/);
  });

  it('login with a normal password passes the guard (fails later on unknown email)', async () => {
    const { login } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    await login({ body: { email: 'nobody-' + Date.now() + '@example.com', password: 'correct horse' } }, res, () => {});
    assert.notEqual(out.statusCode, 400);
  });
});
