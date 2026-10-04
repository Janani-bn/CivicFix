const MAX_RESULTS = 3;

const NEARBY_ERROR_MESSAGE =
  'Unable to fetch nearby issues. Please try again.';

const MANUAL_ERROR_MESSAGE =
  'Unable to search nearby issues. Please try again.';

export const fetchNearbyComplaints = async ({
  lat,
  lng,
  apiBase,
  fetchFn = fetch,
}) => {
  try {
    const response = await fetchFn(
      `${apiBase}/complaints/nearby?lat=${lat}&lng=${lng}&radiusKm=5`
    );

    const data = await response.json();

    if (data?.success && Array.isArray(data.data)) {
      const issues = data.data.slice(0, MAX_RESULTS);

      return {
        issues,
        locationName: issues[0]?.area || 'your area',
        view: issues.length > 0 ? 'recommendation' : 'form',
        locationError: false,
        error: null,
      };
    }

    return {
      issues: [],
      locationName: 'your area',
      view: 'form',
      locationError: true,
      error: NEARBY_ERROR_MESSAGE,
    };
  } catch (error) {
    return {
      issues: [],
      locationName: 'your area',
      view: 'form',
      locationError: true,
      error: NEARBY_ERROR_MESSAGE,
    };
  }
};

export const searchComplaintsByArea = async ({
  area,
  apiBase,
  fetchFn = fetch,
}) => {
  if (!area || !area.trim()) {
    return {
      issues: [],
      locationName: area || '',
      view: 'form',
      locationError: true,
      error: null,
    };
  }

  try {
    const response = await fetchFn(`${apiBase}/complaints`);
    const data = await response.json();

    if (data?.success && Array.isArray(data.data)) {
      const matches = data.data
        .filter((issue) =>
          (issue.area || '').toLowerCase().includes(area.toLowerCase())
        )
        .slice(0, MAX_RESULTS);

      return {
        issues: matches,
        locationName: area,
        view: matches.length > 0 ? 'recommendation' : 'form',
        locationError: false,
        error: null,
      };
    }

    return {
      issues: [],
      locationName: area,
      view: 'form',
      locationError: true,
      error: MANUAL_ERROR_MESSAGE,
    };
  } catch (error) {
    return {
      issues: [],
      locationName: area,
      view: 'form',
      locationError: true,
      error: MANUAL_ERROR_MESSAGE,
    };
  }
};
