import { test, describe } from 'node:test';
import assert from 'node:assert';
import { submitComplaint } from '../src/utils/submitComplaintLogic.js';

describe('Complaint submission: error surfacing after mock removal (#56)', () => {
    test('network failure throws an error instead of faking success', async () => {
        const fetchFn = async () => {
            throw new Error('Network error: Failed to fetch');
        };

        await assert.rejects(
            () => submitComplaint('http://localhost:3000/api', new FormData(), null, fetchFn),
            /Network error: Failed to fetch/
        );
    });

    test('non-OK response throws the server error message', async () => {
        const fetchFn = async () => ({
            ok: false,
            json: async () => ({
                error: { message: 'Missing required fields' }
            })
        });

        await assert.rejects(
            () => submitComplaint('http://localhost:3000/api', new FormData(), null, fetchFn),
            /Missing required fields/
        );
    });

    test('non-OK response without error message uses default', async () => {
        const fetchFn = async () => ({
            ok: false,
            json: async () => ({})
        });

        await assert.rejects(
            () => submitComplaint('http://localhost:3000/api', new FormData(), null, fetchFn),
            /The server rejected your submission/
        );
    });

    test('successful submission returns response data', async () => {
        const fetchFn = async () => ({
            ok: true,
            json: async () => ({
                success: true,
                data: { complaintId: 'CMP-1234' }
            })
        });

        const result = await submitComplaint('http://localhost:3000/api', new FormData(), 'token123', fetchFn);
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.data.complaintId, 'CMP-1234');
    });
});
