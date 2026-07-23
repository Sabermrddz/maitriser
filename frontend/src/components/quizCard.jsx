import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FaFilePdf } from 'react-icons/fa';
import { useToast } from './Toast.jsx';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import PremiumGateModal from './PremiumGateModal';
import { SkeletonQuizItem } from './LoadingSkeleton';
import { logger } from '../utils/logger';
import '../styles/teal-theme.css';

const QuizCard = () => {
  const { state }    = useLocation();
  const { id }       = useParams();
  const navigate     = useNavigate();
  const notify = useToast();
  const play = useSound();
  const { t } = useTranslation();

  const [quizData, setQuizData]   = useState(
    state ? { quizId: state.quizId, quizName: state.quizName, question: state.question, caseId: state.caseId || null, course: state.course || '', moduleId: state.moduleId || null } : null
  );
  const [loading, setLoading]     = useState(!state);
  const [selected, setSelected]   = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [showGate, setShowGate]   = useState(false);
  const [pdfMap, setPdfMap]       = useState({});
  const [moduleCourses, setModuleCourses] = useState(null);
  const submittingRef = useRef(false);
  const handleSubmitRef = useRef(null);

  let userId = 'anonymous'; try { userId = localStorage.getItem('userId') || 'anonymous'; } catch { /* incognito */ }
  const studyMode = state?.studyMode || false;

  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (!quizData?.question?.options) { setOptions([]); return; }
    const opts = [...quizData.question.options];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setOptions(opts);
  }, [quizData?.question?.options]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
        if (res.ok) { const d = await res.json(); setSubscription(d.subscription); }
      } catch { logger.error({}, 'quizCard fetchSubscription failed') }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/pdf-documents`);
        if (res.ok) {
          const docs = await res.json();
          const map = {};
          docs.forEach((d) => { map[d.pdfId] = d.filename; });
          setPdfMap(map);
        }
      } catch { /* pdf map not available */ }
    })();
  }, []);

  useEffect(() => {
    const mid = quizData?.moduleId;
    if (!mid) return;
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/modules/${mid}`);
        if (res.ok) {
          const mod = await res.json();
          setModuleCourses(mod.courses || []);
        }
      } catch { /* module courses not available */ }
    })();
  }, [quizData?.moduleId]);

  useEffect(() => {
    if (quizData) return;
    if (!id) { navigate('/quizPage'); return; }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Quiz not found');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setQuizData({
          quizId:   data._id,
          quizName: data.question?.questionText || data.quizId,
          question: {
            questionText: data.question?.questionText,
            options:      data.question?.options || [],
          },
          caseId: data.caseId || null,
          course: data.course || '',
          moduleId: data.moduleId || null,
        });
      } catch (err) {
        if (err.name !== 'AbortError') { logger.error({ err, quizId: id }, 'QuizCard fetch failed'); notify(t('quizcard.notFound'), 'error'); play('navigate'); navigate('/quizPage'); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (studyMode || submitted) { setTimerActive(false); return; }
    setTimerActive(true);
    let id = setInterval(() => setElapsed((p) => p + 1), 1000);
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(id);
      } else {
        id = setInterval(() => setElapsed((p) => p + 1), 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [studyMode, submitted]);

  const startQuizSession = useCallback(async () => {
    if (!quizData?.quizId) return;
    try {
      await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${quizData.quizId}/start`, {
        method: 'POST',
        body: { timer: 0 },
      });
    } catch (err) {
      logger.error({ err, quizId: quizData.quizId }, 'startQuizSession failed');
    }
  }, [quizData?.quizId]);

  useEffect(() => {
    if (quizData?.quizId && !studyMode) startQuizSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizData?.quizId, studyMode]);

  const toggleOption = (opt) => {
    if (submitted) return;
    play('select');
    if (studyMode) {
      setSelected([opt]);
      handleStudyCheck(opt);
      return;
    }
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]
    );
  };

  const handleStudyCheck = async (opt) => {
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${quizData.quizId}/submit`, {
        method: 'POST',
        body: { selectedAnswers: [opt] },
      });
      if (!res.ok) throw new Error(t('quizcard.error.verify'));
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      play(data.correct ? 'success' : 'error');
    } catch (err) {
      logger.error({ err, quizId: quizData?.quizId, opt }, 'QuizCard studyCheck failed');
      notify(t('quizcard.error.verify'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitted || submittingRef.current) return;
    if (selected.length === 0) return notify(t('quizcard.warning.select'), 'warning');
    play('submit');
    submittingRef.current = true;
    setSubmitting(true);
    setTimerActive(false);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${quizData.quizId}/submit`, {
        method: 'POST',
        body: { selectedAnswers: selected },
      });
      if (!res.ok) throw new Error(t('quizcard.error.submit'));
      const data = await res.json();
      setResult(data);
      setSubmitted(true);
      play(data.correct ? 'success' : 'error');
    } catch (err) {
      logger.error({ err, quizId: quizData?.quizId }, 'QuizCard submit failed');
      notify(t('quizcard.error.submitRetry'), 'error');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  handleSubmitRef.current = handleSubmit;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={1} /></div></div>;
  if (!quizData?.question) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center' }}>{t('quizcard.notFound')}</div></div>;
  const isSubActive = subscription?.status === 'active' && (!subscription.endDate || new Date(subscription.endDate) > new Date());
  if (!isSubActive) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="gate-banner" style={{ marginBottom: 0, background: 'transparent', border: 'none' }}>
            <div className="gate-icon">&#128274;</div>
            <h3>{t('quizcard.subscription.title')}</h3>
            <p>
              {t('quizcard.subscription.desc')}
            </p>
            <div className="gate-cta">
              <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('quizcard.subscription.cta')}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { quizName, question } = quizData;
  const isMulti = !result
    ? (quizData?.question?.correctAnswers?.length || 0) > 1
    : (result.correctAnswers?.length || 1) > 1;

  return (
    <div className="page-teal">
      <div className="quiz-container-teal">
        <div className="quiz-flex-header">
          <h2>{quizName}</h2>
          {!studyMode && (
            <span className="timer-badge timer-running" style={{
              color: 'var(--text-dark)',
            }}>
              ⏱ {formatTime(elapsed)}
            </span>
          )}
        </div>

        {studyMode && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-light)', marginBottom: '10px' }}>🔍 {t('quizcard.studyMode')}</div>}

        {quizData.caseId && typeof quizData.caseId === 'object' && (
          <div className="case-box">
            <div className="case-box-label">
              📋 Cas clinique — {quizData.caseId.title || ''}
            </div>
            <p>
              {quizData.caseId.description || ''}
            </p>
          </div>
        )}

        <p style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '16px', color: 'var(--text-dark)' }}>
          {question.questionText}
        </p>

        {isMulti && !submitted && !studyMode && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-light)', marginBottom: '10px' }}>
            {t('quizcard.selectAll')}
          </p>
        )}

        {options.map((opt, i) => {
          let optClass = 'option-label';
          if (submitted) {
            if (result?.correctAnswers?.includes(opt)) optClass += ' correct';
            else if (selected.includes(opt)) optClass += ' incorrect';
          } else if (selected.includes(opt)) {
            optClass += ' selected';
          }

          return (
            <label key={i} className={optClass}
              style={{ cursor: submitted ? 'default' : 'pointer' }}>
              <input type="checkbox" checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)} disabled={submitted} />
              {opt}
            </label>
          );
        })}

        {submitted && result && (
          <div className={`result-box ${result.correct ? 'pass' : 'fail'}`}>
            <p className="result-box-title">
              {result.correct ? '✅ Correct !' : '❌ Incorrect'}
            </p>
            <p className="result-box-time">
              ⏱ {t('customExam.timeTaken', { time: formatTime(elapsed) })}
            </p>
            {!result.correct && (
              <p className="result-box-answer">
                <strong>{result.correctAnswers?.length > 1 ? t('quizcard.correctAnswers') : t('quizcard.correctAnswer')} :</strong>{' '}
                {result.correctAnswers?.join(', ')}
              </p>
            )}
            {result.explanation && (
              <div className="explanation-box">
                <strong>💡 {t('quizcard.explanation')} :</strong> {result.explanation}
              </div>
            )}
          </div>
        )}

        {submitted && quizData.course && (
          (() => {
            const match = (moduleCourses || quizData.moduleId?.courses || []).find(
              (c) => (typeof c === 'string' ? c : c.name || '') === quizData.course
            );
            const pdfId = match && typeof match === 'object' ? match.pdfId || '' : '';
            const pdfFilename = pdfId ? pdfMap[pdfId] : null;
            const handleOpenPdf = async () => {
              if (!pdfFilename) { notify(t('quizcard.courseNotAvailable'), 'warning'); return; }
              try {
                const res = await fetchWithAuth(`${API_BASE_URL}/api/course-pdfs/${encodeURIComponent(pdfFilename)}`);
                if (!res.ok) throw new Error('Failed to get PDF');
                const { url } = await res.json();
                window.open(url, '_blank');
              } catch { notify(t('quizcard.error.network'), 'error'); }
            };
            return (
              <div style={{ textAlign: 'center', margin: '16px 0 0' }}>
                <button onClick={handleOpenPdf}
                   className="btn-primary"
                   style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 13 }}>
                  <FaFilePdf /> {t('quizcard.viewCourse')} — {quizData.course}
                </button>
              </div>
            );
          })()
        )}

        <div className="button-row">
          {!submitted ? (
            !studyMode && (
              <button className="btn-primary" onClick={handleSubmit}
                disabled={submitting || selected.length === 0}>
                {submitting ? t('quizcard.submitting') : t('quizcard.submit')}
              </button>
            )
          ) : (
            <button className="btn-dark" onClick={() => navigate('/quizPage')}>
              {t('quizcard.back')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuizCard);
