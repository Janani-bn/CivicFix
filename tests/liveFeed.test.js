import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  fetchComments,
  postCommentApi,
  CommentSection,
  formatDateTime
} from '../src/utils/liveFeedLogic.js';

describe('LiveFeed Comments Logic and UI Tests (Issue #72)', () => {
  describe('1. Successful Comment Loading', () => {
    test('fetchComments returns backend comments on 200 response', async () => {
      const mockComments = [
        {
          id: 1,
          complaint_id: 'CMP-100',
          author_name: 'Concerned Citizen',
          message: 'Streetlight is completely dark.',
          created_at: '2026-09-30T10:00:00Z'
        },
        {
          id: 2,
          complaint_id: 'CMP-100',
          author_name: 'Ward Officer',
          message: 'Scheduled for inspection tomorrow morning.',
          created_at: '2026-09-30T11:00:00Z'
        }
      ];

      const fetchFn = async (url) => {
        assert.ok(url.includes('/comments/CMP-100'));
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, count: 2, data: mockComments })
        };
      };

      const result = await fetchComments('CMP-100', {
        apiBase: 'http://localhost:3000/api',
        fetchFn
      });

      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].author_name, 'Concerned Citizen');
      assert.strictEqual(result[1].author_name, 'Ward Officer');
      assert.strictEqual(result[0].message, 'Streetlight is completely dark.');
    });

    test('CommentSection displays backend comments and no fake admin comment', () => {
      const mockComments = [
        {
          id: 1,
          complaint_id: 'CMP-100',
          author_name: 'Jane Citizen',
          message: 'Water pipe is leaking heavily.',
          created_at: '2026-09-30T09:00:00Z'
        }
      ];

      const html = renderToStaticMarkup(
        React.createElement(CommentSection, {
          complaintId: 'CMP-100',
          commentState: { loading: false, error: '', list: mockComments },
          draft: { name: '', message: '', posting: false, error: '' }
        })
      );

      assert.ok(html.includes('Jane Citizen'));
      assert.ok(html.includes('Water pipe is leaking heavily.'));
      assert.ok(!html.includes('City Admin'));
      assert.ok(!html.includes('We are looking into this issue.'));
      assert.ok(!html.includes('error-banner'));
      assert.ok(!html.includes('No comments yet'));
    });
  });

  describe('2. Empty Comment Response', () => {
    test('fetchComments returns empty list when backend has no comments', async () => {
      const fetchFn = async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, count: 0, data: [] })
      });

      const result = await fetchComments('CMP-EMPTY', {
        apiBase: 'http://localhost:3000/api',
        fetchFn
      });

      assert.deepStrictEqual(result, []);
      assert.strictEqual(result.length, 0);
    });

    test('CommentSection shows legitimate empty state and no fake comments', () => {
      const html = renderToStaticMarkup(
        React.createElement(CommentSection, {
          complaintId: 'CMP-EMPTY',
          commentState: { loading: false, error: '', list: [] },
          draft: { name: '', message: '', posting: false, error: '' }
        })
      );

      assert.ok(html.includes('No comments yet — be the first.'));
      assert.ok(!html.includes('City Admin'));
      assert.ok(!html.includes('We are looking into this issue.'));
      assert.ok(!html.includes('error-banner'));
    });
  });

  describe('3. Failed Comment Loading', () => {
    test('fetchComments rejects on 500 server error without returning fake comments', async () => {
      const fetchFn = async () => ({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: { message: 'Database connection failed' }
        })
      });

      await assert.rejects(
        async () => {
          await fetchComments('CMP-ERR', {
            apiBase: 'http://localhost:3000/api',
            fetchFn
          });
        },
        (err) => {
          assert.strictEqual(err.message, 'Database connection failed');
          return true;
        }
      );
    });

    test('fetchComments rejects on network failure without returning fake comments', async () => {
      const fetchFn = async () => {
        throw new Error('Network error: connection refused');
      };

      await assert.rejects(
        async () => {
          await fetchComments('CMP-NET-ERR', {
            apiBase: 'http://localhost:3000/api',
            fetchFn
          });
        },
        (err) => {
          assert.ok(err.message.includes('Network error'));
          return true;
        }
      );
    });

    test('CommentSection displays error message and Retry button on load failure', () => {
      const html = renderToStaticMarkup(
        React.createElement(CommentSection, {
          complaintId: 'CMP-FAIL',
          commentState: {
            loading: false,
            error: 'Failed to load comments. Please try again.',
            list: []
          },
          draft: { name: '', message: '', posting: false, error: '' },
          onRetryLoad: () => {}
        })
      );

      // Verify error banner and Retry button are displayed
      assert.ok(html.includes('Failed to load comments. Please try again.'));
      assert.ok(html.includes('Retry'));

      // Verify no fake admin reply is fabricated or shown
      assert.ok(!html.includes('City Admin'));
      assert.ok(!html.includes('We are looking into this issue.'));

      // Empty comments placeholder should NOT be displayed when request failed
      assert.ok(!html.includes('No comments yet — be the first.'));
    });
  });

  describe('4. Successful Comment Posting', () => {
    test('postCommentApi posts to backend and returns confirmed comment', async () => {
      let postBody = null;
      const fetchFn = async (url, options) => {
        assert.ok(url.endsWith('/comments'));
        assert.strictEqual(options.method, 'POST');
        postBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: {
              id: 99,
              complaint_id: postBody.complaintId,
              author_name: postBody.name,
              message: postBody.message,
              created_at: '2026-09-30T12:00:00Z'
            }
          })
        };
      };

      const result = await postCommentApi(
        {
          complaintId: 'CMP-POST',
          name: 'Dev Reporter',
          message: 'Pothole marked with spray paint.'
        },
        { apiBase: 'http://localhost:3000/api', fetchFn }
      );

      assert.strictEqual(result.id, 99);
      assert.strictEqual(result.complaint_id, 'CMP-POST');
      assert.strictEqual(result.author_name, 'Dev Reporter');
      assert.strictEqual(result.message, 'Pothole marked with spray paint.');
    });

    test('CommentSection renders confirmed comment after post', () => {
      const comments = [
        {
          id: 101,
          complaint_id: 'CMP-POST',
          author_name: 'Dev Reporter',
          message: 'Pothole marked with spray paint.',
          created_at: '2026-09-30T12:00:00Z'
        }
      ];

      const html = renderToStaticMarkup(
        React.createElement(CommentSection, {
          complaintId: 'CMP-POST',
          commentState: { loading: false, error: '', list: comments },
          draft: { name: 'Dev Reporter', message: '', posting: false, error: '' }
        })
      );

      assert.ok(html.includes('Dev Reporter'));
      assert.ok(html.includes('Pothole marked with spray paint.'));
      assert.ok(!html.includes('City Admin'));
      assert.ok(!html.includes('We are looking into this issue.'));
    });
  });

  describe('5. Failed Comment Posting', () => {
    test('postCommentApi rejects on non-2xx status and creates no fake reply', async () => {
      const fetchFn = async () => ({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: { message: 'message is required' }
        })
      });

      await assert.rejects(
        async () => {
          await postCommentApi(
            { complaintId: 'CMP-POST-FAIL', name: 'Citizen', message: 'Test message' },
            { apiBase: 'http://localhost:3000/api', fetchFn }
          );
        },
        (err) => {
          assert.strictEqual(err.message, 'message is required');
          return true;
        }
      );
    });

    test('postCommentApi rejects when message is empty without making request', async () => {
      let called = false;
      const fetchFn = async () => {
        called = true;
      };

      await assert.rejects(
        async () => {
          await postCommentApi(
            { complaintId: 'CMP-EMPTY-MSG', name: 'Citizen', message: '   ' },
            { apiBase: 'http://localhost:3000/api', fetchFn }
          );
        },
        (err) => {
          assert.strictEqual(err.message, 'Message cannot be empty');
          return true;
        }
      );
      assert.strictEqual(called, false);
    });

    test('CommentSection preserves user draft and shows error with Retry on post failure', () => {
      const html = renderToStaticMarkup(
        React.createElement(CommentSection, {
          complaintId: 'CMP-POST-FAIL',
          commentState: { loading: false, error: '', list: [] },
          draft: {
            name: 'Citizen Draft',
            message: 'My unsubmitted important report detail',
            posting: false,
            error: 'Failed to post comment. Please try again.'
          }
        })
      );

      // Verify post error message is displayed
      assert.ok(html.includes('Failed to post comment. Please try again.'));
      assert.ok(html.includes('Retry'));

      // Verify draft inputs preserve user entered text
      assert.ok(html.includes('value="Citizen Draft"'));
      assert.ok(html.includes('value="My unsubmitted important report detail"'));

      // Verify NO fake admin comment was added or rendered
      assert.ok(!html.includes('City Admin'));
      assert.ok(!html.includes('We are looking into this issue.'));
    });
  });

  describe('6. formatDateTime helper', () => {
    test('returns empty string for null/undefined/empty input', () => {
      assert.strictEqual(formatDateTime(null), '');
      assert.strictEqual(formatDateTime(undefined), '');
      assert.strictEqual(formatDateTime(''), '');
    });

    test('formats valid ISO date correctly', () => {
      const formatted = formatDateTime('2026-09-30T10:00:00Z');
      assert.ok(typeof formatted === 'string' && formatted.length > 0);
    });
  });
});
