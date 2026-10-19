import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasSeenWelcome, markWelcomeSeen, WELCOME_STORAGE_KEY } from '../src/utils/welcomeOverlay.js';

const memoryStorage = () => {
    const data = new Map();
    return {
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value))
    };
};

describe('welcome overlay seen flag', () => {
    test('a fresh session has not seen the overlay', () => {
        const storage = memoryStorage();
        assert.strictEqual(hasSeenWelcome(() => storage), false);
    });

    test('dismissing it is remembered for the rest of the session', () => {
        const storage = memoryStorage();
        markWelcomeSeen(() => storage);
        assert.strictEqual(storage.getItem(WELCOME_STORAGE_KEY), '1');
        assert.strictEqual(hasSeenWelcome(() => storage), true);
    });

    test('blocked storage does not crash and just shows the overlay again', () => {
        const blocked = () => {
            throw new Error('SecurityError: storage is disabled');
        };
        assert.strictEqual(hasSeenWelcome(blocked), false);
        assert.doesNotThrow(() => markWelcomeSeen(blocked));
    });

    test('keeps the key the overlay already writes, so existing sessions carry over', () => {
        assert.strictEqual(WELCOME_STORAGE_KEY, 'civicfix_welcomed');
    });
});
