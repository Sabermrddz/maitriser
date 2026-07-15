import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import { FaGraduationCap, FaRandom } from 'react-icons/fa';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/mockExams.css';

const MockExamListPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('mockExamList.title'));
  const navigate = useNavigate();
  const notify = useToast();

  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState('');

  const [quizExams, setQuizExams] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(true);
  const [startingId, setStartingId] = useState(null);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    const disc = (() => { try { return localStorage.getItem('userDiscipline'); } catch { return ''; } })();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/modules?discipline=${disc || 'medicine'}`);
        if (res.ok && mountedRef.current) setModules(await res.json());
      } catch { logger.error({}, 'MockExamListPage fetchModules failed') }
    })();
  }, []);

  useEffect(() => {
    setLoadingQuiz(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (selectedModuleId) params.set('moduleId', selectedModuleId);
        const res = await fetchWithAuth(`${API_BASE_URL}/api/mock-exams?${params}`);
        if (res.ok && mountedRef.current) setQuizExams(await res.json());
      } catch { logger.error('fetch quiz mock exams'); }
      finally { if (mountedRef.current) setLoadingQuiz(false); }
    })();
  }, [selectedModuleId]);

  const handleStartQuiz = async (examId) => {
    setStartingId(examId);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/mock-exams/${examId}/start`, { method: 'POST', body: {} });
      if (!res.ok) {
        const d = await res.json();
        notify(d.message || t('mockExamList.cannotStart'), 'error');
        return;
      }
      const data = await res.json();
      navigate(`/mock-exam/${data.attemptId}`, { state: { questions: data.questions, duration: data.duration, title: data.title, attemptId: data.attemptId, mockExamId: examId } });
    } catch { notify(t('mockExamList.networkError'), 'error'); }
    finally { setStartingId(null); }
  };

  const handleStartRandomQuiz = () => {
    if (quizExams.length === 0) {         notify(t('mockExamList.noExams'), 'info'); return; }
    const random = quizExams[Math.floor(Math.random() * quizExams.length)];
    handleStartQuiz(random._id);
  };

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2><FaGraduationCap /> {t('mockExamList.title')}</h2>

        <div className="filters-row" style={{ marginTop: 16 }}>
          <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
            <option value="">{t('mockExamList.allModules')}</option>
            {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
        </div>

        <>
          {quizExams.length > 0 && (
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <button className="btn-primary" onClick={handleStartRandomQuiz} disabled={startingId !== null}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FaRandom /> {t('mockExamList.startRandom')}
              </button>
            </div>
          )}
          <div className="grid-cards">
            {loadingQuiz && <SkeletonCard count={3} />}
            {!loadingQuiz && quizExams.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <p>{t('mockExamList.noQuizExams')}</p>
              </div>
            )}
            {quizExams.map((e) => (
              <div key={e._id} className="card-item">
                <p style={{ fontSize: 11, color: '#04484F', fontWeight: 'bold', margin: '0 0 4px' }}>{t('mockExamList.badgeQuiz')}</p>
                <div className="card-title">{e.title}</div>
                <div className="card-meta">{t('mockExamList.quizMeta', { module: e.moduleId?.name || '', count: e.questionCount, duration: e.duration })}</div>
                <button className="btn-primary" style={{ marginTop: 12, width: '100%' }}
                  onClick={() => handleStartQuiz(e._id)} disabled={startingId === e._id}>
                  {startingId === e._id ? t('mockExamList.starting') : t('mockExamList.start')}
                </button>
              </div>
            ))}
          </div>
        </>
      </div>
    </div>
  );
};

export default MockExamListPage;
