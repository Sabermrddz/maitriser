import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import Recorder from './Recorder';
import '../styles/teal-theme.css';

const VoiceExam = ({ exam, onBack, stationMode, onStationSubmit, submitting: externalSubmitting, duration }) => {
  const { t } = useTranslation();
  if (!exam) return <div className="page-teal"><div className="card-teal" style={{ textAlign: 'center' }}>{t('voiceExam.notFound')}</div></div>;
  const questions = exam.questions || [];
  const STORAGE_KEY = `voice-exam-${exam._id}`;
  const [answers, setAnswers]       = useState(() => (questions).map(() => ({ text: '' })));
  const [result, setResult]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [showModel, setShowModel]   = useState({});
  const [timeLeft, setTimeLeft]     = useState(duration ? duration * 60 : 0);
  const [timerActive, setTimerActive] = useState(!!duration);
  const [timedOut, setTimedOut]     = useState(false);
  const timerRef = useRef(null);
  const handleSubmitRef = useRef(null);
  const restored = useRef(false);
  const isSubmitting = externalSubmitting || submitting;

  useEffect(() => {
    if (stationMode) return;
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        if (saved.examId === exam._id && !saved.result) {
          setAnswers(saved.answers || questions.map(() => ({ text: '' })));
          return;
        }
      }
    } catch { logger.error({ examId: exam?._id }, 'VoiceExam restoreSession failed') }
    setAnswers(questions.map(() => ({ text: '' })));
    setResult(null);
    setError('');
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, [exam._id]);

  useEffect(() => {
    if (stationMode || result || !answers.length) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ examId: exam._id, answers })); } catch { /* ignore */ }
  }, [answers, result]);

  useEffect(() => {
    if (stationMode) return;
    const onLeave = (e) => { if (!result) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [result]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!duration) return;
    const onVis = () => {
      if (document.hidden) { clearTimeout(timerRef.current); }
      else { setTick((t) => t + 1); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [duration]);

  useEffect(() => {
    if (!timerActive || timeLeft <= 0 || result) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timerActive, timeLeft, result, tick]);

  useEffect(() => {
    if (!timerActive || timeLeft > 0 || result) return;
    setTimedOut(true);
    if (stationMode && onStationSubmit) {
      onStationSubmit(answers.map((a, i) => ({ questionIndex: i, text: a.text })), true);
    } else if (handleSubmitRef.current) {
      handleSubmitRef.current(true);
    }
  }, [timerActive, timeLeft, result]);

  const clearSaved = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } };

  const setAnswer = (idx, text) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  };

  const handleSubmit = async (isTimedOut) => {
    const filled = answers.every((a) => a.text.trim());
    if (!filled && !isTimedOut) { setError(t('voiceExam.fillAll')); return; }
    setError('');
    if (stationMode && onStationSubmit) {
      await onStationSubmit(answers.map((a, i) => ({ questionIndex: i, text: a.text })), isTimedOut);
      return;
    }
    setSubmitting(true);
    try {
      const body = { answers: answers.map((a, i) => ({ questionIndex: i, text: a.text })) };
      const res = await fetchWithAuth(`${API_BASE_URL}/api/voice-exams/${exam._id}/submit`, {
        method: 'POST',
        body,
      });
      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      clearSaved();
      setResult(data);
    } catch (err) {
      logger.error({ err, examId: exam?._id }, 'VoiceExam submit failed');
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => { handleSubmitRef.current = handleSubmit; });

  const allPassed = result?.answers?.every((a) => a.allPassed);

  return (
    <div className="quiz-container-teal">
      <div style={{ marginBottom: 16 }}>
        <button type="button" className="btn-ghost" onClick={onBack}>
          &larr; {t('voiceExam.back')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 12, color: '#f97316', fontWeight: 'bold', margin: 0 }}>{t('voiceExam.title')}</p>
        {duration && timerActive && (
          <span style={{
            fontSize: 13, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace", padding: '4px 12px', borderRadius: 6,
            background: timeLeft <= 60 ? 'rgba(239,68,68,0.15)' : 'rgba(193,255,48,0.15)',
            color: timeLeft <= 60 ? '#ef4444' : 'var(--color-success)',
            transition: 'background 0.3s, color 0.3s',
          }}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            {timeLeft <= 60 && timeLeft > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, animation: 'pulse 1s infinite' }}>{t('voiceExam.timerWarning')}</span>
            )}
          </span>
        )}
        {duration && !timerActive && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
            {t('voiceExam.timerDone')}
          </span>
        )}
      </div>
      <h3 style={{ margin: '0 0 16px' }}>{exam.title}</h3>

      <div style={{ background: 'var(--color-bg)', padding: 14, borderRadius: 6, marginBottom: 20 }}>
        <p style={{ margin: '0 0 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{exam.clinicalCasePrompt}</p>
        {exam.images && exam.images.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {exam.images.map((img, i) => (
              <img key={i} src={`${API_BASE_URL}/api/voice-exam-images/${img}`} alt={t('voiceExam.imageAlt', { n: i + 1 })} loading="lazy"
                style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border-light)' }}
              />
            ))}
          </div>
        )}
      </div>

      {!result && questions.map((q, qi) => (
        <div key={qi} className="voice-exam-question" style={{ marginBottom: 16, padding: 14, background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Q{qi + 1}. {q.questionText}</p>
          <Recorder onTranscript={(text) => setAnswer(qi, text)} />
          <textarea
            placeholder={t('voiceExam.placeholder')}
            value={answers[qi]?.text || ''}
            onChange={(e) => setAnswer(qi, e.target.value)}
            rows={4}
            style={{ width: '100%', padding: 10, border: '1px solid var(--border-light)', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginTop: 8, background: 'var(--card-bg)', color: 'var(--text-dark)' }}
          />
        </div>
      ))}

      {!result && timedOut && (
        <p style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, marginBottom: 12, textAlign: 'center' }}>
          {t('voiceExam.timeUp')}
        </p>
      )}

      {!stationMode && !result && (
        <button
          type="button"
          onClick={() => handleSubmit(timedOut)}
          disabled={isSubmitting || timedOut}
          aria-label={t('voiceExam.submit')}
          style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? t('voiceExam.submitting') : t('voiceExam.submit')}
        </button>
      )}

      {stationMode && !result && (
        <button
          type="button"
          onClick={() => handleSubmit(timedOut)}
          disabled={isSubmitting || timedOut}
          aria-label={t('voiceExam.submitStation')}
          style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? t('voiceExam.submitting') : t('voiceExam.submitStation')}
        </button>
      )}

      {error && <p style={{ color: '#e74c3c', marginTop: 12 }}>{error}</p>}

      {result && !stationMode && (
        <div style={{ marginTop: 20 }}>
          <div className="voice-exam-result-box" style={{
            padding: 16, borderRadius: 8, marginBottom: 16, textAlign: 'center', fontSize: 18, fontWeight: 700,
            background: allPassed ? 'rgba(193,255,48,0.15)' : 'rgba(239,68,68,0.15)', color: allPassed ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {allPassed ? <>✅ {t('voiceExam.result.allCorrect')}</> : <>❌ {t('voiceExam.result.allIncorrect')}</>}
            <span style={{ display: 'block', fontSize: 13, fontWeight: 400, marginTop: 4 }}>
              {t('voiceExam.result.correct', { passed: result.overallPassed, total: result.overallMax })}
            </span>
          </div>

          {questions.map((q, qi) => {
            const a = result.answers?.[qi];
            if (!a) return null;
            return (
              <div key={qi} style={{ marginBottom: 16, padding: 14, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--card-bg)' }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px' }}>Q{qi + 1}. {q.questionText}</p>
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', margin: '0 0 10px', padding: 8, background: 'var(--color-bg)', borderRadius: 4 }}>
                  « {a.text} »
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {a.criteriaResults.map((cr, ci) => (
                    <div key={ci} className="voice-exam-criteria" style={{
                      padding: '4px 10px', borderRadius: 4, fontSize: 13,
                      background: cr.passed ? 'rgba(193,255,48,0.15)' : 'rgba(239,68,68,0.15)',
                      color: cr.passed ? 'var(--color-success)' : 'var(--color-danger)',
                      fontWeight: 500,
                    }}>
                      {cr.passed ? '✓' : '✗'} {cr.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowModel((prev) => ({ ...prev, [qi]: !prev[qi] }))}
                  style={{ background: 'none', border: '1px solid var(--teal-dark)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--teal-dark)' }}
                >
                  {showModel[qi] ? t('voiceExam.hideModel') : t('voiceExam.showModel')}
                </button>
                {showModel[qi] && (
                  <div style={{ marginTop: 8, padding: 10, background: 'var(--color-bg)', borderRadius: 6, fontSize: 13, color: 'var(--text-body)' }}>
                    {q.idealAnswer || t('voiceExam.noModel')}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => { setResult(null); setAnswers(questions.map(() => ({ text: '' }))); setError(''); }}
            style={{ padding: '10px 24px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('voiceExam.retry')}
          </button>
        </div>
      )}
    </div>
  );
};

export default VoiceExam;
