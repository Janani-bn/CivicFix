import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  fetchMyComplaints,
} from '../src/utils/myComplaintsLogic.js';

const jsonResponse = (data, ok = true) => ({
  ok,
  json: async () => data,
});

const getMyComplaintsView = ({
  loading,
  error,
  submitted,
  joined,
  activeTab,
}) => {
  const list = activeTab === 'submitted' ? submitted : joined;

  const showInitialLoadError =
    Boolean(error) &&
    submitted.length === 0 &&
    joined.length === 0;

  if (loading) return 'loading';
  if (showInitialLoadError) return 'error';
  if (list.length === 0) return 'empty';
  return 'list';
};

test('shows error state on My Reports when /complaints/user fails during initial load', async () => {
  const fetchFn = async (url) => {
    if (url.endsWith('/complaints/user')) {
      throw new Error('Failed to fetch your reports');
    }

    return jsonResponse({
      data: [],
    });
  };

  await assert.rejects(
    () =>
      fetchMyComplaints(
        'http://localhost:3000/api',
        'test-token',
        fetchFn
      ),
    /Failed to fetch your reports/
  );

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: 'Failed to fetch your reports',
      submitted: [],
      joined: [],
      activeTab: 'submitted',
    }),
    'error'
  );
});

test('shows error state on Joined Reports when /complaints/user fails during initial load', async () => {
  const fetchFn = async (url) => {
    if (url.endsWith('/complaints/user')) {
      throw new Error('Failed to fetch your reports');
    }

    return jsonResponse({
      data: [],
    });
  };

  await assert.rejects(
    () =>
      fetchMyComplaints(
        'http://localhost:3000/api',
        'test-token',
        fetchFn
      ),
    /Failed to fetch your reports/
  );

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: 'Failed to fetch your reports',
      submitted: [],
      joined: [],
      activeTab: 'joined',
    }),
    'error'
  );
});

test('shows error state on My Reports when /complaints/joined fails during initial load', async () => {
  const fetchFn = async (url) => {
    if (url.endsWith('/complaints/joined')) {
      throw new Error('Failed to fetch joined reports');
    }

    return jsonResponse({
      data: [],
    });
  };

  await assert.rejects(
    () =>
      fetchMyComplaints(
        'http://localhost:3000/api',
        'test-token',
        fetchFn
      ),
    /Failed to fetch joined reports/
  );

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: 'Failed to fetch joined reports',
      submitted: [],
      joined: [],
      activeTab: 'submitted',
    }),
    'error'
  );
});

test('shows error state on Joined Reports when /complaints/joined fails during initial load', async () => {
  const fetchFn = async (url) => {
    if (url.endsWith('/complaints/joined')) {
      throw new Error('Failed to fetch joined reports');
    }

    return jsonResponse({
      data: [],
    });
  };

  await assert.rejects(
    () =>
      fetchMyComplaints(
        'http://localhost:3000/api',
        'test-token',
        fetchFn
      ),
    /Failed to fetch joined reports/
  );

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: 'Failed to fetch joined reports',
      submitted: [],
      joined: [],
      activeTab: 'joined',
    }),
    'error'
  );
});

test('keeps the normal empty state when both requests succeed with no reports', async () => {
  const fetchFn = async () =>
    jsonResponse({
      data: [],
    });

  const result = await fetchMyComplaints(
    'http://localhost:3000/api',
    'test-token',
    fetchFn
  );

  assert.deepStrictEqual(result, {
    submitted: [],
    joined: [],
  });

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: '',
      submitted: [],
      joined: [],
      activeTab: 'submitted',
    }),
    'empty'
  );

  assert.strictEqual(
    getMyComplaintsView({
      loading: false,
      error: '',
      submitted: [],
      joined: [],
      activeTab: 'joined',
    }),
    'empty'
  );
});
