import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonModuleGrid } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/teal-theme.css';

const CourseViewPage = () => {
  const { moduleId, courseName } = useParams();
  const decodedName = decodeURIComponent(courseName || '');
  const navigate = useNavigate();
  const { t } = useTranslation();
  useDocumentTitle(`${t('courseView.title')} — ${decodedName}`);

  const [moduleName, setModuleName] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const modRes = await fetchWithAuth(`${API_BASE_URL}/api/modules/${moduleId}`);
        if (!modRes.ok) throw new Error('Module not found');
        const mod = await modRes.json();
        setModuleName(mod.name || '');

        let resolvedUrl = null;
        const courses = mod?.courses || [];
        const match = courses.find((c) => (typeof c === 'string' ? c : c.name || '') === decodedName);
        const pdfId = match && typeof match === 'object' ? match.pdfId || '' : '';

        if (pdfId) {
          const docsRes = await fetchWithAuth(`${API_BASE_URL}/api/pdf-documents`);
          if (docsRes.ok) {
            const docs = await docsRes.json();
            const filename = docs.find((d) => d.pdfId === pdfId)?.filename;
            if (filename) {
              try {
                const presignRes = await fetchWithAuth(`${API_BASE_URL}/api/course-pdfs/${encodeURIComponent(filename)}`);
                if (presignRes.ok) {
                  const { url } = await presignRes.json();
                  resolvedUrl = url;
                }
              } catch { /* presign failed */ }
            }
          }
        }
        setPdfUrl(resolvedUrl);
      } catch (err) {
        logger.error({ err, moduleId }, 'CourseViewPage load failed');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [moduleId, decodedName]);

  useEffect(() => {
    (async () => {
      setLoadingQuizzes(true);
      try {
        let discipline = '', year = '';
        try { discipline = localStorage.getItem('userDiscipline') || ''; year = localStorage.getItem('userYear') || ''; } catch {}
        const params = new URLSearchParams({ limit: '200', discipline, year, moduleId });
        if (decodedName) params.set('course', decodedName);
        const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes?${params.toString()}`);
        if (res.ok) {
          const d = await res.json();
          setQuizzes(d.data || (Array.isArray(d) ? d : []));
        }
      } catch (err) {
        logger.error({ err }, 'CourseViewPage fetchQuizzes failed');
      } finally {
        setLoadingQuizzes(false);
      }
    })();
  }, [moduleId, decodedName]);

  if (loading) {
    return (
      <div className="page-teal">
        <div className="card-teal">
          <SkeletonModuleGrid count={1} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
          <p>{t('quiz.loadError')} : {error}</p>
          <button className="btn-primary" onClick={() => navigate('/quizPage')} style={{ marginTop: 12 }}>
            {t('customExam.backToCourses')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal">
      <div className="course-split">
        {/* Left: PDF console panel */}
        <div className="pdf-console-panel">
          <div className="pdf-console-bar">
            <span className="pdf-console-dot" />
            <span className="pdf-console-title">{decodedName}</span>
            <div className="pdf-console-actions">
              {pdfUrl && (
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-console-link">
                  {t('courseView.openTab')}
                </a>
              )}
              <button className="pdf-console-close" onClick={() => navigate('/quizPage')} aria-label={t('courseView.close')}>
                ×
              </button>
            </div>
          </div>
          <div className="pdf-console-body">
            {pdfUrl ? (
              <iframe src={pdfUrl} title={decodedName} className="pdf-console-frame" />
            ) : (
              <div className="pdf-console-empty">{t('quizcard.courseNotAvailable')}</div>
            )}
          </div>
        </div>

        {/* Right: quizzes list */}
        <div className="course-quizzes">
          <button className="btn-ghost" onClick={() => navigate('/quizPage')} style={{ marginBottom: 12, fontSize: 13 }}>
            ← {t('moduleCard.back')}
          </button>
          <h2 style={{ marginBottom: 4 }}>{decodedName}</h2>
          {moduleName && (
            <div className="card-meta" style={{ marginBottom: 16 }}>{moduleName}</div>
          )}
          {loadingQuizzes ? (
            <SkeletonModuleGrid count={3} />
          ) : quizzes.length === 0 ? (
            <div className="empty-state">
              <p>{t('quiz.noQuizzes')}</p>
            </div>
          ) : (
            <div className="course-quiz-list">
              {quizzes.map((q, idx) => (
                <div key={q._id} className="card-item" style={{ padding: 16, textAlign: 'left' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 800, color: 'var(--teal-dark)',
                      background: 'var(--color-success-bg, #e6f7ef)',
                      borderRadius: 8, padding: '4px 10px', flexShrink: 0, minWidth: 28, textAlign: 'center',
                    }}>
                      {idx + 1}
                    </span>
                    <div className="card-title" style={{ flex: 1, fontSize: 14 }}>
                      {q.question?.questionText?.substring(0, 150) || t('quizcard.notFound')}
                    </div>
                  </div>
                  <button className="btn-primary" style={{ fontSize: 13, width: '100%', marginTop: 10 }} onClick={() => navigate(`/quiz/${q._id}`)}>
                    ▶ {t('courseView.start')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseViewPage;
