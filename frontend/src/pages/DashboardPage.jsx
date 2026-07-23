import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaLungs, FaBrain, FaHeart, FaVial, FaFileMedical, FaClipboardList, FaStethoscope, FaGraduationCap, FaChevronRight, FaUser, FaChevronDown } from "react-icons/fa";
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { logger } from '../utils/logger';
import { ECOS_YEARS } from '../constants';
import useDocumentTitle from '../utils/useDocumentTitle';
import PageHeader from '../components/PageHeader';
import "../styles/teal-theme.css";
import "../styles/userDashboard.css";
import "../styles/PageHeader.css";

const R = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

const moduleIconMap = {
  pneumologie: <FaLungs />, pneumo: <FaLungs />, poumon: <FaLungs />,
  neurologie: <FaBrain />, neuro: <FaBrain />, cerveau: <FaBrain />,
  cardiologie: <FaHeart />, cardio: <FaHeart />, coeur: <FaHeart />, cœur: <FaHeart />,
  gastro: <FaVial />, gastroentérologie: <FaVial />, digestion: <FaVial />,
};

const fallbackIcon = <FaFileMedical />;

const DashboardPage = () => {
  const { t, lang } = useTranslation();
  useDocumentTitle(t('dashboard.title'));
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [results, setResults] = useState([]);
  const [voiceResults, setVoiceResults] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const scroll = useCallback((dir) => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  }, []);

  const userId = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
  const discipline = (() => { try { return localStorage.getItem('userDiscipline'); } catch { return null; } })();
  const year = (() => { try { return localStorage.getItem('userYear'); } catch { return null; } })();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, modRes, resultsRes, subRes, vrRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/api/users/profile`),
          fetchWithAuth(`${API_BASE_URL}/api/modules?discipline=${discipline || 'medicine'}&year=${year || ''}`),
          fetchWithAuth(`${API_BASE_URL}/api/results/${userId}?limit=100`),
          fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`),
          fetchWithAuth(`${API_BASE_URL}/api/voice-exam-results/${userId}?limit=100`).catch((err) => { logger.error({ err }, 'Failed to fetch voice results'); return null; }),
        ]);

        if (cancelled) return;

        if (profileRes?.ok) {
          const data = await profileRes.json();
          setProfile(data.user || data);
        }

        if (modRes?.ok) {
          const data = await modRes.json();
          setModules(Array.isArray(data) ? data : (data.modules || []));
        }

        if (resultsRes?.ok) {
          const data = await resultsRes.json();
          setResults(Array.isArray(data) ? data : (data.results || []));
        }

        if (subRes?.ok) {
          const data = await subRes.json();
          setSubscription(data.subscription || null);
        }

        if (vrRes?.ok) {
          const data = await vrRes.json();
          setVoiceResults(Array.isArray(data) ? data : (data.results || []));
        }
      } catch (err) {
        if (!cancelled) logger.error({ err }, 'Dashboard fetch error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, discipline, year]);

  const passRate = useMemo(() => {
    if (!results.length) return 0;
    const passed = results.filter(r => r.score === 1).length;
    return Math.round((passed / results.length) * 100);
  }, [results]);

  const offset = useMemo(() => CIRCUMFERENCE * (1 - passRate / 100), [passRate]);

  const recentQcm = useMemo(() => {
    if (!results.length) return [];
    return [...results].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 3);
  }, [results]);

  const recentEcos = useMemo(() => {
    if (!voiceResults.length) return [];
    return [...voiceResults].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
  }, [voiceResults]);

  const moduleCards = useMemo(() => {
    if (!modules.length) return [];
    return modules.map(mod => {
      const modName = (mod.name || '').toLowerCase();
      let icon = fallbackIcon;
      for (const [key, ico] of Object.entries(moduleIconMap)) {
        if (modName.includes(key)) { icon = ico; break; }
      }

      const totalLessons = Array.isArray(mod.courses) ? mod.courses.length : 0;
      let attempted = 0;
      if (totalLessons > 0 && results.length > 0) {
        const moduleResults = results.filter(r => {
          const quiz = r.quizId;
          if (!quiz) return false;
          const quizModName = (quiz.moduleId?.name || quiz.moduleName || '').toLowerCase();
          return quizModName.includes(modName) || modName.includes(quizModName);
        });
        attempted = Math.min(new Set(moduleResults.map(r => r.quizId?._id || r.quizId)).size, totalLessons);
      }

      const pct = totalLessons > 0 ? Math.round((attempted / totalLessons) * 100) : 0;

      return { ...mod, icon, totalLessons, attempted, pct };
    });
  }, [modules, results]);

  const userName = profile?.name || (() => { try { return localStorage.getItem('userName'); } catch { return ''; } })();
  const userDiscipline = profile?.discipline || discipline || t('dashboard.fallbackDiscipline');
  const userYear = profile?.year || year || '';
  const subActive = subscription?.status === 'active';
  const isPremium = subActive && new Date(subscription.endDate) > new Date();

  const topBarRight = (
    <div className="dash-top-profile" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
      <div className="dash-top-avatar"><FaUser /></div>
      <span>{userName || t('dashboard.fallbackUser')}</span>
      <FaChevronDown style={{ fontSize: '0.65rem', color: 'var(--dash-text-muted)' }} />
    </div>
  );

  if (loading) {
    return (
      <div className="dash-root">
        <div className="dash-watermark" />
        <div className="dash-main">
          <PageHeader className="dash-topbar" right={topBarRight} />
          <div className="dash-workspace">
            <div className="dash-content-stream">
              <div className="dash-skeleton" style={{ height: 140, borderRadius: 14 }} />
              <div className="dash-skeleton" style={{ height: 180, borderRadius: 14 }} />
              <div className="dash-skeleton" style={{ height: 200, borderRadius: 14 }} />
            </div>
            <div className="dash-skeleton" style={{ height: 300, borderRadius: 14 }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-root">
      <div className="dash-watermark" />
      <div className="dash-main">
        <PageHeader className="dash-topbar" right={topBarRight} />

        <div className="dash-workspace">
          <div className="dash-content-stream">
            {/* Hero */}
            <section className="dash-hero">
              <div className="dash-hero-welcome">
                <h1>{t('dashboard.hero.greeting')}{userName ? <span className="dash-hero-accent"> {userName}</span> : ''}</h1>
                <p className="dash-subtitle">{userYear ? t('dashboard.hero.subtitleYear', { year: userYear, discipline: userDiscipline }) : t('dashboard.hero.subtitleDiscipline', { discipline: userDiscipline })}</p>
                <p className="dash-motivation">{t('dashboard.hero.motivation')}</p>
              </div>
              <div className="dash-hero-progress">
                <div className="dash-progress-ring">
                  <svg width="120" height="120">
                    <circle className="dash-ring-bg" r={R} cx="60" cy="60" />
                    <circle className="dash-ring-fill" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={loading ? CIRCUMFERENCE : offset} r={R} cx="60" cy="60" />
                  </svg>
                  <div className="dash-ring-text">
                    <span className="dash-ring-pct">{passRate}%</span>
                    <span className="dash-ring-label">{t('dashboard.hero.accuracy')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Upgrade banner */}
            {!isPremium && (
              <div className="dash-upgrade">
                <span>{t('dashboard.upgrade.text')}</span>
                <button className="dash-upgrade-btn" onClick={() => navigate('/pricing')}>{t('dashboard.upgrade.cta')}</button>
              </div>
            )}

            {/* Modules */}
            {!year ? (
              <section className="dash-section">
                <div className="dash-empty-state">
                  <p>{t('dashboard.modules.noYear')}</p>
                  <button className="dash-empty-cta" onClick={() => navigate('/profile')}>{t('dashboard.modules.goProfile')}</button>
                </div>
              </section>
            ) : moduleCards.length > 0 ? (
              <section className="dash-section dash-carousel-section">
                <div className="dash-section-header">
                  <h2>{t('dashboard.modules.title')}</h2>
                  <button className="dash-view-all" onClick={() => navigate('/quizPage')}>
                    {t('dashboard.viewAll')} <FaChevronRight style={{ fontSize: '0.65rem' }} />
                  </button>
                </div>
                <button className="dash-carousel-arrow left" onClick={() => scroll(-1)} aria-label="Previous"><span>&#8592;</span></button>
                <div className="dash-modules-track" ref={trackRef} role="region" aria-label={t('dashboard.modules.title')}>
                  {moduleCards.map((mod, i) => (
                    <div key={mod._id || i} className="dash-module-card" role="button" tabIndex={0} onClick={() => navigate('/quizPage', { state: { moduleId: mod._id } })} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/quizPage', { state: { moduleId: mod._id } }); } }}>
                      <div className="dash-module-icon">{mod.icon}</div>
                      <h3>{mod.name}</h3>
                      <p className="dash-module-stats">{mod.attempted} / {mod.totalLessons} {t('dashboard.modules.lessons', { count: mod.totalLessons })}</p>
                      <div className="dash-module-bar"><div className="dash-bar-fill" style={{ width: `${mod.pct}%` }} /></div>
                      <span className="dash-module-pct">{mod.pct}%</span>
                    </div>
                  ))}
                </div>
                <button className="dash-carousel-arrow right" onClick={() => scroll(1)} aria-label="Next"><span>&#8594;</span></button>
              </section>
            ) : (
              <section className="dash-section">
                <div className="dash-empty-state">
                  <p>{t('dashboard.modules.empty')}</p>
                </div>
              </section>
            )}

            {/* Activities split */}
            <section className="dash-section dash-activity-split">
              {/* Recent QCM */}
              <div className="dash-activity-block">
                <div className="dash-section-header">
                  <h2>{t('dashboard.qcm.recent')}</h2>
                  <button className="dash-view-all" onClick={() => navigate('/review')}>
                    {t('dashboard.viewAll')} <FaChevronRight style={{ fontSize: '0.65rem' }} />
                  </button>
                </div>
                <div className="dash-list">
                  {recentQcm.length === 0 && <div className="dash-empty">{t('dashboard.empty.qcm')}</div>}
                  {recentQcm.map((r, i) => {
                    const quiz = r.quizId || {};
                    return (
                      <div key={r._id || i} className="dash-list-item" role="button" tabIndex={0} onClick={() => quiz.quizId && navigate(`/quiz/${quiz.quizId}`)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && quiz.quizId) { e.preventDefault(); navigate(`/quiz/${quiz.quizId}`); } }}>
                        <div className="dash-item-icon green"><FaClipboardList /></div>
                        <div className="dash-item-info">
                          <h4>{quiz.question?.questionText?.substring(0, 50) || quiz.quizName || `Quiz #${quiz.quizId || ''}`}</h4>
                          <p>{formatDate(r.timestamp, lang)} · {r.score === 1 ? t('dashboard.result.passed') : t('dashboard.result.review')}</p>
                        </div>
                        <FaChevronRight className="dash-item-arrow" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {discipline === 'medicine' && ECOS_YEARS.includes(year) && (
              <div className="dash-activity-block">
                <div className="dash-section-header">
                  <h2>{t('dashboard.ecos.recent')}</h2>
                  <button className="dash-view-all" onClick={() => navigate('/voice-exams')}>
                    {t('dashboard.viewAll')} <FaChevronRight style={{ fontSize: '0.65rem' }} />
                  </button>
                </div>
                <div className="dash-list">
                  {recentEcos.length === 0 && <div className="dash-empty">{t('dashboard.empty.ecos')}</div>}
                  {recentEcos.map((r, i) => {
                    const score = r.overallTotal > 0 ? Math.round((r.overallPassed / r.overallTotal) * 100) : 0;
                    return (
                      <div key={r._id || i} className="dash-list-item" role="button" tabIndex={0} onClick={() => navigate('/voice-exams')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/voice-exams'); } }}>
                        <div className="dash-item-icon dark"><FaStethoscope /></div>
                        <div className="dash-item-info">
                          <h4>{r.examId?.title || t('dashboard.voiceExam.title')}</h4>
                          <p>{formatDate(r.createdAt, lang)} · {t('dashboard.score')} : <span className="dash-score">{score}%</span></p>
                        </div>
                        <FaChevronRight className="dash-item-arrow" />
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
            </section>
          </div>

          {/* Right panel */}
          <aside className="dash-right">
            <h3 className="dash-right-title">{t('dashboard.actions.title')}</h3>

            <div className="dash-action-card" role="button" tabIndex={0} onClick={() => navigate('/quizPage')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/quizPage'); } }}>
              <div className="dash-action-header">
                <div className="dash-action-badge green"><FaClipboardList /></div>
                <div className="dash-action-info">
                  <h3>{t('dashboard.actions.quickQcm')}</h3>
                  <p>{t('dashboard.actions.quickQcm.desc')}</p>
                </div>
                <FaChevronRight className="dash-action-arrow" />
              </div>
            </div>

            {discipline === 'medicine' && ECOS_YEARS.includes(year) && (
            <div className="dash-action-card" role="button" tabIndex={0} onClick={() => navigate('/voice-exams')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/voice-exams'); } }}>
              <div className="dash-action-header">
                <div className="dash-action-badge dark"><FaStethoscope /></div>
                <div className="dash-action-info">
                  <h3>{t('dashboard.actions.ecos')}</h3>
                  <p>{t('dashboard.actions.ecos.desc')}</p>
                </div>
                <FaChevronRight className="dash-action-arrow" />
              </div>
            </div>
            )}

          </aside>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
