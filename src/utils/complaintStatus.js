export const statusBadgeClass = (status) => {
    return String(status || '').toLowerCase().replace(' ', '-');
};
