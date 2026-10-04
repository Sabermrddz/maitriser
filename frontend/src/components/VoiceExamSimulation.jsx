import React, { useState, useMemo } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import VoiceExam from './VoiceExam.jsx';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from './Toast';
import { logger } from '../utils/logger';

const VoiceExamSimulation = ({ exams, onBack }) => {
  const { t } = useTranslation();
  const notify = useToast();
  const maxExams = exams.length;

  const [phase, setPhase] = useState('setup');
  const [stationCount, setStationCount] = useState(Math.min(3, maxExams));
  const [minutesPerStation, setMinutesPerStation] = useState(10);
  const [currentStation, setCurrentStation] = useState(0);
  const [stationResults, setStationResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showModel, setShowModel] = useState({});

  const critOf = (res) => {
    if (!res) return { p: 0, t: 0 };
    const ans = res.answers || [];
    const p = res.criteriaPassed ?? ans.reduce((s, a) => s + (a.passedCount ?? (a.criteriaResults || []).filter((c) => c.passed).length), 0);
    const t = res.criteriaTotal ?? ans.reduce((s, a) => s + (a.criteriaTotal ?? (a.criteriaResults || []).length), 0);
    return { p, t };
  };

  const stationExams = useMemo(() => {
    if (phase === 'setup') return [];
    const shuffled = [...exams].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, stationCount);
  }, [phase, stationCount, exams]);

  const startSimulation = () => {
    if (stationCount < 1 || stationCount > maxExams) return;
    setCurrentStation(0);
    setStationResults([]);
    setPhase('running');
  };

  const handleStationSubmit = async (answers, isTimedOut) => {
    setSubmitting(true);
    try {
      const exam = stationExams[currentStation];
      const body = { answers: answers.map((a) => ({ questionIndex: a.questionIndex, text: a.text })) };
      const res = await fetchWithAuth(`${API_BASE_URL}/api/voice-exams/${exam._id}/submit`, {
        method: 'POST',
        body,
      });
      if (!res.ok) throw new Error(t('submission.failed'));
      const data = await res.json();
      const newResults = [...stationResults, {
        exam,
        result: data,
        timedOut: !!isTimedOut,
        answers,
      }];
      setStationResults(newResults);

      if (currentStation + 1 >= stationExams.length) {
        setPhase('summary');
      } else {
        setCurrentStation((prev) => prev + 1);
      }
    } catch (err) {
      logger.error({ err }, 'Station submit failed');
      notify(t('voiceExam.stationError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSetup = () => {
    setPhase('setup');
    setCurrentStation(0);
    setStationResults([]);
  };

  if (phase === 'setup') {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ marginBottom: 16 }}>
            <button type="button" className="btn-ghost" onClick={onBack}>
              &larr; {t('voiceExam.back')}
            </button>
          </div>
          <h3 style={{ marginBottom: 20 }}>{t('simulation.setupTitle')}</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t('simulation.stationCount')}
            </label>
            <input
              type="number"
              min={1}
              max={maxExams}
              value={stationCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setStationCount(Math.max(1, Math.min(v, maxExams)));
              }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
              {t('simulation.maxStations', { max: maxExams })}
            </span>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t('simulation.minutesPerStation')}
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={minutesPerStation}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setMinutesPerStation(Math.max(1, Math.min(v, 120)));
              }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border-light)', fontSize: 14, boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)' }}
            />
          </div>

          <button
            type="button"
            onClick={startSimulation}
            disabled={stationCount < 1 || stationCount > maxExams}
            style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', width: '100%', opacity: stationCount < 1 || stationCount > maxExams ? 0.5 : 1 }}
          >
            {t('simulation.start')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'summary') {
    const overallPassed = stationResults.reduce((sum, sr) => sum + critOf(sr.result).p, 0);
    const overallTotal = stationResults.reduce((sum, sr) => sum + critOf(sr.result).t, 0);
    const hasCriteria = overallTotal > 0;
    const fallbackPassed = stationResults.reduce((sum, sr) => sum + (sr.result.overallPassed || 0), 0);
    const fallbackTotal = stationResults.reduce((sum, sr) => sum + (sr.result.overallMax || 0), 0);
    const allCorrect = stationResults.every((sr) => sr.result.answers?.every((a) => a.allPassed));

    return (
      <div className="page-teal">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="voice-exam-result-box" style={{
            padding: 20, borderRadius: 8, marginBottom: 20, textAlign: 'center', fontSize: 20, fontWeight: 700,
            background: allCorrect ? 'rgba(193,255,48,0.15)' : 'rgba(239,68,68,0.15)',
            color: allCorrect ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {allCorrect ? t('simulation.allPassed') : t('simulation.partialPassed')}
            <span style={{ display: 'block', fontSize: 14, fontWeight: 400, marginTop: 4 }}>
              {hasCriteria
                ? t('simulation.overallCriteriaScore', { passed: overallPassed, total: overallTotal })
                : t('simulation.overallScore', { passed: fallbackPassed, total: fallbackTotal })}
            </span>
          </div>

          {stationResults.map((sr, si) => (
            <div key={si} style={{ marginBottom: 16, padding: 14, borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--card-bg)' }}>
              <p style={{ fontSize: 11, color: '#f97316', fontWeight: 'bold', margin: '0 0 4px' }}>
                {t('simulation.stationLabel', { n: si + 1, total: stationResults.length })}
              </p>
              <p style={{ fontWeight: 600, margin: '0 0 6px' }}>{sr.exam.title}</p>
              {sr.timedOut && (
                <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{t('voiceExam.timeUp')}</span>
              )}
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {(() => {
                  const c = critOf(sr.result);
                  return c.t > 0
                    ? t('voiceExam.result.criteriaScore', { passed: c.p, total: c.t })
                    : t('voiceExam.result.correct', { passed: sr.result.overallPassed, total: sr.result.overallMax });
                })()}
              </div>
              {(sr.result.answers || []).map((a, qi) => {
                const q = sr.exam?.questions?.[a.questionIndex] || {};
                const pc = a.passedCount ?? (a.criteriaResults || []).filter((c) => c.passed).length;
                const tc = a.criteriaTotal ?? (a.criteriaResults || []).length;
                const key = `${si}-${qi}`;
                return (
                  <div key={key} style={{ marginTop: 10, padding: 10, borderRadius: 6, background: 'var(--color-bg)' }}>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: 13 }}>
                      Q{(a.questionIndex ?? qi) + 1}. {q.questionText || ''}
                      <span style={{ fontWeight: 700, marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>{pc}/{tc}</span>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: q.idealAnswer ? 8 : 0 }}>
                      {(a.criteriaResults || []).map((cr, ci) => (
                        <div key={ci} style={{
                          padding: '4px 10px', borderRadius: 4, fontSize: 13,
                          background: cr.passed ? 'rgba(193,255,48,0.15)' : 'rgba(239,68,68,0.15)',
                          color: cr.passed ? 'var(--color-success)' : 'var(--color-danger)',
                          fontWeight: 500,
                        }}>
                          {cr.passed ? '✓' : '✗'} {cr.label}
                          {cr.passed && cr.matchedKeyword ? (
                            <span style={{ fontWeight: 400, opacity: 0.75 }}> · “{cr.matchedKeyword}”</span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {q.idealAnswer ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowModel((prev) => ({ ...prev, [key]: !prev[key] }))}
                          style={{ background: 'none', border: '1px solid var(--teal-dark)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--teal-dark)' }}
                        >
                          {showModel[key] ? t('voiceExam.hideModel') : t('voiceExam.showModel')}
                        </button>
                        {showModel[key] && (
                          <div style={{ marginTop: 8, padding: 10, background: 'var(--card-bg)', borderRadius: 6, fontSize: 13, color: 'var(--text-body)' }}>
                            {q.idealAnswer}
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}

          <button
            type="button"
            onClick={handleBackToSetup}
            style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginRight: 12 }}
          >
            {t('simulation.retry')}
          </button>
          <button
            type="button"
            onClick={onBack}
            style={{ padding: '10px 24px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('simulation.backToList')}
          </button>
        </div>
      </div>
    );
  }

  const currentExam = stationExams[currentStation];
  if (!currentExam) {
    return (
      <div className="page-teal">
        <div className="card-teal" style={{ textAlign: 'center' }}>
          <p>{t('simulation.noExams')}</p>
          <button type="button" onClick={handleBackToSetup} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            {t('simulation.backToSetup')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal">
      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        <span style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          background: 'rgba(249,115,22,0.12)', color: '#f97316',
        }}>
          {t('simulation.stationProgress', { n: currentStation + 1, total: stationExams.length })}
        </span>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <VoiceExam
          key={currentExam._id}
          exam={currentExam}
          onBack={handleBackToSetup}
          stationMode
          onStationSubmit={handleStationSubmit}
          submitting={submitting}
          duration={minutesPerStation}
        />
      </div>
    </div>
  );
};

export default VoiceExamSimulation;
