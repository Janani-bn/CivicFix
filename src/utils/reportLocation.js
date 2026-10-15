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

// Posts a fully-resolved report the same way the modal submit does and
// returns the created identifiers. Throws with the server message when the
// backend rejects the submission.
export const postComplaintReport = async ({ apiBase, form, position, imageFile, token, fetchFn = fetch }) => {
    const body = new FormData();
    body.append('name', form.fullName);
    body.append('phone', form.phone);
    body.append('email', form.email);
    body.append('area', form.area);
    body.append('city', form.city);
    body.append('landmark', form.landmark);
    body.append('issueType', form.issueType);
    body.append('description', form.description);
    body.append('severity', form.severity);
    body.append('duration', form.duration);
    body.append('allowVolunteers', form.volunteer);
    body.append('wantUpdates', form.updates);
    body.append('latitude', position[0]);
    body.append('longitude', position[1]);

    if (imageFile) {
        body.append('image', imageFile);
    }

    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await fetchFn(`${apiBase}/complaints`, {
        method: 'POST',
        headers,
        body
    });
    const responseData = await response.json();

    if (!response.ok) {
        throw new Error(responseData.error?.message || 'The server rejected your submission.');
    }

    return {
        complaintId: responseData.data.complaintId,
        whatsappLink: responseData.data.whatsappLink || null
    };
};
