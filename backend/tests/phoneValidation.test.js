const { test } = require('node:test');
const assert = require('node:assert');

const { validateComplaint } = require('../src/middleware/validateComplaint');

const createRequest = (phone) => ({
    body: {
        name: 'Test Reporter',
        phone,
        area: 'Test Area',
        city: 'Test City',
        issueType: 'Road Damage',
        description: 'A valid complaint description'
    },
    file: undefined
});

const createResponse = () => {
    const response = {
        statusCode: null,
        body: null
    };

    response.status = (code) => {
        response.statusCode = code;
        return response;
    };

    response.json = (body) => {
        response.body = body;
        return response;
    };

    return response;
};

test('rejects phone numbers with fewer than 10 digits', () => {
    const req = createRequest('123-456-789');
    const res = createResponse();
    let nextCalled = false;

    validateComplaint(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(nextCalled, false);
});

test('rejects phone numbers containing no digits', () => {
    const req = createRequest('----------');
    const res = createResponse();
    let nextCalled = false;

    validateComplaint(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(nextCalled, false);
});

test('accepts formatted phone numbers with at least 10 digits', () => {
    const req = createRequest('+91 98765-43210');
    const res = createResponse();
    let nextCalled = false;

    validateComplaint(req, res, () => {
        nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
});
