export const parseMapsLink = (mapsLink) => {
    if (!mapsLink) return null;
    const match = mapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (!match) return null;
    return [parseFloat(match[1]), parseFloat(match[2])];
};

// A pasted Maps link carries exact coordinates, so it wins over address
// lookup, and a lookup failure falls through to it instead of blocking
// submission. Resolves to coordinates or null when neither source works.
export const resolveReportPosition = async ({ area, city, mapsLink }, geocodeFn) => {
    const fromLink = parseMapsLink(mapsLink);
    if (fromLink) return fromLink;

    if (!(area || city)) return null;

    try {
        return (await geocodeFn(area, city)) || null;
    } catch {
        return null;
    }
};
