import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../config/authFetch';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';

const statusColors = {
  unread: { bg: 'rgba(169, 66, 66, 0.1)', color: 'var(--color-danger)' },
  read: { bg: 'rgba(58, 110, 165, 0.1)', color: 'var(--dc-accent)' },
  resolved: { bg: 'rgba(46, 125, 50, 0.1)', color: 'var(--color-success)' },
};

const FeedbackManagement = () => {
  const addToast = useToast();
  const { t, lang } = useTranslation();
  useDocumentTitle(t('admin.feedback.title'), 'Admin');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('');
  const [processing, setProcessing] = useState({});

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200', page: '1' });
      if (filter) params.set('status', filter);
      const res = await authFetch(`/api/feedback/all?${params}`);
      if (!res.ok) throw new Error('Failed to fetch feedback');
      const data = await res.json();
      setList(data.data || data);
    } catch (err) {
      logger.error({ err }, 'FeedbackManagement fetch failed');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const updateStatus = async (id, status) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await authFetch(`/api/feedback/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      if (!res.ok) throw new Error('Update failed');
      setList((prev) => prev.map((fb) => fb._id === id ? { ...fb, status } : fb));
      addToast(`Marked as ${status}`, 'success');
    } catch (err) {
      logger.error({ err }, 'Feedback status update failed');
      addToast('Failed to update status', 'error');
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  if (loading) return <div className="admin-page"><h2>Feedback</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{t('admin.feedback.title')}</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, fontSize: '0.9rem' }}>
          <option value="">{t('admin.feedback.all')}</option>
          <option value="unread">{t('admin.feedback.unread')}</option>
          <option value="read">{t('admin.feedback.read')}</option>
          <option value="resolved">{t('admin.feedback.resolved')}</option>
        </select>
      </div>

      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>&times;</button></div>}

      {list.length === 0 ? (
        <div className="admin-empty">{t('admin.feedback.empty')}</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 180 }}>{t('admin.feedback.user')}</th>
                <th>{t('admin.feedback.message')}</th>
                <th style={{ width: 100 }}>{t('admin.feedback.page')}</th>
                <th style={{ width: 90 }}>{t('admin.feedback.status')}</th>
                <th style={{ width: 140 }}>{t('admin.feedback.date')}</th>
                <th style={{ width: 160 }}>{t('admin.feedback.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((fb) => (
                <tr key={fb._id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fb.userId?.name || t('admin.feedback.unknown')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--dc-text-muted)' }}>{fb.userId?.email || ''}</div>
                  </td>
                  <td>
                    <div
                      style={{ cursor: 'pointer', maxWidth: 400, wordBreak: 'break-word' }}
                      onClick={() => setExpanded(expanded === fb._id ? null : fb._id)}
                    >
                      {expanded === fb._id ? fb.message : fb.message?.slice(0, 120)}{fb.message?.length > 120 ? '...' : ''}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fb.pageUrl ? (
                      <a href={fb.pageUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--dc-accent)' }}>
                        {(() => { try { return new URL(fb.pageUrl).pathname; } catch { return fb.pageUrl; } })()}
                      </a>
                    ) : '-'}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
                      fontSize: '0.75rem', fontWeight: 600,
                      background: statusColors[fb.status]?.bg || 'var(--dc-cream-dark)',
                      color: statusColors[fb.status]?.color || 'var(--dc-text)',
                    }}>
                      {t('admin.feedback.' + fb.status)}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {formatDate(fb.createdAt, lang)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {fb.status !== 'read' && (
                        <button onClick={() => updateStatus(fb._id, 'read')} disabled={processing[fb._id]} className="feedback-action-btn" style={{ opacity: processing[fb._id] ? 0.5 : 1 }}>{t('admin.feedback.markRead')}</button>
                      )}
                      {fb.status !== 'resolved' && (
                        <button onClick={() => updateStatus(fb._id, 'resolved')} disabled={processing[fb._id]} className="feedback-action-btn" style={{ opacity: processing[fb._id] ? 0.5 : 1 }}>{t('admin.feedback.resolve')}</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;
