export async function submitComplaint(apiBase, formData, token, fetchFn = fetch) {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await fetchFn(`${apiBase}/complaints`, {
        method: 'POST',
        headers,
        body: formData,
    });

    const responseData = await response.json();

    if (!response.ok) {
        throw new Error(responseData.error?.message || 'The server rejected your submission.');
    }

    return responseData;
}
