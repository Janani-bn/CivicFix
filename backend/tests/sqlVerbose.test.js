import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';

describe('SQLite verbose logging gating (#167)', () => {
  it('statement logging is enabled only in development', () => {
    const src = fs.readFileSync(new URL('../src/config/database.js', import.meta.url), 'utf8');
    assert.ok(src.includes("process.env.NODE_ENV === 'development'"), 'verbose must be env-gated');
    assert.ok(!src.includes('{ verbose: console.log });'), 'unconditional verbose must be gone');
  });

  it('query errors are still reported regardless of environment', () => {
    const src = fs.readFileSync(new URL('../src/config/database.js', import.meta.url), 'utf8');
    assert.ok(src.includes("console.error('SQLite Query Error:'"), 'error reporting stays');
  });
});
