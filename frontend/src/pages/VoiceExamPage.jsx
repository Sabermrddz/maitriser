import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import VoiceExam from '../components/VoiceExam.jsx';
import VoiceExamSimulation from '../components/VoiceExamSimulation.jsx';
import EcosCustomizedSetup from '../components/EcosCustomizedSetup';
import EcosCustomizedSession from '../components/EcosCustomizedSession';
import PremiumGateModal from '../components/PremiumGateModal';
import { SkeletonCard } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import { ECOS_YEARS } from '../constants';
import { formatYearLabel } from '../utils/formatYear';
import '../styles/teal-theme.css';

const VoiceExamPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('voiceExams.pageTitle'));
  const navigate = useNavigate();
  let userDiscipline = '', userYear = ''; try { userDiscipline = localStorage.getItem('userDiscipline') || ''; userYear = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
  const canAccessEcos = userDiscipline === 'medicine' && ECOS_YEARS.includes(userYear);
  useEffect(() => {
    if (!canAccessEcos) navigate('/dashboard', { replace: true });
  }, [canAccessEcos, navigate]);

  const [view, setView]                           = useState('modules');
  const [subscription, setSubscription]           = useState(null);
  const [modules, setModules]                     = useState([]);
  const [selectedModule, setSelectedModule]       = useState(null);
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [exams, setExams]                         = useState([]);
  const [allExams, setAllExams]                   = useState([]);
  const [activeExam, setActiveExam]               = useState(null);
  const [examDuration, setExamDuration]           = useState(10);
  const [setupExam, setSetupExam]                 = useState(null);
  const [simulationExams, setSimulationExams]     = useState(null);
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingExams, setLoadingExams]           = useState(false);
  const [modulesError, setModulesError]           = useState(null);
  const [examsError, setExamsError]               = useState(null);
  const [showCustomSetup, setShowCustomSetup]     = useState(false);
  const [customSession, setCustomSession]         = useState(null);
  const [showPremiumGate, setShowPremiumGate]     = useState(false);
  const [subError, setSubError]                   = useState(false);

  const loadSubscription = useCallback(async () => {
    setSubError(false);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) { const d = await res.json(); setSubscription(d.subscription); }
    } catch (err) { logger.error({ err }, 'VoiceExamPage fetchSubscription failed'); setSubError(true); }
  }, []);
  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const noSub = subscription && (subscription.status !== 'active' || (subscription.endDate && new Date(subscription.endDate) < new Date()));

  const fetchModules = useCallback(async () => {
    setLoadingModules(true);
    setModulesError(null);
    try {
      let discipline = 'medicine'; try { discipline = localStorage.getItem('userDiscipline') || 'medicine'; } catch { /* incognito */ }
      let year = ''; try { year = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
      const params = new URLSearchParams();
      if (discipline) params.set('discipline', discipline);
      if (year) params.set('year', year);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/modules?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setModules(await res.json());
    } catch (err) {
      logger.error({ err }, 'VoiceExamPage fetchModules failed');
      setModulesError(err.message);
    } finally {
      setLoadingModules(false);
    }
  }, []);

  const fetchExams = useCallback(async (signal) => {
    if (!selectedModuleId) { setExams([]); return; }
    setLoadingExams(true);
    setExamsError(null);
    try {
      let year = ''; try { year = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
      const params = new URLSearchParams();
      if (year)  params.set('year', year);
      if (selectedModuleId)   params.set('moduleId', selectedModuleId);
      let url = `${API_BASE_URL}/api/voice-exams?${params.toString()}`;
      const res = await fetchWithAuth(url, signal ? { signal } : undefined);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExams(await res.json());
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'VoiceExamPage fetchExams failed');
      setExamsError(err.message);
    } finally {
      setLoadingExams(false);
    }
  }, [selectedModuleId]);

  useEffect(() => { fetchModules(); }, [fetchModules]);
  useEffect(() => {
    if (!selectedModuleId) return;
    const controller = new AbortController();
    fetchExams(controller.signal);
    return () => controller.abort();
  }, [selectedModuleId, fetchExams]);

  const checkSubscription = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) {
        const d = await res.json();
        if (d.subscription?.status === 'active' && new Date(d.subscription.endDate) > new Date()) {
          return true;
        }
      }
    } catch { logger.error({}, 'VoiceExamPage checkSubscription failed') }
    return false;
  };

  const handleExamClick = async (exam) => {
    const hasSub = await checkSubscription();
    if (!hasSub) { setShowPremiumGate(true); return; }
    setSetupExam(exam);
    setExamDuration(10);
  };

  const handleStartExam = () => {
    setActiveExam(setupExam);
    setSetupExam(null);
  };

  const handleStartSimulation = async () => {
    const hasSub = await checkSubscription();
    if (!hasSub) { setShowPremiumGate(true); return; }
    setSimulationExams(exams);
  };

  const handleCustomEcos = async () => {
    const hasSub = await checkSubscription();
    if (!hasSub) { setShowPremiumGate(true); return; }
    try {
      let year = ''; try { year = localStorage.getItem('userYear') || ''; } catch { /* incognito */ }
      const params = new URLSearchParams();
      if (year) params.set('year', year);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/voice-exams?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAllExams(Array.isArray(data) ? data : (data.data || []));
      }
    } catch { /* non-critical */ }
    setShowCustomSetup(true);
  };

  const handleCustomStart = ({ exams: picked, stationCount, minutesPerStation }) => {
    setCustomSession({ exams: picked, stationCount, minutesPerStation });
    setShowCustomSetup(false);
  };

  const handleCustomBack = () => {
    setCustomSession(null);
    setShowCustomSetup(false);
  };

  const handleModuleClick = (mod) => {
    setSelectedModule(mod);
    setSelectedModuleId(mod._id);
    setView('exams');
  };

  const handleBackToModules = () => {
    setView('modules');
    setSelectedModule(null);
    setSelectedModuleId('');
    setExams([]);
  };

  if (!canAccessEcos) return null;

  if (customSession) {
    return (
      <EcosCustomizedSession
        exams={customSession.exams}
        stationCount={customSession.stationCount}
        minutesPerStation={customSession.minutesPerStation}
        onBack={handleCustomBack}
      />
    );
  }

  if (showCustomSetup) {
    return (
      <EcosCustomizedSetup
        modules={modules}
        allExams={allExams}
        onStart={handleCustomStart}
        onBack={() => setShowCustomSetup(false)}
      />
    );
  }

  if (simulationExams) {
    return (
      <VoiceExamSimulation exams={simulationExams} onBack={() => setSimulationExams(null)} />
    );
  }

  if (activeExam) {
    return (
      <div className="page-teal">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <VoiceExam exam={activeExam} onBack={() => setActiveExam(null)} duration={examDuration} />
        </div>
      </div>
    );
  }

  if (subError) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#9888;</div>
          <h3 style={{ color: '#c0392b', margin: '0 0 8px' }}>{t('subscription.error.title')}</h3>
          <p style={{ color: '#c0392b', fontSize: '0.9rem', margin: '0 0 16px' }}>
            {t('subscription.error.retryMsg')}
          </p>
          <button className="btn-primary" onClick={loadSubscription}>{t('subscription.error.retry')}</button>
        </div>
      </div>
    );
  }

  if (subscription && noSub) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
          <h3 style={{ color: '#856404', margin: '0 0 8px' }}>{t('subscription.required.title')}</h3>
          <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
            {t('subscription.required.voiceExams')}
          </p>
          <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('subscription.required.cta')}</button>
        </div>
      </div>
    );
  }

  if (view === 'exams' && selectedModule) {
    return (
      <div className="page-teal">
        <div className="card-teal">
          <button className="btn-ghost" onClick={handleBackToModules} style={{ marginBottom: 12 }}>
            &larr; {t('moduleCard.back')}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{selectedModule.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn-outline" onClick={handleCustomEcos}>
                {t('ecosCustomSetup.title')}
              </button>
              <button type="button" className="btn-primary" onClick={handleStartSimulation}>
                {t('voiceExams.startSimulation')}
              </button>
            </div>
          </div>

          {examsError ? (
            <div className="empty-state" style={{ color: '#e74c3c' }}>
              <p>{t('voiceExams.examLoadError', { error: examsError })}</p>
              <button type="button" className="btn-primary" onClick={() => fetchExams()} style={{ marginTop: '12px' }}>{t('voiceExams.retry')}</button>
            </div>
          ) : loadingExams ? (
            <div className="grid-cards"><SkeletonCard count={6} /></div>
          ) : exams.length === 0 ? (
            <div className="empty-state">
              <p>{t('voiceExams.noExams')}</p>
              <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{t('voiceExams.noExamsHint')}</p>
            </div>
          ) : (
            <div className="grid-cards">
              {exams.map((exam) => (
                <div key={exam._id} className="card-item" role="button" tabIndex={0} onClick={() => handleExamClick(exam)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExamClick(exam); } }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '3px 10px', borderRadius: 20, marginBottom: 8, letterSpacing: '0.5px' }}>{t('voiceExams.badge')}</span>
                  <div className="card-title">{exam.title}</div>
                  <div className="card-meta">{t('voiceExams.yearMeta', { year: formatYearLabel(exam.year), module: exam.moduleId?.name || '' })}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {setupExam && (
          <div className="ecos-overlay" onClick={() => setSetupExam(null)}>
            <div className="ecos-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 8 }}>{t('voiceExams.setupTitle')}</h3>
              <p style={{ fontSize: 13, marginBottom: 20, color: 'var(--text-muted)' }}>{setupExam.title}</p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  {t('voiceExams.minutesLabel')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={examDuration}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v)) setExamDuration(Math.max(1, Math.min(v, 120)));
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border-light)', fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)' }}
                />
              </div>

              <div className="ecos-footer">
                <button type="button" className="btn-primary" onClick={handleStartExam}>
                  {t('voiceExams.startExam')}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setSetupExam(null)}>
                  {t('voiceExams.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <PremiumGateModal open={showPremiumGate} onClose={() => setShowPremiumGate(false)} />
      </div>
    );
  }

  return (
    <div className="page-teal">
      <div className="card-teal">
        <h2 style={{ margin: '0 0 20px', fontSize: '1.5rem' }}>{t('voiceExams.title')}</h2>

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('voiceExams.loadError', { error: modulesError })}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>{t('voiceExams.retry')}</button>
          </div>
        ) : loadingModules ? (
          <div className="grid-cards"><SkeletonCard count={6} /></div>
        ) : modules.length === 0 ? (
          <div className="empty-state">
            <p>{t('voiceExams.noExams')}</p>
            <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>{t('voiceExams.noExamsHint')}</p>
          </div>
        ) : (
          <div className="grid-cards">
            {modules.map((mod) => (
              <div key={mod._id} className="card-item" role="button" tabIndex={0}
                onClick={() => handleModuleClick(mod)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleModuleClick(mod); } }}
                style={{ cursor: 'pointer' }}>
                <div className="card-title">{mod.name}</div>
                <div className="card-meta" style={{ marginTop: 4 }}>
                  {t('moduleCard.courseCount', { count: (mod.courses || []).length })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {setupExam && (
        <div className="ecos-overlay" onClick={() => setSetupExam(null)}>
          <div className="ecos-modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>{t('voiceExams.setupTitle')}</h3>
            <p style={{ fontSize: 13, marginBottom: 20, color: 'var(--text-muted)' }}>{setupExam.title}</p>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t('voiceExams.minutesLabel')}
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={examDuration}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setExamDuration(Math.max(1, Math.min(v, 120)));
                }}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--border-light)', fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)' }}
              />
            </div>

            <div className="ecos-footer">
              <button type="button" className="btn-primary" onClick={handleStartExam}>
                {t('voiceExams.startExam')}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setSetupExam(null)}>
                {t('voiceExams.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <PremiumGateModal open={showPremiumGate} onClose={() => setShowPremiumGate(false)} />
    </div>
  );
};

export default VoiceExamPage;
