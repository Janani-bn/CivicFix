const { test } = require('node:test');
const assert = require('node:assert');

const { generateWhatsAppLink } = require('../src/utils/whatsapp');

const details = {
    complaintId: 'CIV-TEST',
    issueType: 'Road Damage',
    area: 'Test Area',
    city: 'Test City',
    status: 'Pending'
};

test('adds India country code to a 10-digit number starting with 91', () => {
    const link = generateWhatsAppLink('9123456789', details);

    assert.ok(link.includes('wa.me/919123456789'));
});

test('adds India country code to a normal 10-digit number', () => {
    const link = generateWhatsAppLink('9876543210', details);

    assert.ok(link.includes('wa.me/919876543210'));
});

test('does not add country code to an already country-coded number', () => {
    const link = generateWhatsAppLink('919123456789', details);

    assert.ok(link.includes('wa.me/919123456789'));
});

test('keeps a valid international number within E.164 length', () => {
    const link = generateWhatsAppLink('15551234567', details);

    assert.ok(link.includes('wa.me/15551234567'));
});

test('returns null for digit strings longer than any real number', () => {
    assert.strictEqual(generateWhatsAppLink('1'.repeat(16), details), null);
    assert.strictEqual(generateWhatsAppLink('9'.repeat(20), details), null);
});

test('returns null when no phone is given', () => {
    assert.strictEqual(generateWhatsAppLink('', details), null);
    assert.strictEqual(generateWhatsAppLink(null, details), null);
});
