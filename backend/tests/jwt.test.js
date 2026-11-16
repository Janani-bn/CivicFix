const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('JWT Config Security Tests', () => {
    // Helper to reload config in a clean environment
    const loadConfig = (secretValue) => {
        // Backup process.env
        const backupEnv = { ...process.env };

        // Remove from cache if loaded
        const configPath = require.resolve('../src/config/jwt');
        delete require.cache[configPath];

        try {
            if (secretValue === undefined) {
                delete process.env.JWT_SECRET;
            } else {
                process.env.JWT_SECRET = secretValue;
            }
            // Require the module (it evaluates immediately)
            return require('../src/config/jwt');
        } finally {
            // Restore process.env
            process.env = backupEnv;
        }
    };

    test('Throws on missing JWT_SECRET', () => {
        assert.throws(() => loadConfig(undefined), /JWT_SECRET environment variable is required/);
    });

    test('Throws on empty/whitespace JWT_SECRET', () => {
        assert.throws(() => loadConfig('   '), /JWT_SECRET environment variable is required/);
    });

    test('Throws on default placeholder JWT_SECRET', () => {
        assert.throws(() => loadConfig('your_secure_random_secret_here'), /JWT_SECRET must not be the default placeholder/);
    });

    test('Throws on short JWT_SECRET (< 32 chars)', () => {
        assert.throws(() => loadConfig('a'.repeat(31)), /JWT_SECRET must be securely generated and at least 32 characters long/);
    });

    test('Succeeds on valid 32+ char JWT_SECRET', () => {
        const validSecret = 'x'.repeat(48);
        const { JWT_SECRET } = loadConfig(validSecret);
        assert.strictEqual(JWT_SECRET, validSecret);
    });
});
