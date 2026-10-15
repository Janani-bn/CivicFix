export const destinationForRole = (role) => {
    if (role === 'volunteer') return '/volunteer';
    if (role === 'admin') return '/admin';
    return '/feed';
};
