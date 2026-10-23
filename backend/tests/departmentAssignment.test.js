const { test } = require('node:test');
const assert = require('node:assert');
const { validateDepartmentAssignment } = require('../src/middleware/validateComplaint');

const run = (body) => {
    let nextCalled = false;
    let statusCode = null;
    const res = {
        status(code) { statusCode = code; return this; },
        json() { return this; }
    };
    validateDepartmentAssignment({ body }, res, () => { nextCalled = true; });
    return { nextCalled, statusCode };
};

test('auto-assign requests do not need a department', () => {
    const result = run({ complaintId: 'CIV-ABC123', autoAssign: true });
    assert.strictEqual(result.nextCalled, true);
    assert.strictEqual(result.statusCode, null);
});

test('manual assignment still requires a department', () => {
    const result = run({ complaintId: 'CIV-ABC123' });
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.statusCode, 400);
});

test('a truthy non-boolean autoAssign does not skip validation', () => {
    const result = run({ complaintId: 'CIV-ABC123', autoAssign: 'yes' });
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.statusCode, 400);
});
