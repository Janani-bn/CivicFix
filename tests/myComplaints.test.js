import { test, describe } from 'node:test';
import assert from 'node:assert';
import { fetchMyComplaints } from '../src/utils/myComplaintsLogic.js';

function mockFetch(submittedResponse, joinedResponse) {
    return async (url) => {
        if (url.includes('/complaints/user')) return submittedResponse;
        if (url.includes('/complaints/joined')) return joinedResponse;
        throw new Error(`Unexpected URL: ${url}`);
    };
}

describe('MyComplaints fetch logic (#83, #176)', () => {
    test('joined-complaints HTTP failure throws instead of silently returning empty', async () => {
        const fetchFn = mockFetch(
            { ok: true, json: async () => ({ data: [{ id: 1 }] }) },
            { ok: false, json: async () => ({ error: { message: 'Joined fetch failed' } }) }
        );

        await assert.rejects(
            () => fetchMyComplaints('http://localhost/api', 'token', fetchFn),
            /Joined fetch failed/
        );
    });

    test('submitted-complaints HTTP failure throws', async () => {
        const fetchFn = mockFetch(
            { ok: false, json: async () => ({ error: { message: 'Submitted fetch failed' } }) },
            { ok: true, json: async () => ({ data: [] }) }
        );

        await assert.rejects(
            () => fetchMyComplaints('http://localhost/api', 'token', fetchFn),
            /Submitted fetch failed/
        );
    });

    test('network failure throws instead of returning mock data', async () => {
        const fetchFn = async () => { throw new Error('Network error'); };

        await assert.rejects(
            () => fetchMyComplaints('http://localhost/api', 'token', fetchFn),
            /Network error/
        );
    });

    test('both responses OK returns submitted and joined data', async () => {
        const fetchFn = mockFetch(
            { ok: true, json: async () => ({ data: [{ id: 1 }] }) },
            { ok: true, json: async () => ({ data: [{ id: 2 }] }) }
        );

        const result = await fetchMyComplaints('http://localhost/api', 'token', fetchFn);
        assert.deepStrictEqual(result.submitted, [{ id: 1 }]);
        assert.deepStrictEqual(result.joined, [{ id: 2 }]);
    });
});
