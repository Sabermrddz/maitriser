import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { SkeletonQuizItem, SkeletonFilters } from '../components/LoadingSkeleton';
import { useTranslation } from '../context/LanguageContext';
import Pagination from '../components/Pagination';
import '../styles/teal-theme.css';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';

const QuizPage = () => {
  const [modules, setModules]                     = useState([]);
  const [filteredModules, setFilteredModules]     = useState([]);
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [selectedCourse, setSelectedCourse]       = useState('');
  const [moduleCourses, setModuleCourses]         = useState([]);
  const [quizzes, setQuizzes]                     = useState([]);
  const [studyMode, setStudyMode]                 = useState(false);
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingQuizzes, setLoadingQuizzes]       = useState(true);
  const [modulesError, setModulesError]           = useState(null);
  const [quizzesError, setQuizzesError]           = useState(null);
  const [searchQuery, setSearchQuery]             = useState('');
  const [debouncedSearch, setDebouncedSearch]     = useState('');
  const [page, setPage]                           = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const [subscription, setSubscription]           = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subError, setSubError]                   = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  useDocumentTitle(t('nav.qcm'));

  useEffect(() => {
    const controller = new AbortController();
    fetchModules(controller.signal);
    return () => controller.abort();
  }, []);
  const loadSubscription = useCallback(async () => {
    setSubscriptionLoading(true);
    setSubError(false);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) { const d = await res.json(); setSubscription(d.subscription); }
    } catch (err) { logger.error({ err }, 'quizPage fetchSubscription failed'); setSubError(true); }
    finally { setSubscriptionLoading(false); }
  }, []);
  useEffect(() => { loadSubscription(); }, [loadSubscription]);
  useEffect(() => {
    let userYear = ''; try { userYear = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
    const filtered = userYear ? modules.filter((m) => m.year === Number(userYear)) : modules;
    setFilteredModules(filtered);
    const pendingModuleId = location.state?.moduleId;
    if (pendingModuleId && filtered.some((m) => m._id === pendingModuleId)) {
      setSelectedModuleId(pendingModuleId);
      window.history.replaceState({}, '');
    } else {
      setSelectedModuleId('');
    }
    setSelectedCourse('');
  }, [modules]);

  useEffect(() => {
    if (!selectedModuleId) { setModuleCourses([]); setSelectedCourse(''); return; }
    const mod = modules.find((m) => m._id === selectedModuleId);
    setModuleCourses(mod?.courses || []);
    setSelectedCourse('');
  }, [selectedModuleId, modules]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchQuizzes(1);
  }, [selectedModuleId, selectedCourse, debouncedSearch]);

  const fetchModules = async (signal) => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || '';
      const url = discipline ? `${API_BASE_URL}/api/modules?discipline=${discipline}` : `${API_BASE_URL}/api/modules`;
      const res = await fetchWithAuth(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!signal.aborted) setModules(await res.json());
    } catch (err) {
      if (err.name === 'AbortError') return;
      setModulesError(err.message);
    } finally {
      if (!signal?.aborted) setLoadingModules(false);
    }
  };

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchQuizzes = useCallback(async (pg) => {
    const pageNum = typeof pg === 'number' ? pg : 1;
    setLoadingQuizzes(true);
    setQuizzesError(null);
    try {
      let discipline = '', year = ''; try { discipline = localStorage.getItem('userDiscipline') || ''; year = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
      let url = `${API_BASE_URL}/api/quizzes?page=${pageNum}&limit=50`;
      if (discipline)    url += `&discipline=${discipline}`;
      if (year)          url += `&year=${year}`;
      if (selectedModuleId)      url += `&moduleId=${selectedModuleId}`;
      if (selectedCourse)        url += `&course=${encodeURIComponent(selectedCourse)}`;
      if (debouncedSearch.trim())    url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (!mountedRef.current) return;
      setQuizzes(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.pages || 1);
    } catch (err) {
      setQuizzesError(err.message);
    } finally {
      if (mountedRef.current) setLoadingQuizzes(false);
    }
  }, [selectedModuleId, selectedCourse, debouncedSearch]);

  const filteredQuizzes = quizzes;

  const handleStart = (quiz) => {
    navigate(`/quiz/${quiz._id}`, {
      state: {
        quizId:   quiz._id,
        quizName: quiz.question?.questionText || quiz.quizId,
        question: quiz.question,
        studyMode,
        caseId:   quiz.caseId || null,
        course:   quiz.course || '',
        moduleId: quiz.moduleId || null,
      },
    });
  };

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2>{t('quiz.title')}</h2>

        {!subscriptionLoading && subError && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fdecea', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#9888;</div>
            <h3 style={{ color: '#c0392b', margin: '0 0 8px' }}>{t('subscription.error.title')}</h3>
            <p style={{ color: '#c0392b', fontSize: '0.9rem', margin: '0 0 16px' }}>
              {t('subscription.error.retryMsg')}
            </p>
            <button className="btn-primary" onClick={loadSubscription}>{t('subscription.error.retry')}</button>
          </div>
        )}

        {!subscriptionLoading && !subError && (!subscription || subscription.status !== 'active' || (subscription.endDate && new Date(subscription.endDate) < new Date())) && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff3cd', borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
            <h3 style={{ color: '#856404', margin: '0 0 8px' }}>{t('subscription.required.title')}</h3>
            <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
              {t('subscription.required.quizzes')}
            </p>
            <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('subscription.required.cta')}</button>
          </div>
        )}

        {subscription && subscription.status === 'active' && modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('quiz.loadError')} : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
          </div>
        ) : subscription && subscription.status === 'active' && loadingModules ? (
          <SkeletonFilters count={3} />
        ) : subscription && subscription.status === 'active' && (
          <div className="filters-row">
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">{t('quiz.filters.allModules')}</option>
              {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
            <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} disabled={!selectedModuleId || moduleCourses.length === 0}>
              <option value="">{t('quiz.filters.allCourses')}</option>
              {moduleCourses.map((c, i) => {
                const cName = typeof c === 'string' ? c : c.name || '';
                return <option key={i} value={cName}>{cName}</option>;
              })}
            </select>
            <input type="text" placeholder={`🔍 ${t('quiz.filters.search')}`} value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, minWidth: '180px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light, #ddd)', fontSize: '14px' }} />
          </div>
        )}

        {subscription && subscription.status === 'active' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
              <input type="checkbox" checked={studyMode} onChange={(e) => setStudyMode(e.target.checked)} />
              🔍 {t('quiz.studyMode')}
            </label>
          </div>

          {quizzesError ? (
            <div className="empty-state" style={{ color: '#e74c3c' }}>
              <p>{t('quiz.loadError')} : {quizzesError}</p>
              <button type="button" className="btn-primary" onClick={fetchQuizzes} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
            </div>
          ) : loadingQuizzes ? (
            <SkeletonQuizItem count={5} />
          ) : (
            <>
              {filteredQuizzes.length === 0 ? (
                <div className="empty-state">
                  <p>{t('quiz.noQuizzes')}</p>
                  <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{t('quiz.noQuizzesHint')}</p>
                </div>
              ) : (
                filteredQuizzes.map((quiz) => (
                  <div key={quiz._id} className="quiz-card-item">
                    <div className="qid">{quiz.quizId}</div>
                    {quiz.caseId && <span style={{ display: 'inline-block', background: '#e3f2fd', color: '#04484F', padding: '2px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>📋 {t('quiz.case')}</span>}
                    <h3>{quiz.question?.questionText?.substring(0, 80) || quiz.quizId}</h3>
                    {quiz.question?.questionImage && (
                      <img src={`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, marginTop: 8, marginBottom: 8 }} />
                    )}
                    <div className="qmeta">
                      {t('quizPage.yearLabel')} {quiz.year} — {quiz.moduleId?.name || ''}{quiz.course ? ` — ${quiz.course}` : ''}
                    </div>
                    {quiz.caseId ? (
                      <button type="button" className="btn-primary" onClick={() => navigate(`/case-exam/${quiz.caseId._id || quiz.caseId}`)}>
                        📋 {t('quiz.launchCase')}
                      </button>
                    ) : (
                      <button type="button" className="btn-primary" onClick={() => handleStart(quiz)}>
                        {studyMode ? t('quiz.study') : t('quiz.start')}
                      </button>
                    )}
                  </div>
                ))
              )}
              {!loadingQuizzes && !quizzesError && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchQuizzes(p)} />}
            </>
          )}
        </>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
