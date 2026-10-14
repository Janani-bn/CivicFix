import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isMyCaseForUser } from '../src/utils/volunteerOwnership.js';

describe('Volunteer claimed-case ownership', () => {
    test('same name with a different owner ID is not my case', () => {
        const report = { status: 'In Progress', claimed_by_user_id: 11, claimed_by: 'Arun' };
        assert.strictEqual(isMyCaseForUser(report, { id: 22, name: 'Arun' }), false);
    });

    test('matching owner ID is my case even with a different stored name', () => {
        const report = { status: 'In Progress', claimed_by_user_id: 22, claimed_by: 'Someone Else' };
        assert.strictEqual(isMyCaseForUser(report, { id: 22, name: 'Arun' }), true);
    });

    test('legacy rows without an ID still match by name', () => {
        const report = { status: 'In Progress', claimed_by_user_id: null, claimed_by: 'Arun' };
        assert.strictEqual(isMyCaseForUser(report, { id: 22, name: 'Arun' }), true);
    });

    test('non in-progress rows are never my case', () => {
        const report = { status: 'Pending', claimed_by_user_id: 22, claimed_by: 'Arun' };
        assert.strictEqual(isMyCaseForUser(report, { id: 22, name: 'Arun' }), false);
    });
});
