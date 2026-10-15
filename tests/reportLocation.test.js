import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseMapsLink, resolveReportPosition, postComplaintReport } from '../src/utils/reportLocation.js';

const LINK = 'https://maps.google.com/?q=loc@13.0827,80.2707';

const baseForm = {
    fullName: 'Jane Doe',
    phone: '9876543210',
    email: 'jane@example.com',
    area: 'Anna Nagar',
    city: 'Chennai',
    landmark: '',
    issueType: 'Pothole',
    description: 'Large pothole',
    severity: 'high',
    duration: '',
    volunteer: 'yes',
    updates: 'yes'
};

describe('Report position resolution', () => {
    test('a lookup failure still submits through a valid Maps link', async () => {
        const geocodeFn = async () => {
            throw new Error('lookup down');
        };

        const out = await resolveReportPosition(
            { area: 'Anna Nagar', city: 'Chennai', mapsLink: LINK },
            geocodeFn
        );
        assert.deepStrictEqual(out, [13.0827, 80.2707]);
    });

    test('address lookup is used when no link is given', async () => {
        const geocodeFn = async () => [12.9, 80.1];

        const out = await resolveReportPosition(
            { area: 'Velachery', city: 'Chennai', mapsLink: '' },
            geocodeFn
        );
        assert.deepStrictEqual(out, [12.9, 80.1]);
    });

    test('nothing resolvable yields null', async () => {
        const failing = async () => {
            throw new Error('lookup down');
        };

        assert.strictEqual(
            await resolveReportPosition({ area: 'X', city: 'Y', mapsLink: '' }, failing),
            null
        );
        assert.strictEqual(
            await resolveReportPosition({ area: '', city: '', mapsLink: 'not a link' }, failing),
            null
        );
    });

    test('garbage links parse to null', () => {
        assert.strictEqual(parseMapsLink(''), null);
        assert.strictEqual(parseMapsLink('https://maps.google.com/'), null);
    });

    test('a failing lookup still submits through a valid Maps link', async () => {
        const failingGeocode = async () => {
            throw new Error('lookup down');
        };
        const calls = [];
        const fetchFn = async (url, opts) => {
            calls.push([url, opts]);
            return {
                ok: true,
                json: async () => ({
                    success: true,
                    data: { complaintId: 'CIV-LINK1', whatsappLink: 'http://wa.me/x' }
                })
            };
        };

        const position = await resolveReportPosition(
            { area: 'Anna Nagar', city: 'Chennai', mapsLink: LINK },
            failingGeocode
        );
        const result = await postComplaintReport({
            apiBase: 'http://localhost:3000/api',
            form: baseForm,
            position,
            imageFile: null,
            token: null,
            fetchFn
        });

        assert.strictEqual(calls.length, 1);
        assert.ok(calls[0][0].endsWith('/complaints'));
        assert.strictEqual(calls[0][1].method, 'POST');
        assert.strictEqual(calls[0][1].body.get('latitude'), '13.0827');
        assert.strictEqual(calls[0][1].body.get('longitude'), '80.2707');
        assert.strictEqual(result.complaintId, 'CIV-LINK1');
    });

    test('a rejected submission surfaces the server message', async () => {
        const fetchFn = async () => ({
            ok: false,
            json: async () => ({ error: { message: 'Phone number must be at least 10 digits' } })
        });

        await assert.rejects(
            () => postComplaintReport({
                apiBase: 'http://localhost:3000/api',
                form: baseForm,
                position: [13.0827, 80.2707],
                imageFile: null,
                token: 'tok',
                fetchFn
            }),
            /Phone number must be at least 10 digits/
        );
    });
});
