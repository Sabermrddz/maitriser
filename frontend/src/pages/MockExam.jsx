import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast.jsx';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import { useSound } from '../context/SoundContext';
import '../styles/teal-theme.css';

const MockExam = () => {
  const { attemptId: urlAttemptId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();
  const play = useSound();
  let userId;
  try { userId = localStorage.getItem('userId') || 'anonymous'; } catch { userId = 'anonymous'; }

  const questions = useMemo(() => {
    if (!state?.questions?.length) return [];
    return state.questions;
  }, [state]);

  const attemptId = state?.attemptId || urlAttemptId;
  const mockExamId = state?.mockExamId;

  const totalSeconds = (state?.duration || 30) * 60;
  const STORAGE_KEY = 'mock-exam-state';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mock-exam-flagged');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    try {
      const savedRaw = sessionStorage.getItem(STORAGE_KEY);
      if (savedRaw && state?.restore !== false) {
        const saved = JSON.parse(savedRaw);
        if (saved.questions?.length && saved.questions[0]._id === state?.questions?.[0]?._id) {
          setCurrentIndex(saved.currentIndex || 0);
          setAnswers(saved.answers || {});
          setTimeLeft(saved.timeLeft ?? totalSeconds);
        }
      }
    } catch { logger.error({}, 'MockExam restoreSession failed') }
  }, []);

  useEffect(() => {
    if (submitted || !questions.length) return;
    const toSave = { questions, answers, currentIndex, timeLeft };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch { /* ignore */ }
  }, [answers, currentIndex, timeLeft, submitted, questions]);

  useEffect(() => {
    try { sessionStorage.setItem('mock-exam-flagged', JSON.stringify(flagged)); } catch { /* ignore */ }
  }, [flagged]);

  const toggleFlag = useCallback((qId) => {
    play('click');
    setFlagged((prev) => prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]);
  }, []);

  const clearSaved = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem('mock-exam-flagged'); } catch { /* ignore */ }
  };

  useEffect(() => {
    const onLeave = (e) => { if (!submitted) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('beforeunload', onLeave); mountedRef.current = false; };
  }, [submitted]);

  const toggleOption = useCallback((qId, opt) => {
    if (submitted) return;
    play('select');
    setAnswers((prev) => {
      const current = prev[qId] || [];
      return {
        ...prev,
        [qId]: current.includes(opt)
          ? current.filter((a) => a !== opt)
          : [...current, opt],
      };
    });
  }, [submitted]);

  const handleSubmit = useCallback(async () => {
    if (submitted || submittingRef.current || !attemptId || !mockExamId) return;
    submittingRef.current = true;
    play('submit');
    setSubmitting(true);
    clearTimeout(timerRef.current);
    try {
      const body = {
        attemptId,
        answers: questions.map((q) => ({
          quizId: q._id,
          selectedAnswers: answers[q._id] || [],
        })),
      };
      const res = await fetchWithAuth(`${API_BASE_URL}/api/mock-exams/${mockExamId}/submit`, { method: 'POST', body });
      if (!res.ok) throw new Error('Submission failed');
      const data = await res.json();
      if (mountedRef.current) {
        clearSaved();
        const qMap = {};
        questions.forEach((q) => { qMap[q._id] = q; });
        const merged = (data.results || []).map((r) => ({
          ...r,
          quiz: qMap[r.quizId] || { _id: r.quizId, question: { questionText: '' } },
        }));
        setResults({ totalScore: data.totalScore, totalPossible: data.totalPossible, percentage: data.percentage, items: merged });
        setSubmitted(true);
      }
    } catch (err) {
      logger.error({ err }, 'MockExam handleSubmit failed');
      if (mountedRef.current) notify(t('mockExam.submitError'), 'error');
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [submitted, questions, answers, attemptId, mockExamId, notify, play, clearSaved]);

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

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  useEffect(() => {
    if (hiddenRef.current) return;
    if (!submitted && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && !submitted && mountedRef.current) {
      handleSubmitRef.current().catch((err) => logger.error({ err }, 'MockExam auto-submit failed'));
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted, tick]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!questions.length) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center' }}>
          <p>{t('mock.noQuestions')}</p>
          <button className="btn-dark" onClick={() => { play('prev'); navigate('/mock-exams'); }}>{t('mock.back')}</button>
        </div>
      </div>
    );
  }

  if (submitted && results) {
    const { totalScore, totalPossible, percentage, items } = results;
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="mock-result-title" style={{ margin: '0 0 8px' }}>📊 {t('mock.result')}</h2>
            <div className={`mock-result-score ${percentage >= 60 ? 'passing' : 'failing'}`}>{percentage}%</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-base)' }}>{totalScore} / {totalPossible} {t('mock.correct').toLowerCase()}</p>
          </div>

          <div className="exam-results-list">
            {items.map((r, i) => (
              <div key={r.quiz?._id || i} className={`exam-result-item ${r.correct ? 'correct' : 'incorrect'}`}>
                <div className="exam-result-qnum">{t('mock.question')} {i + 1}</div>
                <div className="exam-result-text">{r.quiz?.question?.questionText || ''}</div>
                <div className="exam-result-status">
                  {r.correct ? `✅ ${t('mock.correct')}` : `❌ ${t('mock.incorrect')}`}
                </div>
                {!r.correct && (
                  <div className="exam-result-answer">
                    <strong>{(r.correctAnswers?.length > 1 ? t('mock.correctAnswers') : t('mock.correctAnswer'))} :</strong>{' '}
                    {r.correctAnswers?.join(', ')}
                  </div>
                )}
                {r.explanation && (
                  <div className="exam-result-explanation">
                    <strong>💡 {t('mock.explanation')} :</strong> {r.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="btn-dark" onClick={() => { play('prev'); navigate('/mock-exams'); }}>{t('mock.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  if (reviewing) {
    const unanswered = questions.filter((q) => !answers[q._id] || answers[q._id].length === 0);
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: '800px' }}>
          <h2 style={{ marginBottom: '8px' }}>{t('mock.reviewAnswers')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            {unanswered.length > 0 ? t('mock.answeredCountSkipped', { answered: answeredCount, total: totalQuestions, skipped: unanswered.length }) : t('mock.answeredCount', { answered: answeredCount, total: totalQuestions })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {questions.map((q, i) => {
              const isAnswered = answers[q._id] && answers[q._id].length > 0;
              const isFlagged = flagged.includes(q._id);
              let bg = 'var(--color-bg)';
              let label = `${i + 1}`;
              if (isAnswered) { bg = 'var(--color-success-bg)'; label = `✓ ${i + 1}`; }
              if (isFlagged) { bg = 'var(--color-warning-bg)'; label = `⚑ ${i + 1}`; }
              if (isAnswered && isFlagged) { bg = 'var(--color-info-bg)'; label = `✓⚑ ${i + 1}`; }
              return (
                <button key={q._id} onClick={() => { setCurrentIndex(i); setReviewing(false); }}
                  style={{
                    width: '48px', height: '48px', borderRadius: '8px', border: '1px solid var(--border-light)',
                    background: bg, cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                    color: isFlagged ? 'var(--color-warning)' : isAnswered ? 'var(--color-success)' : 'var(--text-dark)',
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mock-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
            <button className="btn-dark" onClick={() => setReviewing(false)}>← {t('mock.backToQuestion')}</button>
            <button className="btn-primary exam-submit-btn" onClick={handleSubmit} disabled={submitting}
              style={{ background: unanswered.length > 0 ? '#e67e22' : undefined }}>
              {submitting ? t('mock.submitting') : unanswered.length > 0 ? t('mock.submitSkipped', { n: unanswered.length }) : t('mock.submit')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="page-teal">
      <div className="quiz-container-teal" style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div className="mock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('mock.question')} {currentIndex + 1} / {totalQuestions}
            </span>
            <div className="mock-header-right" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {answeredCount} / {totalQuestions} {t('mock.answered')}
              </span>
              <span className="timer-badge timer-running" style={{ color: timeLeft <= 60 ? 'var(--color-danger)' : 'var(--text-dark)', fontSize: '16px' }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          <div className="exam-progress-bar">
            <div className="exam-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            {questions.map((q, i) => {
              const isAnswered = answers[q._id] && answers[q._id].length > 0;
              const isFlagged = flagged.includes(q._id);
              let dotColor = 'var(--border-light)';
              if (isFlagged) dotColor = 'var(--color-warning)';
              else if (isAnswered) dotColor = 'var(--color-success)';
              return (
                <button key={q._id} onClick={() => setCurrentIndex(i)}
                  style={{
                    width: i === currentIndex ? '20px' : '16px', height: '6px', borderRadius: '3px',
                    border: 'none', background: i === currentIndex ? '#04484F' : dotColor,
                    cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                    opacity: i === currentIndex ? 1 : 0.6,
                  }}
                  title={`Q${i + 1}${isFlagged ? ' (flagged)' : ''}${isAnswered ? ' (answered)' : ''}`} />
              );
            })}
          </div>
        </div>

        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--text-dark)' }}>
          {current.question?.questionText}
        </h3>
        {current.question?.questionImage && (
          <img src={`${API_BASE_URL}/api/quiz-images/${current.question.questionImage}`} alt="Question" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, marginTop: 8, marginBottom: 12 }} />
        )}
        {current.question?.options?.length > 2 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {t('mock.selectAll')}
          </p>
        )}

        <div style={{ marginTop: '16px' }}>
          {(current._shuffledOptions || current.question?.options || []).map((opt, i) => {
            const selected = (answers[current._id] || []).includes(opt);
            return (
              <label key={i} className="option-label"
                onClick={() => toggleOption(current._id, opt)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleOption(current._id, opt); } }}
                tabIndex={0}
                style={{
                  background: selected ? 'var(--color-info-bg)' : 'var(--color-bg)',
                  borderColor: selected ? '#04484F' : 'var(--border-light)',
                  cursor: 'pointer',
                }}>
                <input type="checkbox" checked={selected} readOnly />
                {opt}
              </label>
            );
          })}
        </div>

        <div className="mock-nav" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentIndex > 0 && (
              <button className="btn-dark" onClick={() => { play('prev'); setCurrentIndex((i) => i - 1); }}>
                {t('mock.prev')}
              </button>
            )}
            <button className="btn-flag" onClick={() => toggleFlag(current._id)}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: flagged.includes(current._id) ? '2px solid #ffc107' : '1px solid var(--border-light)',
                background: flagged.includes(current._id) ? 'var(--color-warning-bg)' : 'var(--color-bg)',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: flagged.includes(current._id) ? '#856404' : 'var(--text-muted)',
              }}>
              ⚑ {flagged.includes(current._id) ? t('mock.flagged') : t('mock.flag')}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-review" onClick={() => setReviewing(true)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #04484F', background: 'var(--card-bg)', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#04484F' }}>
              {t('mock.reviewAll')}
            </button>
            {currentIndex < totalQuestions - 1 ? (
              <button className="btn-primary" onClick={() => { play('next'); setCurrentIndex((i) => i + 1); }}>
                {t('mock.next')}
              </button>
            ) : (
              <button className="btn-primary exam-submit-btn" onClick={() => setReviewing(true)}>
                {t('mock.reviewSubmit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockExam;
