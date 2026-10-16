import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('JSON body limit (#157)', () => {
  it('MAX_JSON_BODY_SIZE defaults to 1mb and is env-overridable', async () => {
    const { MAX_JSON_BODY_SIZE } = await import('../src/utils/aiLimits.js');
    assert.equal(MAX_JSON_BODY_SIZE, process.env.MAX_JSON_BODY_SIZE || '1mb');
  });

  it('server.js mounts express.json with the centralized cap, not 50mb', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
    assert.ok(!src.includes("'50mb'"), 'the 50mb literal must be gone');
    assert.ok(src.includes('MAX_JSON_BODY_SIZE'), 'server must use the centralized cap');
  });
});
