/**
 * Strict parsing for internal numeric complaint IDs.
 * parseInt('1garbage') returns 1, which previously let malformed IDs
 * resolve to a different complaint. Only all-digit strings qualify.
 */
const parseStrictInternalId = (value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) return null;
    const parsed = Number(text);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
    return parsed;
};

module.exports = { parseStrictInternalId };
