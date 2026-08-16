import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { logger } from '../utils/logger';
import { useToast } from '../components/Toast';

const QuizSession = ({ quizzes, mode, config, moduleData, layout = 'oneByOne', onBack }) => {
  const { t } = useTranslation();
  const notify = useToast();
  const isSingle = mode === 'start';

  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [reviewMode, setReviewMode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submittedQids, setSubmittedQids] = useState(new Set());
  const [pdfMap, setPdfMap] = useState({});
  const [pdfPanelUrl, setPdfPanelUrl] = useState(null);
  const [pdfPanelCourse, setPdfPanelCourse] = useState(null);
  const [startError, setStartError] = useState(null);
  const submittedRef = useRef(false);
  const scrollRef = useRef(null);

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
    let cancelled = false;
    const startAll = async () => {
      const responses = await Promise.all((quizzes || []).map((q) =>
        fetchWithAuth(`${API_BASE_URL}/api/quizzes/${q._id}/start`, {
          method: 'POST',
          body: { timer: 0 },
        })
      ));
      if (cancelled) return;
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        logger.error({ status: failed.status }, 'startQuizSession failed');
        setStartError(t('quiz.startError'));
      }
      setStarting(false);
    };
    startAll();
    return () => { cancelled = true; };
  }, []);

  const handleSubmitAll = useCallback(async () => {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    const newResults = {};
    await Promise.all((quizzes || []).map(async (q) => {
      const sel = answers[q._id] || [];
      if (sel.length === 0) return;
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${q._id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedAnswers: sel }),
        });
        if (res.ok) newResults[q._id] = await res.json();
      } catch (err) {
        logger.error({ err, quizId: q._id }, 'QuizSession submit failed');
      }
    }));
    setResults(newResults);
    setSubmitting(false);
    setReviewMode(true);
  }, [answers, quizzes, submitting]);

  const handleSubmitOne = async () => {
    const q = quizzes[currentQuestion];
    if (!q) return;
    const sel = answers[q._id] || [];
    if (sel.length === 0) { notify(t('quiz.selectAnswer'), 'warning'); return; }
    await doSubmitOne(q, sel);
  };

  const doSubmitOne = async (q, sel) => {
    if (submittedQids.has(q._id)) return;
    setSubmitting(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/quizzes/${q._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedAnswers: sel }),
      });
      if (res.ok) {
        const result = await res.json();
        setResults((prev) => ({ ...prev, [q._id]: result }));
        setSubmittedQids((prev) => new Set(prev).add(q._id));
      }
    } catch (err) {
      logger.error({ err, quizId: q._id }, 'QuizSession submitOne failed');
    }
    setSubmitting(false);
  };

  const handleFinish = async () => {
    const q = quizzes[currentQuestion];
    if (q && !submittedQids.has(q._id)) {
      const sel = answers[q._id] || [];
      if (sel.length > 0) await doSubmitOne(q, sel);
    }
    setReviewMode(true);
  };

  // Count-up stopwatch: starts at 0 when the session begins, runs until review.
  useEffect(() => {
    if (starting || reviewMode) return;
    const id = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [starting, reviewMode]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentQuestion]);

  const toggleOption = (quizId, opt) => {
    if (reviewMode || submittedQids.has(quizId)) return;
    setAnswers((prev) => {
      const cur = prev[quizId] || [];
      const next = cur.includes(opt) ? cur.filter((a) => a !== opt) : [...cur, opt];
      return { ...prev, [quizId]: next };
    });
  };

  const handleOpenPdf = async (quiz) => {
    const courseName = quiz?.course;
    if (!courseName) { notify(t('quizcard.courseNotAvailable'), 'warning'); return; }
    const courses = moduleData?.courses || [];
    const match = courses.find((c) => (typeof c === 'string' ? c : c.name || '') === courseName);
    const pdfId = match && typeof match === 'object' ? match.pdfId || '' : '';
    const pdfFilename = pdfId ? pdfMap[pdfId] : null;
    if (!pdfFilename) { notify(t('quizcard.courseNotAvailable'), 'warning'); return; }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/course-pdfs/${encodeURIComponent(pdfFilename)}`);
      if (!res.ok) throw new Error('Failed to get PDF');
      const { url } = await res.json();
      setPdfPanelUrl(url);
      setPdfPanelCourse(courseName);
    } catch { notify(t('quizcard.error.network'), 'error'); }
  };

  const closePdfPanel = () => {
    setPdfPanelUrl(null);
    setPdfPanelCourse(null);
  };

  if (starting) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
          <p>{t('quiz.loading')}</p>
        </div>
      </div>
    );
  }

  if (startError) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div className="gate-banner error" style={{ background: 'transparent', border: 'none', marginBottom: 16 }}>
            <div className="gate-icon">&#9888;</div>
            <p>{startError}</p>
          </div>
          <button className="btn-primary" onClick={onBack}>{t('customExam.backToCourses')}</button>
        </div>
      </div>
    );
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  if (reviewMode) {
    const answered = Object.keys(results).length;
    const correctCount = Object.values(results).filter((r) => r && r.correct).length;
    const score = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const total = quizzes.length;
    const passingScore = config?.passingScore || 60;
    const passed = score >= passingScore;
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
          {/* Score badge */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 96, height: 96, borderRadius: '50%',
              background: passed ? 'var(--color-success-bg, #e6f7ef)' : 'var(--color-danger-bg, #fde8e8)',
              border: `3px solid ${passed ? 'var(--color-success)' : 'var(--color-danger)'}`,
              marginBottom: 12,
            }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: passed ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {score}%
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {passed ? (
                <span style={{ color: 'var(--color-success)' }}>{t('customExam.pass')}</span>
              ) : (
                <span style={{ color: 'var(--color-danger)' }}>{t('customExam.fail')}</span>
              )}
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>
              {correctCount}/{answered} {t('customExam.correct').toLowerCase()} · {t('customExam.timeTaken', { time: `${mm}:${ss}` })}
            </div>
          </div>

          {/* Question list */}
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
            {quizzes.filter((q) => results[q._id]).map((q, i) => {
              const r = results[q._id];
              return (
                <div key={q._id} style={{
                  padding: '14px 16px', marginBottom: 10, borderRadius: 10,
                  border: `1px solid ${r && r.correct ? 'var(--color-success)' : 'var(--color-danger)'}`,
                  background: 'var(--card-bg)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, flex: 1, lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>{i + 1}.</span>
                      {q.question?.questionText?.substring(0, 150)}
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, flexShrink: 0,
                      background: r && r.correct ? 'var(--color-success-bg, #e6f7ef)' : 'var(--color-danger-bg, #fde8e8)',
                      color: r && r.correct ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {r && r.correct ? t('customExam.correct') : t('customExam.incorrect')}
                    </span>
                  </div>
                  {r && !r.correct && r.correctAnswers && (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                      {t('caseExam.correctAnswer')}: <strong style={{ color: 'var(--text-dark)' }}>{r.correctAnswers.join(', ')}</strong>
                    </div>
                  )}
                  {r && r.explanation && (
                    <div className="explanation-box" style={{ marginTop: 8 }}>{r.explanation}</div>
                  )}
                  {r && r.optionExplanations && r.optionExplanations.length > 0 && (
                    <div className="explanation-box" style={{ marginTop: 8 }}>
                      <strong style={{ display: 'block', marginBottom: 6 }}>{t('admin.quiz.optionExplanations', 'Pourquoi chaque option est vraie/fausse')}</strong>
                      {r.optionExplanations.map((expl) => (
                        <div key={expl.letter} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: '3px solid var(--teal-dark, #007355)' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{expl.letter}.</div>
                          {expl.whyTrue && <div style={{ fontSize: 12, color: '#16a34a' }}>✓ {expl.whyTrue}</div>}
                          {expl.whyFalse && <div style={{ fontSize: 12, color: '#dc2626' }}>✗ {expl.whyFalse}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {r && r.keyConcepts && r.keyConcepts.length > 0 && (
                    <div className="explanation-box" style={{ marginTop: 8 }}>
                      <strong style={{ display: 'block', marginBottom: 4 }}>{t('admin.quiz.keyConcepts', 'Concepts clés')}</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {r.keyConcepts.map((c, i) => (
                          <span key={i} style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(0,115,85,0.08)', color: 'var(--teal-dark, #007355)' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {r && r.commonTraps && r.commonTraps.length > 0 && (
                    <div className="explanation-box" style={{ marginTop: 8 }}>
                      <strong style={{ display: 'block', marginBottom: 4 }}>{t('admin.quiz.commonTraps', 'Pièges fréquents')}</strong>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {r.commonTraps.map((trap, i) => (
                          <li key={i} style={{ fontSize: 12, marginBottom: 2, color: '#dc2626' }}>{trap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn-primary" onClick={onBack}>
              {t('customExam.backToCourses')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSubmitted = () => {
    const q = quizzes[currentQuestion];
    return q ? submittedQids.has(q._id) : false;
  };

  const getResult = () => {
    const q = quizzes[currentQuestion];
    return q ? results[q._id] : null;
  };

  const totalQ = quizzes.length;
  const showAllPage = mode === 'custom' && layout === 'allInPage';
  const q = quizzes[currentQuestion];
  const sel = q ? answers[q._id] || [] : [];
  const isLast = currentQuestion === totalQ - 1;
  const submitted = isSubmitted();
  const result = getResult();

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: showAllPage ? 1000 : 720, margin: '0 auto' }} ref={scrollRef}>
        {/* Header */}
        <div className="quiz-sticky-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          paddingBottom: 12, borderBottom: '1px solid var(--border-light)', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-ghost" onClick={onBack}>← {t('moduleCard.back')}</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              {t('customExam.questionProgress', { n: currentQuestion + 1, total: totalQ })}
            </span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', fontVariantNumeric: 'tabular-nums' }}>
            {mm}:{ss}
          </span>
        </div>

        {showAllPage ? (
          <div className="quiz-allpage">
            <div className="quiz-allpage-grid">
            {quizzes.map((quiz, qi) => {
              const ans = answers[quiz._id] || [];
              const hasAnswer = ans.length > 0;
              return (
                <div key={quiz._id} className="quiz-allpage-item" style={{ borderColor: hasAnswer ? 'var(--teal-accent, #38b2ac)' : undefined }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 12, fontWeight: 700, color: 'var(--teal-dark)',
                    background: hasAnswer ? 'var(--color-success-bg, #e6f7ef)' : 'var(--bg-muted, #f7fafc)',
                    padding: '3px 10px', borderRadius: 6, marginBottom: 10,
                  }}>
                    <span style={{ fontWeight: 800 }}>{qi + 1}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/ {totalQ}</span>
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 12, fontWeight: 600, color: 'var(--text-dark)' }}>
                    {quiz.question?.questionText}
                  </p>
                  {quiz.question?.questionImage && (
                    <img src={`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`} alt="Question"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 12, display: 'block' }} />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {quiz.question?.options?.map((opt, oi) => {
                      const checked = ans.includes(opt);
                      return (
                        <label key={oi} className={`option-label${checked ? ' selected' : ''}`}
                          style={{ cursor: 'pointer', padding: '10px 14px' }}>
                          <input type="checkbox" checked={checked}
                            onChange={() => toggleOption(quiz._id, opt)} />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        ) : (
        <div className="quiz-single-wrap">
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {quizzes.map((qItem, i) => {
            const ans = answers[qItem._id];
            const isAnswered = ans && ans.length > 0;
            const isSub = submittedQids.has(qItem._id);
            const r = results[qItem._id];
            return (
              <button key={qItem._id} onClick={() => setCurrentQuestion(i)}
                style={{
                  width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  fontSize: 10, fontWeight: 700, padding: 0,
                  background: i === currentQuestion
                    ? 'var(--teal-dark)'
                    : isSub && r
                      ? (r.correct ? 'var(--color-success)' : 'var(--color-danger)')
                      : isAnswered ? 'var(--teal-accent)' : 'var(--border-light)',
                  color: i === currentQuestion || isAnswered || isSub ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                }}
                title={`${i + 1}`}>
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Question card */}
        {q && (
          <div key={q._id} style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 14, fontWeight: 600, color: 'var(--text-dark)' }}>
              <span style={{ color: 'var(--teal-dark)', marginRight: 6 }}>{currentQuestion + 1}.</span>
              {q.question?.questionText}
            </p>
            {q.question?.questionImage && (
              <img src={`${API_BASE_URL}/api/quiz-images/${q.question.questionImage}`} alt="Question"
                style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, marginBottom: 14, display: 'block' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.question?.options?.map((opt, oi) => {
                const checked = sel.includes(opt);
                let className = 'option-label';
                if (submitted && result) {
                  const isCorrectAnswer = result.correctAnswers?.includes(opt);
                  const isSelected = checked;
                  if (isCorrectAnswer && isSelected) className += ' correct';
                  else if (!isCorrectAnswer && isSelected) className += ' incorrect';
                  else if (isCorrectAnswer) className += ' correct';
                } else if (checked) {
                  className += ' selected';
                }
                return (
                  <label key={oi} className={className} style={{ cursor: submitted ? 'default' : 'pointer', padding: '12px 16px' }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleOption(q._id, opt)}
                      disabled={submitted} />
                    {opt}
                  </label>
                );
              })}
            </div>

            {/* Result feedback */}
            {submitted && result && (
              <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: result.correct ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', border: `1px solid ${result.correct ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: result.correct ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {result.correct ? t('customExam.correct') : t('customExam.incorrect')}
                </div>
                {!result.correct && result.correctAnswers && (
                  <div style={{ fontSize: 13, color: 'var(--text-dark)', marginBottom: 8 }}>
                    {t('caseExam.correctAnswer')}: <strong>{result.correctAnswers.join(', ')}</strong>
                  </div>
                )}
                {result.explanation && (
                  <div className="explanation-box" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                    {result.explanation}
                  </div>
                )}
                {result.optionExplanations && result.optionExplanations.length > 0 && (
                  <div className="explanation-box" style={{ marginTop: 8 }}>
                    <strong style={{ display: 'block', marginBottom: 6 }}>{t('admin.quiz.optionExplanations', 'Pourquoi chaque option est vraie/fausse')}</strong>
                    {result.optionExplanations.map((expl) => (
                      <div key={expl.letter} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: '3px solid var(--teal-dark, #007355)' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{expl.letter}.</div>
                        {expl.whyTrue && <div style={{ fontSize: 12, color: '#16a34a' }}>✓ {expl.whyTrue}</div>}
                        {expl.whyFalse && <div style={{ fontSize: 12, color: '#dc2626' }}>✗ {expl.whyFalse}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {result.keyConcepts && result.keyConcepts.length > 0 && (
                  <div className="explanation-box" style={{ marginTop: 8 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>{t('admin.quiz.keyConcepts', 'Concepts clés')}</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {result.keyConcepts.map((c, i) => (
                        <span key={i} style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: 'rgba(0,115,85,0.08)', color: 'var(--teal-dark, #007355)' }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {result.commonTraps && result.commonTraps.length > 0 && (
                  <div className="explanation-box" style={{ marginTop: 8 }}>
                    <strong style={{ display: 'block', marginBottom: 4 }}>{t('admin.quiz.commonTraps', 'Pièges fréquents')}</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {result.commonTraps.map((trap, i) => (
                        <li key={i} style={{ fontSize: 12, marginBottom: 2, color: '#dc2626' }}>{trap}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* View Course button */}
                {q.course && (
                  <button onClick={() => handleOpenPdf(q)}
                    className="btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '8px 16px', fontSize: 13 }}>
                    {t('quizcard.viewCourse')} — {q.course}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <div>
            {currentQuestion > 0 && (
              <button className="btn-ghost" onClick={() => setCurrentQuestion((i) => i - 1)}>
                ← {t('caseExam.prev')}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {isSingle ? (
              submitted ? (
                isLast ? (
                  <button className="btn-primary" onClick={() => setReviewMode(true)}>
                    {t('customExam.review')}
                  </button>
                ) : (
                  <>
                    <button className="btn-primary" onClick={() => setCurrentQuestion((i) => i + 1)}>
                      {t('caseExam.next')} →
                    </button>
                    <button className="btn-ghost" onClick={handleFinish} style={{ fontSize: 13 }}>
                      {t('customExam.finish')}
                    </button>
                  </>
                )
              ) : (
                <>
                  <button className="btn-primary" onClick={handleSubmitOne} disabled={submitting || sel.length === 0}>
                    {submitting ? t('caseExam.submitting') : t('customExam.submit')}
                  </button>
                  <button className="btn-ghost" onClick={handleFinish} style={{ fontSize: 13 }}>
                    {t('customExam.finish')}
                  </button>
                </>
              )
            ) : (
              !isLast ? (
                <button className="btn-primary" onClick={() => setCurrentQuestion((i) => i + 1)}>
                  {t('caseExam.next')} →
                </button>
              ) : (
                <button className="btn-primary" onClick={handleSubmitAll} disabled={submitting}>
                  {submitting ? t('caseExam.submitting') : t('customExam.review')}
                </button>
              )
            )}
          </div>
        </div>
        </div>
        )}

        {showAllPage && (
          <div className="quiz-allpage-footer">
            <div className="quiz-allpage-footer-inner">
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', fontVariantNumeric: 'tabular-nums' }}>
                {mm}:{ss}
              </span>
              <button className="btn-primary" onClick={handleSubmitAll} disabled={submitting}>
                {submitting ? t('caseExam.submitting') : t('customExam.review')}
              </button>
            </div>
          </div>
        )}

        {pdfPanelUrl && (
          <div className="pdf-side-panel">
            <div className="pdf-console-bar">
              <span className="pdf-console-dot" />
              <span className="pdf-console-title">{pdfPanelCourse}</span>
              <div className="pdf-console-actions">
                <a href={pdfPanelUrl} target="_blank" rel="noopener noreferrer" className="pdf-console-link">
                  {t('courseView.openTab')}
                </a>
                <button className="pdf-console-close" onClick={closePdfPanel} aria-label={t('courseView.close')}>
                  ×
                </button>
              </div>
            </div>
            <div className="pdf-console-body">
              <iframe src={pdfPanelUrl} title={pdfPanelCourse} className="pdf-console-frame" sandbox="allow-same-origin allow-popups" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizSession;