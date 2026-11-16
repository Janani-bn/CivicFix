import { test, describe } from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TrackComplaintResult from '../src/components/TrackComplaintResult.js';

const baseComplaint = {
    complaint_id: 'CIV-NOSTATUS',
    issue_type: 'Pothole',
    severity: 'high',
    department: 'Roads Department',
    description: 'Large pothole on main road',
    area: 'Downtown',
    city: 'Metropolis',
    name: 'Jane Doe',
    phone: '9876543210',
    created_at: '2026-10-01T10:00:00.000Z',
    updated_at: '2026-10-02T10:00:00.000Z'
};

const renderCard = (complaint) =>
    renderToStaticMarkup(React.createElement(TrackComplaintResult, { complaint }));

describe('Track complaint result card', () => {
    test('a complaint with a missing status still renders its card', () => {
        const html = renderCard({ ...baseComplaint, status: undefined });
        assert.match(html, /CIV-NOSTATUS/);
        assert.match(html, /status-badge/);
        assert.match(html, /Large pothole on main road/);
    });

    test('a complaint with a null status still renders its card', () => {
        const html = renderCard({ ...baseComplaint, status: null });
        assert.match(html, /CIV-NOSTATUS/);
    });

    test('a Pending complaint renders with its badge and timeline', () => {
        const html = renderCard({ ...baseComplaint, status: 'Pending' });
        assert.match(html, /status-badge pending/);
        assert.match(html, /Complaint Received/);
    });

    test('an attached photo resolves against the given image base', () => {
        const html = renderToStaticMarkup(
            React.createElement(TrackComplaintResult, {
                complaint: { ...baseComplaint, status: 'Resolved', image_url: '/uploads/pic.jpg' },
                imageBase: 'http://localhost:3000'
            })
        );
        assert.match(html, /http:\/\/localhost:3000\/uploads\/pic\.jpg/);
    });
});
