const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const initDatabase = require('../src/config/initDatabase');
const Complaint = require('../src/models/Complaint');

// For these latitudes the spherical law of cosines rounds to just above 1
// when both points are identical, and SQLite's acos() returns NULL for that.
// Which latitudes round up depends on the platform's math library, so the
// tests also sweep a grid of latitudes.
const SAME_POINT_ROUNDING_CASES = [
    [29.154383, 81.787084],
    [25.193497, 95.675282],
    [24.54463, 90.345086],
    [12.579512, 73.500521],
    [21.86297, 91.199723]
];

const LATITUDE_GRID = Array.from({ length: 250 }, (_, i) => Number((8 + i * 0.12).toFixed(2)));

// Rounding can also land just below 1, which gives a tiny non-zero distance.
const SAME_POINT_TOLERANCE_KM = 0.001;

const createdIds = [];

const createAt = async (latitude, longitude, area) => {
    const complaint = await Complaint.create({
        name: 'Nearby test',
        phone: '9876543210',
        area,
        city: 'Test city',
        issueType: 'Pothole',
        description: 'Pothole used by the nearby distance test',
        latitude,
        longitude
    });
    createdIds.push(complaint.id);
    return complaint;
};

before(async () => {
    await initDatabase();
});

after(async () => {
    for (const id of createdIds) {
        await Complaint.delete(id);
    }
});

test('a complaint at exactly the searched position is returned with distance ~0', async () => {
    const points = [
        ...SAME_POINT_ROUNDING_CASES,
        ...LATITUDE_GRID.map((lat) => [lat, 77.5946])
    ];
    const missing = [];

    for (const [lat, lng] of points) {
        const complaint = await createAt(lat, lng, `Same point ${lat}`);

        const results = await Complaint.findNearby(lat, lng, 1);
        const match = results.find((row) => row.id === complaint.id);

        if (!match || !(match.distance_km < SAME_POINT_TOLERANCE_KM)) {
            missing.push(`${lat},${lng} -> ${match ? match.distance_km : 'not returned'}`);
        }
    }

    assert.deepEqual(missing, [], `same-position complaints dropped or misplaced:\n${missing.join('\n')}`);
});

test('nearby distances still filter by radius', async () => {
    const [lat, lng] = SAME_POINT_ROUNDING_CASES[0];
    // About 1.1 km north and about 111 km north of the search point.
    const close = await createAt(lat + 0.01, lng, 'About 1 km away');
    const far = await createAt(lat + 1, lng, 'About 111 km away');

    const results = await Complaint.findNearby(lat, lng, 5);
    const closeMatch = results.find((row) => row.id === close.id);

    assert.ok(closeMatch);
    assert.ok(Math.abs(closeMatch.distance_km - 1.11) < 0.01);
    assert.equal(results.some((row) => row.id === far.id), false);
});
