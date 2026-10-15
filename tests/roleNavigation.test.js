import { test, describe } from 'node:test';
import assert from 'node:assert';
import { destinationForRole } from '../src/utils/roleNavigation.js';

describe('Login role destinations', () => {
    test('volunteer accounts go to the volunteer dashboard', () => {
        assert.strictEqual(destinationForRole('volunteer'), '/volunteer');
    });

    test('admin accounts go to the admin dashboard', () => {
        assert.strictEqual(destinationForRole('admin'), '/admin');
    });

    test('citizens go to the feed', () => {
        assert.strictEqual(destinationForRole('citizen'), '/feed');
    });

    test('unknown or missing roles fall back to the feed', () => {
        assert.strictEqual(destinationForRole('user'), '/feed');
        assert.strictEqual(destinationForRole(undefined), '/feed');
        assert.strictEqual(destinationForRole(null), '/feed');
    });
});
