import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
    fetchAdminComplaints,
    fetchAdminDuplicates,
    requestAssignDepartment
} from '../src/utils/adminDashboardLogic.js';

const okComplaints = [
    { id: 1, complaint_id: 'CIV-1', supporter_count: 2, created_at: '2026-10-02T00:00:00.000Z' },
    { id: 2, complaint_id: 'CIV-2', supporter_count: 9, created_at: '2026-10-01T00:00:00.000Z' },
    { id: 3, complaint_id: 'CIV-3', supporter_count: 9, created_at: '2026-10-03T00:00:00.000Z' }
];

const jsonResponse = (ok, body) => ({
    ok,
    json: async () => body
});

describe('Admin dashboard requests', () => {
    test('a throwing complaints request rejects instead of inventing rows', async () => {
        const fetchFn = async () => {
            throw new Error('backend down');
        };

        await assert.rejects(
            () => fetchAdminComplaints({ apiBase: 'http://x/api', fetchFn }),
            /backend down/
        );
    });

    test('a non-OK complaints response rejects with the server message', async () => {
        const fetchFn = async () =>
            jsonResponse(false, { error: { message: 'db exploded' } });

        await assert.rejects(
            () => fetchAdminComplaints({ apiBase: 'http://x/api', fetchFn }),
            /db exploded/
        );
    });

    test('complaints arrive sorted by demand then recency', async () => {
        const fetchFn = async () => jsonResponse(true, { success: true, data: okComplaints });

        const out = await fetchAdminComplaints({ apiBase: 'http://x/api', fetchFn });
        assert.deepStrictEqual(out.map((c) => c.complaint_id), ['CIV-3', 'CIV-2', 'CIV-1']);
    });

    test('a non-OK duplicates response rejects instead of keeping stale groups', async () => {
        const fetchFn = async () =>
            jsonResponse(false, { error: { message: 'grouping failed' } });

        await assert.rejects(
            () => fetchAdminDuplicates({ apiBase: 'http://x/api', fetchFn }),
            /grouping failed/
        );
    });

    test('a throwing duplicates request rejects', async () => {
        const fetchFn = async () => {
            throw new Error('network cut');
        };

        await assert.rejects(
            () => fetchAdminDuplicates({ apiBase: 'http://x/api', fetchFn }),
            /network cut/
        );
    });

    test('a successful assignment resolves with the backend payload', async () => {
        const updated = { id: 7, department: 'Sanitation' };
        const seen = [];
        const fetchFn = async (url, opts) => {
            seen.push([url, JSON.parse(opts.body)]);
            return jsonResponse(true, { success: true, data: updated });
        };

        const out = await requestAssignDepartment({
            apiBase: 'http://x/api',
            complaintId: 7,
            department: 'Sanitation',
            fetchFn
        });
        assert.deepStrictEqual(out, updated);
        assert.deepStrictEqual(seen, [
            ['http://x/api/assign', { complaintId: '7', department: 'Sanitation' }]
        ]);
    });

    test('a rejected assignment surfaces the server message', async () => {
        const fetchFn = async () =>
            jsonResponse(false, { error: { message: 'no such complaint' } });

        await assert.rejects(
            () =>
                requestAssignDepartment({
                    apiBase: 'http://x/api',
                    complaintId: 99,
                    department: 'Sanitation',
                    fetchFn
                }),
            /no such complaint/
        );
    });
});
