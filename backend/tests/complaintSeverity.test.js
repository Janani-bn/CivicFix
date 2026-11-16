const { test } = require('node:test');
const assert = require('node:assert/strict');
const Complaint = require('../src/models/Complaint');
const { createComplaint, claimComplaint } = require('../src/controllers/complaintController');
const { validateComplaint } = require('../src/middleware/validateComplaint');

const validBody = () => ({
    name: 'Test reporter',
    phone: '1234567890',
    area: 'Test area',
    city: 'Test city',
    issueType: 'Road damage',
    description: 'A pothole needs repair'
});

function response() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('complaint creation normalizes known severity values before storage', async () => {
    const req = { body: { ...validBody(), severity: ' HIGH ' } };
    let nextCalled = false;
    validateComplaint(req, response(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.body.severity, 'high');

    const previousCreate = Complaint.create;
    let stored;
    Complaint.create = async (data) => {
        stored = data;
        return {
            complaint_id: 'CIV-1', name: data.name, phone: data.phone,
            area: data.area, city: data.city, issue_type: data.issueType,
            description: data.description, severity: data.severity || 'medium',
            status: 'Pending', department: 'Public Works', created_at: '2026-10-14T00:00:00Z'
        };
    };
    try {
        const res = response();
        await createComplaint(req, res, assert.fail);
        assert.equal(stored.severity, 'high');
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.data.severity, 'high');
    } finally {
        Complaint.create = previousCreate;
    }
});

test('complaint creation rejects unsupported and non-string severity values', () => {
    for (const severity of ['urgent', '', null, 4, ['high']]) {
        const req = { body: { ...validBody(), severity } };
        const res = response();
        let nextCalled = false;
        validateComplaint(req, res, () => { nextCalled = true; });
        assert.equal(res.statusCode, 400, `severity ${JSON.stringify(severity)} should be rejected`);
        assert.equal(nextCalled, false);
        assert.ok(res.body.error.details.some((detail) => detail.toLowerCase().includes('severity')));
    }
});

test('complaint creation accepts the three canonical severity values', () => {
    for (const severity of ['low', 'medium', 'high']) {
        const req = { body: { ...validBody(), severity } };
        let nextCalled = false;
        validateComplaint(req, response(), () => { nextCalled = true; });
        assert.equal(nextCalled, true);
        assert.equal(req.body.severity, severity);
    }
});

test('omitted severity keeps the model default', () => {
    const req = { body: validBody() };
    let nextCalled = false;
    validateComplaint(req, response(), () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(Object.hasOwn(req.body, 'severity'), false);
});

test('legacy high severity with surrounding whitespace remains blocked from volunteer claims', async () => {
    const previous = {
        findByComplaintId: Complaint.findByComplaintId,
        findById: Complaint.findById,
        claim: Complaint.claim
    };
    let claimCalled = false;
    Complaint.findByComplaintId = async () => ({
        id: 1, status: 'Pending', allow_volunteers: 'yes', severity: ' high ', supporter_count: 10
    });
    Complaint.findById = async () => null;
    Complaint.claim = async () => { claimCalled = true; return { id: 1 }; };
    try {
        const res = response();
        await claimComplaint({ params: { id: 'CIV-1' }, dbUser: { id: 7, name: 'Volunteer' } }, res, assert.fail);
        assert.equal(res.statusCode, 400);
        assert.match(res.body.error.message, /government authorities/i);
        assert.equal(claimCalled, false);
    } finally {
        Complaint.findByComplaintId = previous.findByComplaintId;
        Complaint.findById = previous.findById;
        Complaint.claim = previous.claim;
    }
});
