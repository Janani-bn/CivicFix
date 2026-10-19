// Which navbar links to show for the current visitor. Routes that need a
// login or a role are only listed for people who can open them, so a click
// never just bounces back to the home page.
export const getNavLinks = ({ isLoggedIn = false, role = null } = {}) => {
    const links = [
        { to: '/', label: 'Home' },
        { to: '/feed', label: 'Live Feed' },
        { to: '/map', label: 'Live Map' },
        { to: '/track', label: 'Track Status', guideId: 'track-link' }
    ];

    if (isLoggedIn) {
        links.push({ to: '/my-complaints', label: 'My Complaints' });
        links.push({ to: '/nearby-issues', label: 'Nearby Issues' });
    }

    if (isLoggedIn && role === 'volunteer') {
        links.push({ to: '/volunteer', label: 'Volunteer Dashboard' });
    }

    // Logged-out visitors still see it, since it is how admins reach the login.
    if (!isLoggedIn || role === 'admin') {
        links.push({ to: '/admin', label: 'Admin Portal', className: 'admin-link-pill' });
    }

    return links;
};
