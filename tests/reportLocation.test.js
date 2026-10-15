import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseMapsLink, resolveReportPosition } from '../src/utils/reportLocation.js';

const LINK = 'https://maps.google.com/?q=loc@13.0827,80.2707';

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
});
