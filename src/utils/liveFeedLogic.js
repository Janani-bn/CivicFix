export const fetchLiveFeed = async (apiBase, fetchFn = fetch) => {
  const res = await fetchFn(`${apiBase}/complaints`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || 'Failed to load feed');
  }

  return data.data || [];
};
