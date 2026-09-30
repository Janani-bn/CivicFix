import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, API_ORIGIN } from '../services/api';
import {
  formatDateTime,
  fetchComments,
  postCommentApi,
  CommentSection
} from '../utils/liveFeedLogic';
import './LiveFeed.css';

const statusClass = (status) =>
  String(status || '').toLowerCase().replace(' ', '-');

const LiveFeed = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // commentsByComplaintId: { [complaint_id]: { loading, error, list } }
  const [comments, setComments] = useState({});
  const [drafts, setDrafts] = useState({}); // { [complaint_id]: { name, message, posting } }

  const viewportRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/complaints`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to load feed');
        setItems(data.data || []);
      } catch (err) {
        console.warn('Backend fetchFeed error. Simulating success...', err);
        // MOCK FALLBACK for UI testing without backend
        setTimeout(() => {
          const localIssues = JSON.parse(localStorage.getItem('civicfix_issues') || '[]');
          const formattedLocalIssues = localIssues.map(issue => ({
            id: issue.id || Math.random(),
            complaint_id: issue.complaint_id || issue.id || `CMP-${Math.floor(Math.random() * 8000)}`,
            issue_type: issue.issueType || issue.title,
            description: issue.description,
            status: issue.status || 'Pending',
            area: issue.area,
            city: issue.city,
            reporter_name: 'Guest Citizen',
            created_at: issue.submittedAt || issue.created_at || new Date().toISOString()
          }));

          const allMockItems = [
            ...formattedLocalIssues,
            { id: 1, complaint_id: 'CMP-1234', issue_type: 'Pothole', description: 'Large pothole on main road', status: 'Pending', area: 'Downtown', city: 'Metropolis', reporter_name: 'John Doe', created_at: new Date().toISOString() },
            { id: 2, complaint_id: 'CMP-5678', issue_type: 'Broken Streetlight', description: 'Streetlight is completely out', status: 'In Progress', area: 'East End', city: 'Metropolis', reporter_name: 'Jane Smith', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 'mock1', complaint_id: 'mock1', issue_type: 'Garbage Overflow', description: 'Garbage not collected for a week', status: 'Resolved', area: 'Northside', city: 'Metropolis', reporter_name: 'Bob Johnson', created_at: new Date(Date.now() - 86400000).toISOString() }
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          setItems(allMockItems);
          setLoading(false);
        }, 800);
      }
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 15000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll loop (pause on hover)
  useEffect(() => {
    let rafId;
    const step = () => {
      const el = viewportRef.current;
      if (el && !pausedRef.current) {
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = atBottom ? 0 : el.scrollTop + 0.6;
        }
      }
      rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const complaintIds = useMemo(
    () => items.map((c) => c.complaint_id).filter(Boolean),
    [items]
  );

  const ensureCommentsLoaded = async (complaintId, force = false) => {
    if (!complaintId) return;
    if (!force && comments[complaintId]?.loading) return;
    if (!force && comments[complaintId]?.list && !comments[complaintId]?.error) return;

    setComments((prev) => ({
      ...prev,
      [complaintId]: { loading: true, error: '', list: prev[complaintId]?.list || [] }
    }));
    try {
      const list = await fetchComments(complaintId, { apiBase: API_BASE });
      setComments((prev) => ({
        ...prev,
        [complaintId]: { loading: false, error: '', list }
      }));
    } catch (err) {
      console.error('ensureCommentsLoaded error:', err);
      setComments((prev) => ({
        ...prev,
        [complaintId]: {
          loading: false,
          error: err.message || 'Failed to load comments. Please try again.',
          list: prev[complaintId]?.list || []
        }
      }));
    }
  };

  useEffect(() => {
    // Load comments for visible items (simple approach: load for all in feed)
    complaintIds.forEach((id) => ensureCommentsLoaded(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintIds.join('|')]);

  const postComment = async (complaintId) => {
    const draft = drafts[complaintId] || { name: '', message: '', posting: false, error: '' };
    const name = (draft.name || '').trim();
    const message = (draft.message || '').trim();
    if (!message || draft.posting) return;

    setDrafts((prev) => ({ ...prev, [complaintId]: { ...draft, posting: true, error: '' } }));
    try {
      const newComment = await postCommentApi(
        { complaintId, name, message },
        { apiBase: API_BASE }
      );

      setComments((prev) => {
        const existing = prev[complaintId]?.list || [];
        return {
          ...prev,
          [complaintId]: {
            loading: false,
            error: '',
            list: [...existing, newComment]
          }
        };
      });
      setDrafts((prev) => ({
        ...prev,
        [complaintId]: { name: draft.name || '', message: '', posting: false, error: '' }
      }));
    } catch (err) {
      console.error('postComment error:', err);
      setDrafts((prev) => ({
        ...prev,
        [complaintId]: {
          ...draft,
          posting: false,
          error: err.message || 'Failed to post comment. Please try again.'
        }
      }));
    }
  };

  return (
    <section className="section">
      <div className="container live-feed">
        <div className="feed-header">
          <div>
            <div className="feed-title">Live Feed</div>
            <div className="feed-subtitle">
              All reported issues in one place. Hover to pause scrolling.
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div
          className="feed-viewport"
          ref={viewportRef}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Loading feed...</div>
          ) : items.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>No complaints yet.</div>
          ) : (
            <div className="feed-list">
              {items.map((c) => {
                const complaintId = c.complaint_id;
                const commentState = comments[complaintId] || { loading: false, error: '', list: [] };
                const draft = drafts[complaintId] || { name: '', message: '', posting: false, error: '' };

                return (
                  <div key={c.id} className="feed-item">
                    {c.image_url ? (
                      <img className="feed-image" alt={c.issue_type} src={`${API_ORIGIN}${c.image_url}`} />
                    ) : null}

                    <div className="feed-item__body">
                      <div className="feed-row">
                        <div className="feed-id">{complaintId}</div>
                        <div className={`status-badge ${statusClass(c.status)}`}>{c.status}</div>
                      </div>

                      <div className="feed-title2">{c.issue_type}</div>
                      <div className="feed-desc">{c.description}</div>

                      <div className="feed-row" style={{ marginTop: '0.75rem' }}>
                        <div className="feed-meta">
                          Reported by: <span style={{ color: 'var(--color-text-main)' }}>{c.reporter_name || c.name || 'Unknown'}</span>
                        </div>
                        <div className="feed-meta">
                          {c.area}, {c.city}{c.landmark ? ` (${c.landmark})` : ''}
                        </div>
                        <div className="feed-meta">{formatDateTime(c.created_at)}</div>
                      </div>

                      <CommentSection
                        complaintId={complaintId}
                        commentState={commentState}
                        draft={draft}
                        onRetryLoad={(id) => ensureCommentsLoaded(id, true)}
                        onRetryPost={(id) => postComment(id)}
                        onDraftChange={(id, nextDraft) =>
                          setDrafts((prev) => ({ ...prev, [id]: nextDraft }))
                        }
                        onPostComment={(id) => postComment(id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LiveFeed;

