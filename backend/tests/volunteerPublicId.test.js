const { test, describe } = require('node:test');
const assert = require('node:assert');
const Complaint = require('../src/models/Complaint');

describe('Volunteer model public ID lookup', () => {
    test('claim accepts a CIV- public ID directly', async () => {
        const created = await Complaint.create({
            name: 'Public ID Claim',
            phone: '9876543210',
            area: 'Public Area',
            city: 'Public City',
            issueType: 'Pothole',
            description: 'Claim this by public ID.',
            allowVolunteers: 'yes'
        });
        assert.ok(created.complaint_id.startsWith('CIV-'));

        const claimed = await Complaint.claim(created.complaint_id, 99991, 'Public Volunteer');
        assert.ok(claimed);
        assert.strictEqual(claimed.status, 'In Progress');
    });

    test('resolve accepts a CIV- public ID directly', async () => {
        const created = await Complaint.create({
            name: 'Public ID Resolve',
            phone: '9876543210',
            area: 'Public Area',
            city: 'Public City',
            issueType: 'Pothole',
            description: 'Resolve this by public ID.',
            allowVolunteers: 'yes'
        });

        const claimed = await Complaint.claim(created.id, 99992, 'Public Volunteer');
        assert.ok(claimed);

        const resolved = await Complaint.resolve(created.complaint_id, 99992, 'Public Volunteer');
        assert.ok(resolved);
        assert.strictEqual(resolved.status, 'Resolved');
    });

    test('unknown public ID returns null', async () => {
        const claimed = await Complaint.claim('CIV-DOESNOTEXIST', 99993, 'Nobody');
        assert.strictEqual(claimed, null);
    });
});
