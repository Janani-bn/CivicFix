import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getNavLinks } from '../src/utils/navLinks.js';

const paths = (options) => getNavLinks(options).map((link) => link.to);

describe('navbar links', () => {
    test('logged-out visitors get the public pages and the admin entry point', () => {
        assert.deepStrictEqual(paths({ isLoggedIn: false }), ['/', '/feed', '/map', '/track', '/admin']);
    });

    test('signed-in citizens can reach My Complaints and Nearby Issues', () => {
        const citizen = paths({ isLoggedIn: true, role: 'citizen' });
        assert.ok(citizen.includes('/my-complaints'));
        assert.ok(citizen.includes('/nearby-issues'));
        assert.ok(!citizen.includes('/volunteer'));
        assert.ok(!citizen.includes('/admin'), 'citizens would only be bounced back home from /admin');
    });

    test('volunteers get their dashboard', () => {
        assert.ok(paths({ isLoggedIn: true, role: 'volunteer' }).includes('/volunteer'));
    });

    test('admins keep the Admin Portal link', () => {
        const admin = getNavLinks({ isLoggedIn: true, role: 'admin' });
        const portal = admin.find((link) => link.to === '/admin');
        assert.ok(portal);
        assert.strictEqual(portal.className, 'admin-link-pill');
        assert.ok(!admin.some((link) => link.to === '/volunteer'));
    });

    test('Track Status keeps the voice guide hook', () => {
        const track = getNavLinks().find((link) => link.to === '/track');
        assert.strictEqual(track.guideId, 'track-link');
    });

    test('a token without a loaded user still shows the signed-in links', () => {
        const loading = paths({ isLoggedIn: true, role: undefined });
        assert.ok(loading.includes('/my-complaints'));
        assert.ok(!loading.includes('/admin'));
    });
});
