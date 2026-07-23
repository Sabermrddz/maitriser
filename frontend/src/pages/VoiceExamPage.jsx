import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import VoiceExam from '../components/VoiceExam.jsx';
import VoiceExamSimulation from '../components/VoiceExamSimulation.jsx';
import EcosCustomizedSetup from '../components/EcosCustomizedSetup';
import EcosCustomizedSession from '../components/EcosCustomizedSession';
import PremiumGateModal from '../components/PremiumGateModal';
import { SkeletonCard, SkeletonFilters } from '../components/LoadingSkeleton';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import { ECOS_YEARS } from '../constants';
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

  const [subscription, setSubscription]           = useState(null);
  const [modules, setModules]                     = useState([]);
  const [selectedModuleId, setSelectedModuleId]   = useState('');
  const [exams, setExams]                         = useState([]);
  const [activeExam, setActiveExam]               = useState(null);
  const [examDuration, setExamDuration]           = useState(10);
  const [setupExam, setSetupExam]                 = useState(null);
  const [simulationExams, setSimulationExams]     = useState(null);
  const [loadingModules, setLoadingModules]       = useState(true);
  const [loadingExams, setLoadingExams]           = useState(true);
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
      const url = `${API_BASE_URL}/api/modules?discipline=${discipline}`;
      const res = await fetchWithAuth(url);
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
    const yearModules = modules.filter((m) => !userYear || !m.year || String(m.year) === String(userYear));
    return (
      <EcosCustomizedSetup
        modules={yearModules}
        allExams={exams}
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

  return (
    <div className="page-teal">
      <div className="card-teal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>{t('voiceExams.title')}</h2>
          {exams.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleCustomEcos}
                style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid var(--teal-dark)', background: 'transparent', color: 'var(--teal-dark)', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
              >
                {t('ecosCustomSetup.title')}
              </button>
              <button
                type="button"
                onClick={handleStartSimulation}
                style={{ padding: '8px 18px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}
              >
                {t('voiceExams.startSimulation')}
              </button>
            </div>
          )}
        </div>

        {modulesError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('voiceExams.loadError', { error: modulesError })}</p>
            <button type="button" className="btn-primary" onClick={fetchModules} style={{ marginTop: '12px' }}>{t('voiceExams.retry')}</button>
          </div>
        ) : loadingModules ? (
          <SkeletonFilters count={2} />
        ) : (
          <div className="filters-row">
            <select value={selectedModuleId} onChange={(e) => setSelectedModuleId(e.target.value)}>
              <option value="">{t('voiceExams.allSpecialties')}</option>
              {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
        )}

        {examsError ? (
          <div className="empty-state" style={{ color: '#e74c3c' }}>
            <p>{t('voiceExams.examLoadError', { error: examsError })}</p>
            <button type="button" className="btn-primary" onClick={fetchExams} style={{ marginTop: '12px' }}>{t('voiceExams.retry')}</button>
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
                <p style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold', margin: '0 0 4px' }}>{t('voiceExams.badge')}</p>
                <div className="card-title" style={{ marginBottom: '4px' }}>{exam.title}</div>
                <div className="card-meta">{t('voiceExams.yearMeta', { year: exam.year, module: exam.moduleId?.name || '' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {setupExam && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }} onClick={() => setSetupExam(null)}>
          <div className="card-teal" style={{ maxWidth: 400, width: '100%', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{t('voiceExams.setupTitle')}</h3>
            <p style={{ fontSize: 13, marginBottom: 16, color: 'var(--text-muted)' }}>{setupExam.title}</p>

            <div style={{ marginBottom: 20 }}>
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
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleStartExam}
                style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}
              >
                {t('voiceExams.startExam')}
              </button>
              <button
                type="button"
                onClick={() => setSetupExam(null)}
                style={{ padding: '10px 24px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 600 }}
              >
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
