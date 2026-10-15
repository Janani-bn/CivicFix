import { test, describe } from 'node:test';
import assert from 'node:assert';
import { processReports } from '../src/utils/liveMapLogic.js';

const base = {
    complaint_id: 'CIV-ZERO',
    issue_type: 'Pothole',
    area: 'Equator Town',
    city: 'Zero City',
    status: 'Pending'
};

describe('Live map zero coordinates', () => {
    test('a report at latitude zero survives the merge', () => {
        const out = processReports([{ ...base, latitude: 0, longitude: 80 }], []);
        assert.strictEqual(out.length, 1);
        assert.strictEqual(out[0].lat, 0);
    });

    test('a report at longitude zero survives the merge', () => {
        const out = processReports([{ ...base, latitude: 13, longitude: 0 }], []);
        assert.strictEqual(out.length, 1);
        assert.strictEqual(out[0].lng, 0);
    });

    test('reports without coordinates are still dropped', () => {
        const out = processReports(
            [{ ...base, complaint_id: 'CIV-NONE' }],
            []
        );
        assert.strictEqual(out.length, 0);
    });
});
