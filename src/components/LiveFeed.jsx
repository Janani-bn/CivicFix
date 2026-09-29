import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, API_ORIGIN } from '../services/api';
import './LiveFeed.css';

const formatDateTime = (value) => {
  if (!value) return '';
  const iso = String(value).replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

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
      }  catch (err) {
  console.error('Backend fetchFeed error:', err);
  setError(err.message || 'Failed to load the live feed. Please try again.');
  setLoading(false);
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

    setComments((prev) => ({ ...prev, [complaintId]: { loading: true, error: '', list: prev[complaintId]?.list || [] } }));
    try {
      const res = await fetch(`${API_BASE}/comments/${encodeURIComponent(complaintId)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load comments. Please try again.');
      setComments((prev) => ({
        ...prev,
        [complaintId]: { loading: false, error: '', list: data.data || [] }
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
      const res = await fetch(`${API_BASE}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintId, name, message })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error?.message || 'Failed to post comment. Please try again.');

      setComments((prev) => {
        const existing = prev[complaintId]?.list || [];
        return {
          ...prev,
          [complaintId]: {
            loading: false,
            error: '',
            list: [...existing, data.data]
          }
        };
      });
      setDrafts((prev) => ({ ...prev, [complaintId]: { name: draft.name || '', message: '', posting: false, error: '' } }));
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

                      <div className="comments">
                        <div className="comments-title">Comments</div>

                        {commentState.error && (
                          <div className="error-banner" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{commentState.error}</span>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', marginLeft: '0.5rem', cursor: 'pointer' }}
                              onClick={() => ensureCommentsLoaded(complaintId, true)}
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {commentState.loading ? (
                          <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>Loading comments...</div>
                        ) : (
                          <div className="comment-list">
                            {commentState.list.length === 0 ? (
                              <div style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>
                                No comments yet — be the first.
                              </div>
                            ) : (
                              commentState.list.map((cm) => (
                                <div key={cm.id} className="comment">
                                  <div className="comment-head">
                                    <div className="comment-author">{cm.author_name}</div>
                                    <div className="comment-time">{formatDateTime(cm.created_at)}</div>
                                  </div>
                                  <div className="comment-msg">{cm.message}</div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {draft.error && (
                          <div className="error-banner" style={{ marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{draft.error}</span>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.65rem', fontSize: '0.8rem', marginLeft: '0.5rem', cursor: 'pointer' }}
                              onClick={() => postComment(complaintId)}
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        <div className="comment-form">
                          <input
                            placeholder="Your name (optional)"
                            value={draft.name}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [complaintId]: { ...draft, name: e.target.value, error: '' }
                              }))
                            }
                          />
                          <input
                            placeholder="Write a comment..."
                            value={draft.message}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [complaintId]: { ...draft, message: e.target.value, error: '' }
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') postComment(complaintId);
                            }}
                          />
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.65rem 1rem', borderRadius: '9999px' }}
                            disabled={draft.posting || !draft.message.trim()}
                            onClick={() => postComment(complaintId)}
                          >
                            {draft.posting ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
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

