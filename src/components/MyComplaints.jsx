import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, API_ORIGIN } from '../services/api';
import { fetchMyComplaints } from '../utils/myComplaintsLogic';
import './MyComplaints.css';

const formatDate = (value) => {
  if (!value) return '';
  const iso = String(value).replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

const statusClass = (status) => {
  return String(status || '').toLowerCase().replace(' ', '-');
};

const MyComplaints = () => {
  const { token } = useAuth();
  const [submitted, setSubmitted] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('submitted');

  const fetchAll = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchMyComplaints(API_BASE, token);

      setSubmitted(data.submitted);
      setJoined(data.joined);
      setLoading(false);
    } catch (err) {
      console.error('MyComplaints fetch error:', err);
      setError(
        err.message || 'Failed to load your complaints. Please try again.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();

    const onFocus = () => fetchAll();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll(); };
    const onCreated = () => fetchAll();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('civicfix:complaint-created', onCreated);
    window.addEventListener('civicfix:complaint-joined', onCreated);
    const interval = setInterval(fetchAll, 15000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('civicfix:complaint-created', onCreated);
      window.removeEventListener('civicfix:complaint-joined', onCreated);
      clearInterval(interval);
    };
  }, [token]);

  const list = activeTab === 'submitted' ? submitted : joined;

  const showInitialLoadError =
    Boolean(error) &&
    submitted.length === 0 &&
    joined.length === 0;

  return (
    <section className="section">
      <div className="container my-complaints">
        <h1 className="page-title">My Profile</h1>

        {/* Tab Switcher */}
        <div className="mc-tabs">
          <button
            className={`mc-tab ${activeTab === 'submitted' ? 'active' : ''}`}
            onClick={() => setActiveTab('submitted')}
          >
            My Reports
            {submitted.length > 0 && <span className="mc-tab-count">{submitted.length}</span>}
          </button>
          <button
            className={`mc-tab ${activeTab === 'joined' ? 'active' : ''}`}
            onClick={() => setActiveTab('joined')}
          >
            Joined Reports
            {joined.length > 0 && <span className="mc-tab-count joined">{joined.length}</span>}
          </button>
        </div>

        {error && !showInitialLoadError && (
          <div className="error-banner">{error}</div>
        )}

        {activeTab === 'joined' && (
          <div className="joined-info-banner">
            <span>🤝</span>
            <span>These are existing complaints you supported. Your voice has been added to boost their priority for faster resolution.</span>
          </div>
        )}

        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>Loading...</div>
        ) : showInitialLoadError ? (
          <div className="error-banner">
            {error}
          </div>
        ) : list.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{activeTab === 'submitted' ? '📋' : '🤝'}</div>
            <p>
              {activeTab === 'submitted'
                ? "You haven't submitted any reports yet."
                : "You haven't joined any existing reports yet.\nWhen you report an issue, we'll show similar nearby issues you can join."}
            </p>
          </div>
        ) : (
          <div className="complaints-grid">
            {list.map((c) => (
              <div key={`${activeTab}-${c.id}`} className={`complaint-card ${activeTab === 'joined' ? 'complaint-card--joined' : ''}`}>
                {activeTab === 'joined' && (
                  <div className="joined-badge">
                    <span>🤝 Joined</span>
                    <span className="joined-date">{formatDate(c.joined_at)}</span>
                  </div>
                )}

                {c.image_url ? (
                  <img
                    className="complaint-image"
                    alt={c.issue_type}
                    src={`${API_ORIGIN}${c.image_url}`}
                  />
                ) : null}

                <div className="complaint-title">{c.complaint_id}</div>
                <div className="complaint-subtitle">{c.issue_type}</div>
                <div className="complaint-desc">{c.description}</div>

                <div className="complaint-meta">
                  <div className={`status-badge ${statusClass(c.status)}`}>{c.status}</div>
                  {c.supporter_count > 1 && (
                    <div className="supporter-badge">
                      👥 {c.supporter_count} supporters
                    </div>
                  )}
                  <div className="meta-item">
                    {c.area}, {c.city}
                    {c.landmark ? ` (${c.landmark})` : ''}
                  </div>
                  <div className="meta-item">
                    {activeTab === 'submitted' ? 'Reported' : 'Originally reported'}: {formatDate(c.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MyComplaints;
