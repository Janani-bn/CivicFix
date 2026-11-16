import { test, describe } from 'node:test';
import assert from 'node:assert';
import { statusBadgeClass } from '../src/utils/complaintStatus.js';

describe('Track complaint status badge', () => {
    test('missing statuses render a neutral class instead of throwing', () => {
        assert.strictEqual(statusBadgeClass(undefined), '');
        assert.strictEqual(statusBadgeClass(null), '');
        assert.strictEqual(statusBadgeClass(''), '');
    });

    test('known statuses map to badge classes', () => {
        assert.strictEqual(statusBadgeClass('Pending'), 'pending');
        assert.strictEqual(statusBadgeClass('In Progress'), 'in-progress');
        assert.strictEqual(statusBadgeClass('Resolved'), 'resolved');
    });
});
