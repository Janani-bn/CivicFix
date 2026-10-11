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
