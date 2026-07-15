import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const TIMER_SECONDS = 60;

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
  const [quizTimer, setQuizTimer] = useState(TIMER_SECONDS);
  const [timeLeft, setTimeLeft]   = useState(quizTimer);
  const [timerActive, setTimerActive] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [showGate, setShowGate]   = useState(false);
  const [pdfMap, setPdfMap]       = useState({});
  const timerRef = useRef(null);
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
    if (quizData) return;
    if (!id) { navigate('/quizPage'); return; }

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Quiz not found');
        const data = await res.json();
        if (controller.signal.aborted) return;
        const t = data.timer || TIMER_SECONDS;
        setQuizTimer(t);
        setTimeLeft(t);
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

  const hiddenRef = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { hiddenRef.current = true; clearTimeout(timerRef.current); }
      else { hiddenRef.current = false; setTick((t) => t + 1); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (hiddenRef.current || studyMode) return;
    if (timerActive && timeLeft > 0 && !submitted) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timerActive && timeLeft === 0 && !submitted && handleSubmitRef.current) {
      handleSubmitRef.current();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft, submitted, studyMode, tick]);

  useEffect(() => {
    const onLeave = (e) => { if (!submitted) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [submitted]);

  const startTimer = () => { if (!timerActive) setTimerActive(true); };

  const toggleOption = (opt) => {
    if (submitted) return;
    play('select');
    if (studyMode) {
      setSelected([opt]);
      handleStudyCheck(opt);
      return;
    }
    startTimer();
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
    clearTimeout(timerRef.current);
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
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="page-teal"><div className="card-teal"><SkeletonQuizItem count={1} /></div></div>;
  if (!quizData?.question) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center' }}>{t('quizcard.notFound')}</div></div>;
  if (subscription && (subscription.status !== 'active' || (subscription.endDate && new Date(subscription.endDate) < new Date()))) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>&#128274;</div>
          <h3 style={{ color: '#856404', margin: '0 0 8px' }}>{t('quizcard.subscription.title')}</h3>
          <p style={{ color: '#856404', fontSize: '0.9rem', margin: '0 0 16px' }}>
            {t('quizcard.subscription.desc')}
          </p>
          <button className="btn-primary" onClick={() => navigate('/pricing')}>{t('quizcard.subscription.cta')}</button>
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
        <div className="flex-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>{quizName}</h2>
          {!studyMode && (
            <span className={`timer-badge ${timerActive ? 'timer-running' : ''}`} style={{
              color: timeLeft <= 10 ? 'var(--color-danger)' : 'var(--text-dark)',
              opacity: timerActive ? 1 : 0.5,
            }}>
              {timerActive ? '⏱' : '⏸'} {formatTime(timeLeft)}
              {!timerActive && <span style={{ fontSize: '11px', marginLeft: '6px', color: 'var(--text-muted)' }}>Click an answer to start</span>}
            </span>
          )}
        </div>

        {studyMode && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-light)', marginBottom: '10px' }}>🔍 {t('quizcard.studyMode')}</div>}

        {quizData.caseId && typeof quizData.caseId === 'object' && (
          <div className="case-box" style={{
            background: 'var(--color-info-bg)', border: '1px solid var(--border-light)', borderRadius: '10px',
            padding: '14px 16px', marginBottom: '16px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#04484F', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              📋 Cas clinique — {quizData.caseId.title || ''}
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
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

        {submitted && quizData.course && quizData.moduleId?.courses && (
          (() => {
            const match = (quizData.moduleId.courses || []).find(
              (c) => (typeof c === 'string' ? c : c.name || '') === quizData.course
            );
            const pdfId = match && typeof match === 'object' ? match.pdfId || '' : '';
            const pdfFilename = pdfId ? pdfMap[pdfId] : null;
            if (!pdfFilename) return null;
            const handleOpenPdf = async () => {
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
                   style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' }}>
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
