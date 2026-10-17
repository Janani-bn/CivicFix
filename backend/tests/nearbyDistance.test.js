const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const initDatabase = require('../src/config/initDatabase');
const Complaint = require('../src/models/Complaint');

// For these latitudes the spherical law of cosines rounds to just above 1
// when both points are identical, and SQLite's acos() returns NULL for that.
const SAME_POINT_ROUNDING_CASES = [
    [29.154383, 81.787084],
    [25.193497, 95.675282],
    [24.54463, 90.345086],
    [12.579512, 73.500521],
    [21.86297, 91.199723]
];

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

test('a complaint at exactly the searched position is returned with distance 0', async () => {
    for (const [lat, lng] of SAME_POINT_ROUNDING_CASES) {
        const complaint = await createAt(lat, lng, `Same point ${lat}`);

        const results = await Complaint.findNearby(lat, lng, 1);
        const match = results.find((row) => row.id === complaint.id);

        assert.ok(match, `complaint at ${lat},${lng} missing from nearby results`);
        assert.equal(match.distance_km, 0);
    }
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
