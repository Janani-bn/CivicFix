// Regression tests for #108: phone validation must count digits, not
// punctuation ('----------' was accepted and produced broken WhatsApp links).
const { test, describe } = require('node:test');
const assert = require('node:assert');

const { validateComplaint } = require('../src/middleware/validateComplaint');

// Drive the middleware with a mock req/res and capture whether next() ran
// (valid) or a 400 was returned (invalid).
function attempt(phone) {
    const req = { body: { issueType: 'Road Damage', description: 'A real description of the issue', name: 'Jane', phone, area: 'Ward 1', city: 'City', state: 'State' } };
    let statusCode = null;
    let proceeded = false;
    const res = {
        status(code) { statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
    validateComplaint(req, res, () => { proceeded = true; });
    return { statusCode, proceeded };
}

describe('Complaint phone digit counting (#108)', () => {
    test('rejects punctuation-only phone strings', () => {
        const { statusCode, proceeded } = attempt('----------');
        assert.equal(proceeded, false);
        assert.equal(statusCode, 400);
    });

    test('rejects plus-only strings', () => {
        const { statusCode, proceeded } = attempt('++++++++++');
        assert.equal(proceeded, false);
        assert.equal(statusCode, 400);
    });

    test('accepts a formatted number with 10+ digits', () => {
        const { proceeded } = attempt('+1 (555) 123-4567');
        assert.equal(proceeded, true);
    });

    test('rejects a short numeric string', () => {
        const { statusCode, proceeded } = attempt('12345');
        assert.equal(proceeded, false);
        assert.equal(statusCode, 400);
    });
});
