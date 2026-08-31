import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { SkeletonFilters, SkeletonModuleGrid } from '../components/LoadingSkeleton';
import { useTranslation } from '../context/LanguageContext';
import CustomizedExamModal from '../components/CustomizedExamModal';
import CoursePickerModal from '../components/CoursePickerModal';
import QuizSession from '../components/QuizSession';
import '../styles/teal-theme.css';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';

const QuizPage = () => {
  const [view, setView] = useState('modules');
  const [modules, setModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [setupCourse, setSetupCourse] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [quizCounts, setQuizCounts] = useState({});
  const [courseQuizzes, setCourseQuizzes] = useState([]);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionMode, setSessionMode] = useState('start');
  const [sessionLayout, setSessionLayout] = useState('oneByOne');
  const [loadingModules, setLoadingModules] = useState(true);
  const [modulesError, setModulesError] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [subError, setSubError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  useDocumentTitle(t('nav.qcm'));

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

  const fetchModules = useCallback(async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      const discipline = localStorage.getItem('userDiscipline') || '';
      const year = localStorage.getItem('userYear') || '';
      const params = new URLSearchParams();
      if (discipline) params.set('discipline', discipline);
      if (year) params.set('year', year);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/modules?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  }, []);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  const fetchQuizCounts = useCallback(async () => {
    setLoadingCounts(true);
    try {
      let discipline = '', year = '';
      try { discipline = localStorage.getItem('userDiscipline') || ''; year = localStorage.getItem('userYear') || ''; } catch {}
      let url = `${API_BASE_URL}/api/quiz-counts?`;
      if (discipline) url += `&discipline=${discipline}`;
      if (year) url += `&year=${year}`;
      const res = await fetchWithAuth(url);
      if (res.ok) setQuizCounts(await res.json());
    } catch { /* non-critical */ }
    finally { setLoadingCounts(false); }
  }, []);

  useEffect(() => { fetchQuizCounts(); }, [fetchQuizCounts]);

  useEffect(() => {
    let userYear = ''; try { userYear = localStorage.getItem('userYear') || ''; } catch {}
    let userDiscipline = ''; try { userDiscipline = localStorage.getItem('userDiscipline') || ''; } catch {}
    const isResidanat = userYear === '7' && userDiscipline === 'medicine';
    let filtered = (userYear && !isResidanat) ? modules.filter((m) => m.year === Number(userYear)) : modules;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(q));
    }
    setFilteredModules(filtered);
  }, [modules, searchQuery]);

  const handleModuleClick = (mod) => {
    setSelectedModuleId(mod._id);
    setSelectedModule(mod);
    setView('courses');
  };

  const handleBackToModules = () => {
    setView('modules');
    setSelectedModuleId(null);
    setSelectedCourse(null);
  };

  const fetchCourseQuizzes = async (courseName) => {
    setLoadingQuizzes(true);
    try {
      let discipline = '', year = '';
      try { discipline = localStorage.getItem('userDiscipline') || ''; year = localStorage.getItem('userYear') || ''; } catch {}
      let url = `${API_BASE_URL}/api/quizzes?limit=100&discipline=${discipline}&year=${year}&moduleId=${selectedModuleId}`;
      if (courseName) url += `&course=${encodeURIComponent(courseName)}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const items = d.data || (Array.isArray(d) ? d : []);
      setCourseQuizzes(items);
      return items;
    } catch (err) {
      logger.error({ err }, 'quizPage fetchCourseQuizzes failed');
      setCourseQuizzes([]);
      return [];
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleStart = async (courseName) => {
    setSelectedCourse(courseName);
    setSessionMode('start');
    await fetchCourseQuizzes(courseName);
    setSetupCourse(courseName);
    setShowStartModal(true);
  };

  const handleConfirmStart = () => {
    setShowStartModal(false);
    setSessionConfig({ passingScore: 60 });
    setView('session');
  };

  const handleCustomStart = (cfg) => {
    setShowCustomModal(false);
    setSessionMode('custom');
    setSessionConfig({ ...cfg, passingScore: cfg.passingScore || 60 });
    setSessionLayout(cfg.layout || 'oneByOne');
    setView('session');
  };

  const handleOpenCoursePicker = () => {
    setShowCoursePicker(true);
  };

  const handleCoursesSelected = async (courseNames) => {
    setShowCoursePicker(false);
    const selectedSet = new Set(courseNames);
    const allQuizzes = [];
    for (const mod of filteredModules) {
      const modCourseNames = (mod.courses || []).map((c) => (typeof c === 'string' ? c : c.name || ''));
      const hasSelected = modCourseNames.some((name) => selectedSet.has(name));
      if (!hasSelected) continue;
      try {
        let discipline = '', year = '';
        try { discipline = localStorage.getItem('userDiscipline') || ''; year = localStorage.getItem('userYear') || ''; } catch {}
        const url = `${API_BASE_URL}/api/quizzes?limit=200&discipline=${discipline}&year=${year}&moduleId=${mod._id}`;
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const d = await res.json();
          const items = d.data || (Array.isArray(d) ? d : []);
          allQuizzes.push(...items.filter((q) => selectedSet.has(q.course)));
        }
      } catch (err) {
        logger.error({ err, module: mod.name }, 'quizPage fetchModuleQuizzes failed');
      }
    }
    setCourseQuizzes(allQuizzes);
    setShowCustomModal(true);
  };

  const handleBackToCourses = () => {
    setView('courses');
    setSelectedCourse(null);
    setCourseQuizzes([]);
  };

  const isSubActive = subscription?.status === 'active' && (!subscription.endDate || new Date(subscription.endDate) > new Date());
  const counts = selectedModuleId ? quizCounts[selectedModuleId] : null;

  const renderModals = (
    <>
      {showCoursePicker && (
        <CoursePickerModal
          modules={filteredModules}
          onNext={handleCoursesSelected}
          onClose={() => setShowCoursePicker(false)}
        />
      )}
      {showCustomModal && (
        <CustomizedExamModal
          maxQuestions={courseQuizzes.length}
          onStart={handleCustomStart}
          onClose={() => setShowCustomModal(false)}
        />
      )}
      {showStartModal && (
        <div className="ecos-overlay" onClick={() => setShowStartModal(false)}>
          <div className="ecos-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3>{t('courseCard.start')}{setupCourse ? ` — ${setupCourse}` : ''}</h3>
            <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              {t('quiz.autoTimerHint')}
            </p>
            <div className="ecos-modal-actions">
              <button type="button" className="btn-primary" onClick={handleConfirmStart}>
                ▶ {t('courseCard.start')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowStartModal(false)}>
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (view === 'session') {
    return (
      <>
        <QuizSession
          quizzes={courseQuizzes}
          mode={sessionMode}
          layout={sessionLayout}
          config={sessionConfig}
          moduleData={selectedModule}
          onBack={handleBackToCourses}
        />
        {renderModals}
      </>
    );
  }

  if (view === 'courses' && selectedModule) {
    const courses = selectedModule.courses || [];
    return (
      <>
      <div className="page-teal">
        <div className="card-teal">
          <button className="btn-ghost" onClick={handleBackToModules} style={{ marginBottom: 12 }}>
            ← {t('moduleCard.back')}
          </button>
          <h2 style={{ marginBottom: 20 }}>{selectedModule.name}</h2>

          {!isSubActive && !subscriptionLoading && !subError && (
            <div className="gate-banner">
              <div className="gate-icon">&#128274;</div>
              <h3>{t('subscription.required.title')}</h3>
              <p>{t('subscription.required.quizzes')}</p>
              <div className="gate-cta">
                <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('subscription.required.cta')}</button>
              </div>
            </div>
          )}

          {isSubActive && courses.length === 0 && (
            <div className="empty-state">
              <p>{t('quiz.noQuizzes')}</p>
            </div>
          )}

          {isSubActive && (
            <div className="grid-cards">
              {courses.map((c, i) => {
                const courseName = typeof c === 'string' ? c : c.name || '';
                const courseCounts = counts?.courses?.[courseName];
                return (
                  <div key={i} className="card-item" style={{ padding: 20 }}>
                    <div className="card-title" style={{ marginBottom: 8 }}>{courseName}</div>
                    <div className="card-meta" style={{ marginBottom: 12 }}>
                      {t('courseCard.quizCount', { count: courseCounts || '...' })}
                    </div>
                    <button className="btn-primary" onClick={() => handleStart(courseName)} style={{ width: '100%', fontSize: 13 }}>
                      ▶ {t('courseCard.start')}
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => navigate(`/course/${selectedModuleId}/${encodeURIComponent(courseName)}`)}
                      style={{ width: '100%', fontSize: 13, marginTop: 10 }}
                    >
                      {t('quizcard.viewCourse')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {renderModals}
    </>
  );
  }

  return (
    <>
    <div className="page-teal">
      <div className="card-teal">
        <h2>{t('quiz.title')}</h2>

          {subError && !subscriptionLoading && (
            <div className="gate-banner error">
              <div className="gate-icon">&#9888;</div>
              <h3>{t('subscription.error.title')}</h3>
              <p>{t('subscription.error.retryMsg')}</p>
              <div className="gate-cta">
                <button className="btn-primary" onClick={loadSubscription}>{t('subscription.error.retry')}</button>
              </div>
            </div>
          )}

          {!subError && !subscriptionLoading && !isSubActive && (
            <div className="gate-banner">
              <div className="gate-icon">&#128274;</div>
              <h3>{t('subscription.required.title')}</h3>
              <p>{t('subscription.required.quizzes')}</p>
              <div className="gate-cta">
                <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('subscription.required.cta')}</button>
              </div>
            </div>
          )}

        {isSubActive && modulesError && (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('quiz.loadError')} : {modulesError}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>{t('quiz.retry')}</button>
          </div>
        )}

        {isSubActive && loadingModules && (
          <SkeletonModuleGrid count={6} />
        )}

        {isSubActive && !loadingModules && !modulesError && (
          <>
            <input type="text" className="search-input" placeholder={t('quiz.filters.search')}
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 14 }} />
            <button className="btn-primary" onClick={handleOpenCoursePicker} style={{ marginBottom: 16, fontSize: 15, padding: '12px 20px' }}>
              {t('coursePicker.personalizedExam')}
            </button>
            <div className="grid-cards">
              {filteredModules.map((mod) => {
                const modCounts = quizCounts[mod._id];
                return (
                  <div key={mod._id} className="card-item" role="button" tabIndex={0}
                    onClick={() => handleModuleClick(mod)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleModuleClick(mod); } }}
                    style={{ cursor: 'pointer' }}>
                    <div className="card-title">{mod.name}</div>
                    <div className="card-meta" style={{ marginTop: 4 }}>
                      {modCounts ? (
                        <>
                          {t('moduleCard.quizCount', { count: modCounts.total })} · {t('moduleCard.courseCount', { count: (mod.courses || []).length })}
                        </>
                      ) : loadingCounts ? (
                        '...'
                      ) : (
                        t('moduleCard.courseCount', { count: (mod.courses || []).length })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isSubActive && !loadingModules && !modulesError && filteredModules.length === 0 && (
          <div className="empty-state">
            <p>{t('quiz.noQuizzes')}</p>
          </div>
        )}
      </div>
    </div>
    {renderModals}
    </>
  );
};

export default QuizPage;
