import React from 'react';

export const DEFAULT_API_BASE = 'http://localhost:3000/api';

/**
 * Format a date string/timestamp for display.
 */
export const formatDateTime = (value) => {
  if (!value) return '';
  const iso = String(value).replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

/**
 * Fetch comments for a specific complaint from the backend API.
 * Ensures non-2xx responses are treated as failures and never fabricates mock comments.
 */
export const fetchComments = async (complaintId, { apiBase = DEFAULT_API_BASE, fetchFn = fetch } = {}) => {
  if (!complaintId) {
    throw new Error('complaintId is required');
  }

  const res = await fetchFn(`${apiBase}/comments/${encodeURIComponent(complaintId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to load comments. Please try again.');
  }

  return Array.isArray(data?.data) ? data.data : [];
};

/**
 * Post a new comment for a complaint.
 * Ensures non-2xx responses are treated as failures and never fabricates admin responses.
 */
export const postCommentApi = async (
  { complaintId, name, message },
  { apiBase = DEFAULT_API_BASE, fetchFn = fetch } = {}
) => {
  const trimmedMessage = String(message || '').trim();
  if (!trimmedMessage) {
    throw new Error('Message cannot be empty');
  }

  const res = await fetchFn(`${apiBase}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      complaintId,
      name: (name || '').trim(),
      message: trimmedMessage
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to post comment. Please try again.');
  }

  return data.data;
};

/**
 * Pure UI Component for rendering a complaint's comment section.
 * Written with React.createElement to allow running in standard Node.js test environments.
 */
export const CommentSection = ({
  complaintId,
  commentState = { loading: false, error: '', list: [] },
  draft = { name: '', message: '', posting: false, error: '' },
  onRetryLoad,
  onRetryPost,
  onDraftChange,
  onPostComment
}) => {
  const commentsList = Array.isArray(commentState?.list) ? commentState.list : [];
  const hasError = Boolean(commentState?.error);
  const isLoading = Boolean(commentState?.loading);

  const children = [
    React.createElement('div', { key: 'title', className: 'comments-title' }, 'Comments')
  ];

  if (hasError) {
    children.push(
      React.createElement(
        'div',
        {
          key: 'comment-error',
          className: 'error-banner',
          style: {
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        },
        React.createElement('span', null, commentState.error),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary',
            style: {
              padding: '0.25rem 0.65rem',
              fontSize: '0.8rem',
              marginLeft: '0.5rem',
              cursor: 'pointer'
            },
            onClick: () => onRetryLoad?.(complaintId)
          },
          'Retry'
        )
      )
    );
  }

  if (isLoading) {
    children.push(
      React.createElement(
        'div',
        {
          key: 'loading',
          style: { color: 'var(--color-text-muted)', fontWeight: 700 }
        },
        'Loading comments...'
      )
    );
  } else if (!hasError || commentsList.length > 0) {
    children.push(
      React.createElement(
        'div',
        { key: 'list', className: 'comment-list' },
        commentsList.length === 0
          ? React.createElement(
              'div',
              { key: 'empty', style: { color: 'var(--color-text-muted)', fontWeight: 700 } },
              'No comments yet — be the first.'
            )
          : commentsList.map((cm) =>
              React.createElement(
                'div',
                { key: cm.id, className: 'comment' },
                React.createElement(
                  'div',
                  { className: 'comment-head' },
                  React.createElement('div', { className: 'comment-author' }, cm.author_name),
                  React.createElement('div', { className: 'comment-time' }, formatDateTime(cm.created_at))
                ),
                React.createElement('div', { className: 'comment-msg' }, cm.message)
              )
            )
      )
    );
  }

  if (draft?.error) {
    children.push(
      React.createElement(
        'div',
        {
          key: 'draft-error',
          className: 'error-banner',
          style: {
            marginTop: '0.5rem',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }
        },
        React.createElement('span', null, draft.error),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary',
            style: {
              padding: '0.25rem 0.65rem',
              fontSize: '0.8rem',
              marginLeft: '0.5rem',
              cursor: 'pointer'
            },
            onClick: () => onRetryPost?.(complaintId)
          },
          'Retry'
        )
      )
    );
  }

  children.push(
    React.createElement(
      'div',
      { key: 'form', className: 'comment-form' },
      React.createElement('input', {
        placeholder: 'Your name (optional)',
        value: draft?.name || '',
        onChange: (e) =>
          onDraftChange?.(complaintId, {
            ...draft,
            name: e.target.value,
            error: ''
          })
      }),
      React.createElement('input', {
        placeholder: 'Write a comment...',
        value: draft?.message || '',
        onChange: (e) =>
          onDraftChange?.(complaintId, {
            ...draft,
            message: e.target.value,
            error: ''
          }),
        onKeyDown: (e) => {
          if (e.key === 'Enter') onPostComment?.(complaintId);
        }
      }),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary',
          style: { padding: '0.65rem 1rem', borderRadius: '9999px' },
          disabled: Boolean(draft?.posting) || !String(draft?.message || '').trim(),
          onClick: () => onPostComment?.(complaintId)
        },
        draft?.posting ? 'Posting...' : 'Post'
      )
    )
  );

  return React.createElement('div', { className: 'comments' }, children);
};
