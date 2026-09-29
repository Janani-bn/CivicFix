import { test, describe } from 'node:test';
import assert from 'node:assert';
import { fetchLiveFeed } from '../src/utils/liveFeedLogic.js';

describe('LiveFeed API handling', () => {
  test('failed /complaints request throws an error instead of returning fake data', async () => {
    const fetchFn = async () => {
      throw new Error('Network error: Failed to fetch');
    };

    await assert.rejects(
      () => fetchLiveFeed('http://localhost:3000/api', fetchFn),
      /Network error: Failed to fetch/
    );
  });

  test('non-OK /complaints response throws the API error', async () => {
    const fetchFn = async () => ({
      ok: false,
      json: async () => ({
        error: {
          message: 'Failed to load feed from server'
        }
      })
    });

    await assert.rejects(
      () => fetchLiveFeed('http://localhost:3000/api', fetchFn),
      /Failed to load feed from server/
    );
  });
});
