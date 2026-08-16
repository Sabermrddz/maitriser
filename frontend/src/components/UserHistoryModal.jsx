import React, { useEffect, useState, useCallback } from 'react';
import { authFetch } from '../config/authFetch';
import { useTranslation } from '../context/LanguageContext';
import { formatDateTime } from '../utils/formatDate';
import Spinner from './Spinner';
import Pagination from './Pagination';
import { logger } from '../utils/logger';

const UserHistoryModal = ({ user, onClose }) => {
  const { t, lang } = useTranslation();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchResults = useCallback(async (p) => {
    const pg = p ?? page;
    if (!user?.userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/results/${user.userId}?page=${pg}&limit=50`);
      if (!res.ok) throw new Error('Failed to load results');
      const d = await res.json();
      setResults(d.data || []);
      setPage(d.page || 1);
      setTotalPages(d.totalPages || 1);
    } catch (err) {
      logger.error({ err }, 'UserHistoryModal fetchResults failed');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.userId, page]);

  useEffect(() => { fetchResults(1); }, [user?.userId]);

  const total = results.length;
  const correct = results.filter((r) => r.score === 1).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.6)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--dc-white)', borderRadius: 'var(--dc-radius)',
        padding: '28px', width: '90%', maxWidth: '800px', maxHeight: '85vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dc-dark)' }}>
            📊 {t('userHistory.title')} — {user.name || user.userId}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer',
            color: 'var(--dc-text-muted)', padding: '4px 8px',
          }}>✕</button>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dc-highlight)' }}>
            <p>{t('error')}: {error}</p>
            <button className="btn-primary" onClick={() => fetchResults(1)} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
          </div>
        ) : total === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--dc-text-muted)' }}>
            {t('userHistory.empty')}
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '16px', padding: '16px', background: 'var(--dc-cream)',
              borderRadius: 'var(--dc-radius-sm)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: percentage >= 60 ? 'var(--color-success)' : 'var(--dc-highlight)' }}>
                {percentage}%
              </div>
              <div style={{ fontSize: '13px', color: 'var(--dc-text-muted)' }}>
                {correct}/{total} {t('caseExam.correct').toLowerCase()} — {total} {t('userHistory.attempts')}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>{t('userHistory.question')}</th>
                    <th style={{ width: '90px' }}>{t('userHistory.result')}</th>
                    <th style={{ width: '140px' }}>{t('userHistory.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r._id || i}>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--dc-border)', fontSize: '0.85rem' }}>
                        {r.quizId?.question?.questionText?.substring(0, 80) || r.quizId?.quizId || r.quizId?._id}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--dc-border)' }}>
                        <span style={{
                          color: r.score === 1 ? 'var(--color-success)' : 'var(--dc-highlight)',
                          fontWeight: 700, fontSize: '0.85rem',
                        }}>
                          {r.score === 1 ? '✅ Correct' : '❌ Faux'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid var(--dc-border)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDateTime(r.timestamp, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '12px' }}>
              <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchResults(p)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserHistoryModal;
