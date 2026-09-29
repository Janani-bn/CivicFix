export const fetchMyComplaints = async (
  apiBase,
  token,
  fetchFn = fetch
) => {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const [submittedRes, joinedRes] = await Promise.all([
    fetchFn(`${apiBase}/complaints/user`, { headers }),
    fetchFn(`${apiBase}/complaints/joined`, { headers }),
  ]);

  const submittedData = await submittedRes.json();
  const joinedData = await joinedRes.json();

  if (!submittedRes.ok) {
    throw new Error(
      submittedData.error?.message || 'Failed to fetch your reports'
    );
  }

  if (!joinedRes.ok) {
    throw new Error(
      joinedData.error?.message || 'Failed to fetch joined reports'
    );
  }

  return {
    submitted: submittedData.data || [],
    joined: joinedData.data || [],
  };
};
