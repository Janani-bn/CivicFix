import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchNearbyComplaints,
  searchComplaintsByArea,
} from '../src/utils/reportIssueLookup.js';

const API_BASE = 'http://example.com/api';

describe('Report Issue Lookup', () => {
  describe('fetchNearbyComplaints', () => {
    test('returns matching nearby complaints', async () => {
      const fetchFn = async () => ({
        json: async () => ({
          success: true,
          data: [
            {
              id: '1',
              area: 'Anna Nagar',
              issue_type: 'Pothole',
            },
          ],
        }),
      });

      const result = await fetchNearbyComplaints({
        lat: 13.08,
        lng: 80.27,
        apiBase: API_BASE,
        fetchFn,
      });

      assert.equal(result.issues.length, 1);
      assert.equal(result.issues[0].area, 'Anna Nagar');
      assert.equal(result.locationName, 'Anna Nagar');
      assert.equal(result.view, 'recommendation');
      assert.equal(result.error, null);
    });

    test('returns empty result when no nearby complaints exist', async () => {
      const fetchFn = async () => ({
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      const result = await fetchNearbyComplaints({
        lat: 13.08,
        lng: 80.27,
        apiBase: API_BASE,
        fetchFn,
      });

      assert.deepEqual(result.issues, []);
      assert.equal(result.view, 'form');
      assert.equal(result.locationError, false);
      assert.equal(result.error, null);
    });

    test('handles nearby lookup network failure without fake complaints', async () => {
      const fetchFn = async () => {
        throw new Error('Network failure');
      };

      const result = await fetchNearbyComplaints({
        lat: 13.08,
        lng: 80.27,
        apiBase: API_BASE,
        fetchFn,
      });

      assert.deepEqual(result.issues, []);
      assert.equal(result.view, 'form');
      assert.equal(result.locationError, true);
      assert.equal(
        result.error,
        'Unable to fetch nearby issues. Please try again.'
      );
    });
  });

  describe('searchComplaintsByArea', () => {
    test('returns matching complaints for a manual area search', async () => {
      const fetchFn = async () => ({
        json: async () => ({
          success: true,
          data: [
            {
              id: '2',
              area: 'Anna Nagar West',
              issue_type: 'Garbage overflow',
            },
            {
              id: '3',
              area: 'Adyar',
              issue_type: 'Pothole',
            },
          ],
        }),
      });

      const result = await searchComplaintsByArea({
        area: 'Anna Nagar',
        apiBase: API_BASE,
        fetchFn,
      });

      assert.equal(result.issues.length, 1);
      assert.equal(result.issues[0].area, 'Anna Nagar West');
      assert.equal(result.locationName, 'Anna Nagar');
      assert.equal(result.view, 'recommendation');
      assert.equal(result.locationError, false);
      assert.equal(result.error, null);
    });

    test('returns empty result when manual area search has no matches', async () => {
      const fetchFn = async () => ({
        json: async () => ({
          success: true,
          data: [
            {
              id: '4',
              area: 'Adyar',
              issue_type: 'Pothole',
            },
          ],
        }),
      });

      const result = await searchComplaintsByArea({
        area: 'Anna Nagar',
        apiBase: API_BASE,
        fetchFn,
      });

      assert.deepEqual(result.issues, []);
      assert.equal(result.view, 'form');
      assert.equal(result.locationError, false);
      assert.equal(result.error, null);
    });

    test('handles manual area search network failure without fake complaints', async () => {
      const fetchFn = async () => {
        throw new Error('Network failure');
      };

      const result = await searchComplaintsByArea({
        area: 'Anna Nagar',
        apiBase: API_BASE,
        fetchFn,
      });

      assert.deepEqual(result.issues, []);
      assert.equal(result.view, 'form');
      assert.equal(result.locationError, true);
      assert.equal(
        result.error,
        'Unable to search nearby issues. Please try again.'
      );
    });
  });
});
