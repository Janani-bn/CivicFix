import { test, describe } from 'node:test';
import assert from 'node:assert';
import { countDigits, isAcceptablePhone } from '../src/utils/phoneValidation.js';

describe('Chatbot phone collection', () => {
    test('a full 10-digit number is acceptable', () => {
        assert.strictEqual(isAcceptablePhone('9876543210'), true);
        assert.strictEqual(isAcceptablePhone('+91 98765 43210'), true);
    });

    test('a short number is not acceptable', () => {
        assert.strictEqual(isAcceptablePhone('12345'), false);
        assert.strictEqual(isAcceptablePhone('call me'), false);
    });

    test('an empty value stays permissible', () => {
        assert.strictEqual(isAcceptablePhone(''), true);
        assert.strictEqual(isAcceptablePhone(null), true);
        assert.strictEqual(isAcceptablePhone(undefined), true);
    });

    test('digit counting ignores formatting', () => {
        assert.strictEqual(countDigits('+91-98765-43210'), 12);
        assert.strictEqual(countDigits('no digits here'), 0);
    });
});
