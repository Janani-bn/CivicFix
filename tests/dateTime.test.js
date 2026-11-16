/* global process */
// Run as an Indian user would see it. In UTC (like CI) the bug is invisible,
// because reading a UTC timestamp as local time gives the same instant.
process.env.TZ = 'Asia/Kolkata';

import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseServerDate, formatServerDate, formatServerDateTime } from '../src/utils/dateTime.js';
import { formatDateTime } from '../src/utils/liveFeedLogic.js';
import TrackComplaintResult from '../src/components/TrackComplaintResult.js';

// What the API actually returns: SQLite CURRENT_TIMESTAMP, UTC with no marker.
const SQLITE_TIMESTAMP = '2026-10-19 08:56:31';
const SAME_INSTANT = new Date('2026-10-19T08:56:31Z');

describe('parseServerDate', () => {
    test('reads SQLite timestamps as UTC, not local time', () => {
        assert.strictEqual(parseServerDate(SQLITE_TIMESTAMP).toISOString(), '2026-10-19T08:56:31.000Z');
        assert.strictEqual(parseServerDate('2026-10-19T08:56:31').toISOString(), '2026-10-19T08:56:31.000Z');
        assert.strictEqual(parseServerDate('2026-10-19 08:56').toISOString(), '2026-10-19T08:56:00.000Z');
    });

    test('keeps values that already carry a timezone', () => {
        assert.strictEqual(parseServerDate('2026-10-19T08:56:31Z').toISOString(), '2026-10-19T08:56:31.000Z');
        assert.strictEqual(parseServerDate('2026-10-19T14:26:31+05:30').toISOString(), '2026-10-19T08:56:31.000Z');
        assert.strictEqual(parseServerDate(SAME_INSTANT), SAME_INSTANT);
    });

    test('returns null for empty or invalid values', () => {
        assert.strictEqual(parseServerDate(null), null);
        assert.strictEqual(parseServerDate(undefined), null);
        assert.strictEqual(parseServerDate(''), null);
        assert.strictEqual(parseServerDate('not a date'), null);
    });
});

describe('formatting server timestamps for display', () => {
    test('shows the real local time of a complaint', () => {
        const shown = formatServerDateTime(SQLITE_TIMESTAMP, 'en-IN', {
            hour: '2-digit', minute: '2-digit', hour12: false
        });
        assert.strictEqual(shown, '14:26');
    });

    test('a complaint filed just after midnight IST keeps its own date', () => {
        // 00:30 IST on Oct 20 is 19:00 UTC on Oct 19.
        assert.strictEqual(formatServerDate('2026-10-19 19:00:00', 'en-IN'), '20/10/2026');
    });

    test('empty and unparseable values fall back like before', () => {
        assert.strictEqual(formatServerDateTime(null), '');
        assert.strictEqual(formatServerDateTime('soon'), 'soon');
        assert.strictEqual(formatServerDate(''), '');
    });

    test('live feed and comments use the corrected time', () => {
        assert.strictEqual(formatDateTime(SQLITE_TIMESTAMP), SAME_INSTANT.toLocaleString());
    });

    test('track page shows the corrected submitted and updated times', () => {
        const html = renderToStaticMarkup(React.createElement(TrackComplaintResult, {
            complaint: {
                complaint_id: 'CIV-TIME01',
                status: 'Pending',
                issue_type: 'Pothole',
                severity: 'high',
                department: 'Roads Department',
                description: 'Timestamp check',
                area: 'Velachery',
                city: 'Chennai',
                name: 'Tester',
                phone: '9876543210',
                created_at: SQLITE_TIMESTAMP,
                updated_at: SQLITE_TIMESTAMP
            }
        }));

        assert.match(html, /Submitted on 19 October 2026 at 02:26 pm/i);
        assert.doesNotMatch(html, /08:56/);
    });
});
