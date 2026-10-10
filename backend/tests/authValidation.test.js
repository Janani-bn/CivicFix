// Regression tests for #111: non-string signup/login fields must return a
// clean 400, not crash with a 500 ('trim is not a function').
const { test, describe } = require('node:test');
const assert = require('node:assert');

const { signup, login } = require('../src/controllers/authController');

function mockRes() {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
}

describe('Auth input type validation (#111)', () => {
    test('signup with a numeric name returns 400, not 500', async () => {
        const res = mockRes();
        await signup({ body: { name: 42, email: 'a@b.com', password: 'secret1' } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
    });

    test('signup with a numeric email returns 400, not 500', async () => {
        const res = mockRes();
        await signup({ body: { name: 'Jane', email: 12345, password: 'secret1' } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
    });

    test('login with a numeric email returns 400, not 500', async () => {
        const res = mockRes();
        await login({ body: { email: 12345, password: 'secret1' } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
    });

    test('login with a non-string password returns 400', async () => {
        const res = mockRes();
        await login({ body: { email: 'a@b.com', password: 123456 } }, res, (err) => { throw err; });
        assert.equal(res.statusCode, 400);
    });
});
