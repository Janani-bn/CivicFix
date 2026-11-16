// SQLite's CURRENT_TIMESTAMP stores UTC as "YYYY-MM-DD HH:MM:SS" with no
// timezone marker. Without one, Date() reads it as the browser's local time,
// which puts every timestamp 5.5 hours early in India. Values that already
// carry a "Z" or an offset are left alone.
const SQLITE_UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const parseServerDate = (value) => {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const text = String(value).trim();
    const normalized = SQLITE_UTC_TIMESTAMP.test(text)
        ? `${text.replace(' ', 'T')}Z`
        : text;

    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatServerDateTime = (value, locale, options) => {
    const date = parseServerDate(value);
    if (!date) return value ? String(value) : '';
    return date.toLocaleString(locale, options);
};

export const formatServerDate = (value, locale, options) => {
    const date = parseServerDate(value);
    if (!date) return value ? String(value) : '';
    return date.toLocaleDateString(locale, options);
};
