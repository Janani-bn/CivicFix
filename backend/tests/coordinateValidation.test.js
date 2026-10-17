import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The controllers' inline guards — exercised through a thin harness that
// captures res.status/json without a live server.
const mkRes = () => {
  const out = { statusCode: 200, body: null };
  return {
    res: {
      status(c) { out.statusCode = c; return this; },
      json(b) { out.body = b; return this; },
    },
    out,
  };
};

describe('coordinate validation (#126)', () => {
  it('updateLocation rejects non-finite and out-of-range coordinates', async () => {
    const { updateLocation } = await import('../src/controllers/authController.js');
    for (const [latitude, longitude] of [[999, 0], [0, 999], [Infinity, 0], [NaN, 0], [91.5, 0]]) {
      const { res, out } = mkRes();
      await updateLocation({ body: { latitude, longitude }, user: { id: 1 } }, res, () => {});
      assert.equal(out.statusCode, 400, `${latitude},${longitude} must be rejected`);
    }
  });

  it('updateLocation accepts a valid location', async () => {
    const { updateLocation } = await import('../src/controllers/authController.js');
    const { res, out } = mkRes();
    await updateLocation({ body: { latitude: 12.9716, longitude: 77.5946 }, user: { id: 'nonexistent-user-id' } }, res, () => {});
    // the guard passes; the user lookup 404s (no such user in the test DB)
    assert.equal(out.statusCode, 404);
  });

  it('getNearbyComplaints rejects out-of-range lat/lng and oversized radius', async () => {
    const { getNearbyComplaints } = await import('../src/controllers/complaintController.js');
    for (const query of [
      { lat: '95', lng: '0' }, { lat: '0', lng: '181' },
      { lat: 'Infinity', lng: '0' },
      { lat: '12.9', lng: '77.5', radiusKm: '100000' },
      { lat: '12.9', lng: '77.5', radiusKm: '-3' },
    ]) {
      const { res, out } = mkRes();
      await getNearbyComplaints({ query }, res, () => {});
      assert.equal(out.statusCode, 400, JSON.stringify(query));
    }
  });
});
