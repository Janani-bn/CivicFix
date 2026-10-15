const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

const loadFreshPool = () => {
    const resolved = require.resolve('../src/config/database');
    delete require.cache[resolved];
    return require('../src/config/database');
};

describe('Database query logging', () => {
    let prevEnv;
    let prevLog;
    let logged;

    beforeEach(() => {
        prevEnv = process.env.NODE_ENV;
        prevLog = console.log;
        logged = 0;
        console.log = () => {
            logged += 1;
        };
    });

    afterEach(() => {
        console.log = prevLog;
        if (prevEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = prevEnv;
        delete require.cache[require.resolve('../src/config/database')];
    });

    test('statements are logged in development', async () => {
        process.env.NODE_ENV = 'development';
        const pool = loadFreshPool();
        await pool.query('SELECT 1 AS one');
        assert.ok(logged > 0);
    });

    test('statements stay out of logs outside development', async () => {
        delete process.env.NODE_ENV;
        const pool = loadFreshPool();
        const out = await pool.query('SELECT 1 AS one');
        assert.strictEqual(out.rows[0].one, 1);
        assert.strictEqual(logged, 0);
    });
});
