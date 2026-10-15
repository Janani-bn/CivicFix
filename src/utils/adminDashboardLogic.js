const sortAdminComplaints = (items) => {
    return [...(items || [])].sort((a, b) => {
        const aCount = a.supporter_count || 1;
        const bCount = b.supporter_count || 1;
        if (bCount !== aCount) return bCount - aCount;
        return new Date(b.created_at) - new Date(a.created_at);
    });
};

export const fetchAdminComplaints = async ({ apiBase, status, department, fetchFn = fetch }) => {
    const params = new URLSearchParams();
    if (status && status !== 'All Statuses') params.append('status', status);
    if (department && department !== 'All Departments') params.append('department', department);
    const query = params.toString();

    const response = await fetchFn(`${apiBase}/complaints${query ? `?${query}` : ''}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch complaints');
    }

    return sortAdminComplaints(data.data);
};

export const fetchAdminDuplicates = async ({ apiBase, fetchFn = fetch }) => {
    const response = await fetchFn(`${apiBase}/complaints/grouped-duplicates`);
    const data = await response.json();

    // A non-OK response with valid JSON must fail loudly too. Treating it
    // as an empty success would leave stale groups on screen with no error.
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch duplicate groups');
    }

    return data.data || [];
};

export const requestAssignDepartment = async ({ apiBase, complaintId, department, fetchFn = fetch }) => {
    const response = await fetchFn(`${apiBase}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId: complaintId.toString(), department })
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to assign department');
    }

    return data.data;
};
