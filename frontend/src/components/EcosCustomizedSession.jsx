import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import Recorder from './Recorder';
import '../styles/teal-theme.css';

const STORAGE_KEY = 'ecos-custom-session';

export default function EcosCustomizedSession({ exams, stationCount, minutesPerStation, onBack }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('ready');
  const [currentStation, setCurrentStation] = useState(0);
  const [notes, setNotes] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.stationCount === exams.length && data.minutesPerStation === minutesPerStation) {
          return data.notes;
        }
      }
    } catch {}
    return exams.map(() => '');
  });
  const [timeLeft, setTimeLeft] = useState(minutesPerStation * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const timerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  const station = exams[currentStation];
  const isLast = currentStation >= exams.length - 1;

  // Save notes to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        notes,
        stationCount: exams.length,
        minutesPerStation,
      }));
    } catch {}
  }, [notes, exams.length, minutesPerStation]);

  // Timer using setTimeout (matching VoiceExam pattern)
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timerActive, timeLeft]);

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      setTimedOut(true);
      setAutoAdvancing(true);
      autoAdvanceRef.current = setTimeout(() => {
        setAutoAdvancing(false);
        advanceToNext();
      }, 3000);
    }
    return () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); };
  }, [timeLeft, timerActive]);

  // Beforeunload warning
  useEffect(() => {
    const hasNotes = notes.some((n) => n.trim());
    if (!hasNotes || phase === 'review') return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [notes, phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  const startStation = () => {
    setTimeLeft(minutesPerStation * 60);
    setTimerActive(true);
    setTimedOut(false);
    setAutoAdvancing(false);
    setPhase('running');
  };

  const advanceToNext = useCallback(() => {
    setTimerActive(false);
    setTimedOut(false);
    setAutoAdvancing(false);
    if (isLast) {
      sessionStorage.removeItem(STORAGE_KEY);
      setPhase('review');
    } else {
      setCurrentStation((p) => p + 1);
      setPhase('ready');
    }
  }, [isLast]);

  const setNote = (idx, val) => {
    setNotes((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (!station) {
    return (
      <div className="page-teal">
        <div className="quiz-container-teal" style={{ textAlign: 'center' }}>
          <p>{t('voiceExam.notFound')}</p>
          <button type="button" onClick={onBack} className="btn-primary" style={{ marginTop: 12 }}>
            {t('ecosCustomSetup.back')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="page-teal">
        <div className="quiz-container-teal">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button type="button" className="btn-ghost" onClick={onBack}>
              &larr; {t('ecosCustomSetup.back')}
            </button>
            <span
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                background: 'rgba(249,115,22,0.12)', color: '#f97316',
              }}
            >
              {t('ecosCustomExam.stationLabel', { n: currentStation + 1, total: exams.length })}
            </span>
          </div>

          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>{station.title}</h3>

          <div
            style={{
              background: 'var(--color-bg)', padding: 14, borderRadius: 8, marginBottom: 20,
              fontSize: 14, lineHeight: 1.6, maxHeight: 200, overflowY: 'auto',
              color: 'var(--text-dark)',
            }}
          >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {station.clinicalCasePrompt || t('ecosCustomExam.noNotes')}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {t('ecosCustomSetup.estimatedTime', { time: minutesPerStation })}
            </span>
            <button type="button" onClick={startStation} className="btn-primary">
              {t('ecosCustomExam.startStation')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'review') {
    return (
      <div className="page-teal">
        <div className="quiz-container-teal">
          <div
            style={{
              padding: 20, borderRadius: 8, marginBottom: 24, textAlign: 'center',
              background: 'rgba(0,115,85,0.08)', color: 'var(--teal-dark)',
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{t('ecosCustomExam.reviewTitle')}</h3>
            <span style={{ fontSize: 13, opacity: 0.8 }}>
              {t('ecosCustomExam.stations')}: {exams.length}
            </span>
          </div>

          {exams.map((ex, i) => (
            <div
              key={i}
              style={{
                marginBottom: 16, borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--border-light)', background: 'var(--card-bg)',
              }}
            >
              <div
                style={{
                  padding: '12px 16px', background: 'var(--color-bg)',
                  borderBottom: '1px solid var(--border-light)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span
                  style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    background: 'rgba(249,115,22,0.12)', color: '#f97316',
                  }}
                >
                  {t('ecosCustomExam.stationLabel', { n: i + 1, total: exams.length })}
                </span>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <p style={{ fontWeight: 600, margin: '0 0 8px', fontSize: 14 }}>{ex.title}</p>
                <div
                  style={{
                    fontSize: 12, color: 'var(--text-muted)', marginBottom: 10,
                    padding: 8, background: 'var(--color-bg)', borderRadius: 6,
                    lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
                  }}
                >
                  {ex.clinicalCasePrompt}
                </div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 4px' }}>
                  {t('ecosCustomExam.notesLabel')}
                </p>
                {notes[i]?.trim() ? (
                  <p style={{
                    fontSize: 13, color: 'var(--text-dark)', margin: 0,
                    fontStyle: 'italic', padding: 10, background: 'var(--color-bg)',
                    borderRadius: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5,
                  }}>
                    {notes[i]}
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', padding: '8px 0' }}>
                    {t('ecosCustomExam.noNotes')}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'center' }}>
            <button type="button" onClick={onBack} className="btn-primary">
              {t('ecosCustomSetup.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Running phase
  return (
    <div className="page-teal">
      <div className="quiz-container-teal">
        <div
          style={{
            padding: '12px 16px', background: 'var(--color-bg)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span
            style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: 'rgba(249,115,22,0.12)', color: '#f97316',
            }}
          >
            {t('ecosCustomExam.stationLabel', { n: currentStation + 1, total: exams.length })}
          </span>

          <span
            style={{
              fontSize: 20, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
              padding: '4px 16px', borderRadius: 8, letterSpacing: 1,
              background: timeLeft <= 60 ? 'rgba(239,68,68,0.15)' : 'rgba(0,115,85,0.1)',
              color: timeLeft <= 60 ? '#ef4444' : 'var(--teal-dark)',
              transition: 'background 0.3s, color 0.3s',
            }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <div style={{ padding: 16 }}>
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{station.title}</h4>
          <div
            style={{
              fontSize: 14, lineHeight: 1.6, color: 'var(--text-dark)', marginBottom: 16,
              padding: 12, background: 'var(--color-bg)', borderRadius: 8,
              maxHeight: 180, overflowY: 'auto',
            }}
          >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{station.clinicalCasePrompt}</p>
          </div>

          {station.images && station.images.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              {station.images.map((img, i) => (
                <img
                  key={i}
                  src={`${API_BASE_URL}/api/voice-exam-images/${img}`}
                  alt={t('voiceExam.imageAlt', { n: i + 1 })}
                  loading="lazy"
                  style={{
                    maxWidth: '100%', maxHeight: 200, borderRadius: 8,
                    objectFit: 'contain', border: '1px solid var(--border-light)',
                  }}
                />
              ))}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <Recorder onTranscript={(text) => setNote(currentStation, text)} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-dark)' }}>
              {t('ecosCustomExam.notesLabel')}
            </label>
            <textarea
              value={notes[currentStation] || ''}
              onChange={(e) => setNote(currentStation, e.target.value)}
              placeholder={t('ecosCustomExam.notesPlaceholder')}
              rows={5}
              disabled={timedOut}
              style={{
                width: '100%', padding: 12, border: '1px solid var(--border-light)',
                borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
                resize: 'vertical', boxSizing: 'border-box',
                background: timedOut ? 'var(--color-bg)' : 'var(--card-bg)',
                color: 'var(--text-dark)', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { if (!timedOut) e.currentTarget.style.borderColor = 'var(--teal-dark)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            />
          </div>

          {timeLeft <= 60 && timeLeft > 0 && (
            <div
              style={{
                textAlign: 'center', marginBottom: 12, fontSize: 12, fontWeight: 600,
                color: '#ef4444',
              }}
            >
              {t('voiceExam.timerWarning')}
            </div>
          )}

          {timedOut && (
            <div
              style={{
                textAlign: 'center', marginBottom: 12, padding: '8px 12px',
                borderRadius: 6, background: 'rgba(239,68,68,0.12)',
                fontSize: 14, fontWeight: 700, color: '#ef4444',
              }}
            >
              {autoAdvancing
                ? `${t('ecosCustomExam.timeUp')} — ${t('ecosCustomExam.nextStation')}...`
                : t('ecosCustomExam.timeUp')
              }
            </div>
          )}
        </div>

        <div
          style={{
            padding: '12px 16px', borderTop: '1px solid var(--border-light)',
            display: 'flex', gap: 10, justifyContent: 'center',
          }}
        >
          <button type="button" onClick={advanceToNext} className="btn-primary" style={{ flex: 1 }}>
            {isLast ? t('ecosCustomExam.finish') : t('ecosCustomExam.nextStation')}
          </button>
          <button type="button" onClick={onBack} className="btn-ghost">
            {t('ecosCustomExam.quit')}
          </button>
        </div>
      </div>
    </div>
  );
}
