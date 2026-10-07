/* eslint-disable no-empty -- teardown and best-effort telemetry guards are intentionally empty */
import { useState, useRef, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import { API_BASE_URL, fetchWithAuth } from '../config/api';

export default function Recorder({ onAudioReady, onTranscript, onStatus }) {
  const { t } = useTranslation();
  const [state, setState] = useState('idle');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [heardResult, setHeardResult] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState('');
  const [exhausted, setExhausted] = useState(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const wantListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const noSpeechCountRef = useRef(0);
  const restartTimerRef = useRef(null);
  const sessionRef = useRef(0);
  const recognitionIdRef = useRef(0);
  const recorderActiveRef = useRef(false);
  const heardResultRef = useRef(false);
  const lastBlobRef = useRef(null);
  const lastInterimRef = useRef('');
  const gotContentThisCycleRef = useRef(false);
  const deadCyclesRef = useRef(0);
  const recorderStartAtRef = useRef(0);
  const networkErrCountRef = useRef(0);
  const MAX_RESTARTS = 8;
  const NETWORK_DEAD_AT = 2; // two consecutive network errors = cloud service gone (Brave/Samsung)
  const NO_SPEECH_HINT_AT = 3;
  const statusRef = useRef('idle');

  // Surface the transcription state to the parent so the answer textarea can
  // show the right placeholder: idle → pending (recording, no text yet) →
  // live (dictation flowing) → server (Groq call) → failed (nothing transcribed).
  const emit = (s) => {
    if (statusRef.current === s) return;
    statusRef.current = s;
    if (onStatus) onStatus(s);
  };

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const reportRecognitionError = (err, context) => {
    logger.error({ err }, context);
    try { Sentry.captureException(err); } catch { /* telemetry best-effort */ }
  };

  // Server-side transcription fallback: browsers without Google speech API
  // keys (Brave, Samsung Internet, Firefox) record audio but never produce
  // text. Called from the stop handler ONLY when the browser yielded nothing,
  // so healthy Chrome/Edge sessions never touch the server.
  const serverTranscribe = async (blob, mySession) => {
    try {
      const fd = new FormData();
      const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
      fd.append('audio', blob, `answer.${ext}`);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/transcribe`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`transcribe HTTP ${res.status}`);
      const data = await res.json();
      const text = String(data?.text || '').trim();
      if (mySession !== sessionRef.current) return; // superseded (re-record/delete)
      if (!text) {
        emit('failed');
        setError(t('voiceExam.recorder.error.serverTranscribe'));
        return;
      }
      finalTranscriptRef.current = text;
      if (onTranscript) onTranscript(text);
      setHeardResult(true);
      heardResultRef.current = true;
      emit('idle');
      // Coverage signal still applies to server text (French ≈12-15 chars/s).
      const seconds = recorderStartAtRef.current ? (Date.now() - recorderStartAtRef.current) / 1000 : 0;
      setNotice(seconds > 1 && text.length < seconds * 4 ? t('voiceExam.recorder.hint.incomplete') : '');
      logger.warn('Recorder server transcription applied', { chars: text.length, seconds: +seconds.toFixed(2) });
    } catch (e) {
      if (mySession !== sessionRef.current) return;
      logger.error({ e }, 'Recorder server transcription failed');
      try { Sentry.captureException(e); } catch { /* telemetry best-effort */ }
      emit('failed');
      setError(t('voiceExam.recorder.error.serverTranscribe'));
    }
  };

  const startRecognition = () => {
    const myId = ++recognitionIdRef.current;
    const mySession = sessionRef.current; // drop callbacks from a superseded session
    gotContentThisCycleRef.current = false; // new cycle: did THIS session yield text?
    let recognition;
    try {
      recognition = new SpeechRecognitionAPI();
    } catch (e) {
      reportRecognitionError(e, 'Recorder recognition unavailable');
      wantListeningRef.current = false;
      setTranscribing(false);
      setError(t('voiceExam.recorder.error.start'));
      return false;
    }
    // Single-utterance mode: "continuous" sessions silently yield nothing on
    // some Android builds. The keep-alive below restarts on every onend, so
    // listening stays uninterrupted (same UX, proven server behavior).
    recognition.continuous = false;
    recognition.interimResults = true;
    // Exams and grading criteria are always French, regardless of UI language.
    recognition.lang = 'fr-FR';
    logger.warn({ lang: recognition.lang }, 'Recorder recognition started');

    recognition.onresult = (event) => {
      if (mySession !== sessionRef.current) return; // superseded session
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalTranscriptRef.current += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      // Only a non-empty transcript counts as heard: a dead service can
      // deliver empty results, which must not fake "heard" or reset the
      // restart budget.
      const heard = (finalTranscriptRef.current + interim).trim();
      lastInterimRef.current = interim;
      if (heard) {
        gotContentThisCycleRef.current = true;
        noSpeechCountRef.current = 0;
        restartAttemptsRef.current = 0;
        networkErrCountRef.current = 0; // live results prove the service is back
        setNotice('');
        setExhausted(false);
        setHeardResult(true);
        heardResultRef.current = true;
        emit('live');
      } else {
        logger.warn('Recorder recognition result was empty');
      }
      if (onTranscript) onTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event) => {
      if (mySession !== sessionRef.current) return; // superseded session
      logger.error({ error: event?.error }, 'Recorder recognition error');
      if (event.error === 'aborted' && !wantListeningRef.current) return;
      if (event.error === 'no-speech') {
        noSpeechCountRef.current += 1;
        if (noSpeechCountRef.current >= NO_SPEECH_HINT_AT) {
          setNotice(t('voiceExam.recorder.hint.noSpeech'));
        }
        return;
      }
      if (event.error === 'not-allowed') {
        setError(t('voiceExam.recorder.error.mic'));
      } else if (event.error === 'audio-capture') {
        setError(t('voiceExam.recorder.error.capture'));
      } else if (event.error === 'network' || event.error === 'service-not-allowed') {
        networkErrCountRef.current += 1;
        if (networkErrCountRef.current >= NETWORK_DEAD_AT) {
          // Two in a row with zero content = cloud service is gone for good
          // (Brave/Samsung ship without speech API keys). Stop the restart
          // loop; recording continues and the stop handler transcribes
          // server-side instead.
          logger.warn({ count: networkErrCountRef.current }, 'Recorder speech service dead — deferring to server transcription');
          setError('');
          setNotice(t('voiceExam.recorder.hint.liveOff'));
          setExhausted(true); // keeps the manual retry button available
          if (!heardResultRef.current) emit('pending'); // no live text → textarea keeps "transcription" placeholder
        } else {
          setError(t('voiceExam.recorder.error.service'));
        }
      } else {
        setError(t('voiceExam.recorder.error.recognition'));
      }
      try { Sentry.captureException(new Error(`recognition:${event?.error}`)); } catch { /* ignore */ }
      setTranscribing(false);
    };

    recognition.onend = () => {
      if (mySession !== sessionRef.current) return; // superseded session
      logger.warn('Recorder recognition ended');
      // A cycle that produced no content while recording is evidence the
      // service dropped part of the answer (diagnostic only — also counts
      // plain silence).
      if (wantListeningRef.current && !gotContentThisCycleRef.current) {
        deadCyclesRef.current += 1;
      }
      // A session can never finalize after it ended: any unfinalized interim
      // would be lost forever — keep it as provisional text instead.
      if (lastInterimRef.current) {
        finalTranscriptRef.current += lastInterimRef.current;
        lastInterimRef.current = '';
      }
      if (onTranscript) onTranscript(finalTranscriptRef.current);
      // Keep-alive: restart while the user is still recording. The budget
      // counts only CONSECUTIVE result-less restarts (reset on any result),
      // so long answers never exhaust it — only a dead service does.
      const stillListening = wantListeningRef.current;
      const serviceDead = networkErrCountRef.current >= NETWORK_DEAD_AT;
      if (stillListening && !serviceDead && restartAttemptsRef.current < MAX_RESTARTS) {
        const delay = 300 * (restartAttemptsRef.current + 1);
        restartAttemptsRef.current += 1;
        logger.warn({ attempt: restartAttemptsRef.current, delay }, 'Recorder restarting recognition');
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (myId !== recognitionIdRef.current) return; // superseded by a newer session
          if (!wantListeningRef.current) return;
          try {
            startRecognition();
            setTranscribing(true);
          } catch (e) {
            reportRecognitionError(e, 'Recorder recognition restart failed');
          }
        }, delay);
      } else if (stillListening && !serviceDead) {
        setTranscribing(false);
        setExhausted(true);
        setNotice(t('voiceExam.recorder.hint.exhausted'));
        logger.error('Recorder recognition restarts exhausted without results');
        try { Sentry.captureException(new Error('recognition:restarts-exhausted')); } catch { /* ignore */ }
      } else if (stillListening) {
        // Service dead: stay in recording (MediaRecorder still works); the
        // stop handler falls back to server-side transcription.
        setTranscribing(false);
      } else {
        setTranscribing(false);
        // No audio recorder in this session: end the session here (with a
        // recorder, the 'done' state comes from its onstop as before).
        if (!recorderActiveRef.current) setState('done');
      }
    };

    recognitionRef.current = recognition;
    setTranscribing(true);
    setExhausted(false);
    try {
      recognition.start();
    } catch (e) {
      // Engine busy (e.g. start called right after a stop): single delayed attempt.
      logger.error({ e }, 'Recorder recognition start failed, retrying once');
      setTimeout(() => {
        if (myId !== recognitionIdRef.current || !wantListeningRef.current) return;
        try {
          recognition.start();
        } catch (e2) {
          reportRecognitionError(e2, 'Recorder recognition start failed permanently');
          recognitionRef.current = null;
          setTranscribing(false);
          setError(t('voiceExam.recorder.error.start'));
        }
      }, 300);
    }
    return true;
  };

  const retryListening = () => {
    restartAttemptsRef.current = 0;
    noSpeechCountRef.current = 0;
    networkErrCountRef.current = 0;
    setExhausted(false);
    setNotice('');
    setError('');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (wantListeningRef.current) {
      try {
        startRecognition();
        setTranscribing(true);
        emit('pending'); // awaiting first words again
      } catch (e) {
        reportRecognitionError(e, 'Recorder manual retry failed');
        setError(t('voiceExam.recorder.error.service'));
      }
    }
  };

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = () => {
    // Tear down any previous session first (retry while a session is active).
    clearRestartTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    const mySession = ++sessionRef.current;

    setError('');
    setNotice('');
    setExhausted(false);
    setHeardResult(false);
    setUnsupported(false);
    setAudioUrl(null);
    chunksRef.current = [];
    finalTranscriptRef.current = '';
    lastInterimRef.current = '';
    deadCyclesRef.current = 0;
    gotContentThisCycleRef.current = false;
    wantListeningRef.current = true;
    restartAttemptsRef.current = 0;
    noSpeechCountRef.current = 0;
    networkErrCountRef.current = 0;
    recorderActiveRef.current = false;
    heardResultRef.current = false;
    recorderStartAtRef.current = 0;
    lastBlobRef.current = null;
    if (onTranscript) onTranscript('');

    // 1) Transcription starts SYNCHRONOUSLY inside the tap (user gesture).
    //    Mobile browsers may reject recognition.start() issued after an await.
    if (SpeechRecognitionAPI) {
      if (!startRecognition()) { emit('idle'); return; } // engine unusable — accurate error already shown
      setState('recording');
      emit('pending'); // recording, no text yet — transcription placeholder
    } else {
      setUnsupported(true);
      emit('pending'); // audio-only capture: text arrives server-side at stop
    }

    // 2) Audio capture for listen-back (unchanged behavior).
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (mySession !== sessionRef.current || !wantListeningRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mime });

        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          if (mySession !== sessionRef.current) {
            logger.warn('Recorder onstop superseded', { mySession, current: sessionRef.current });
            return; // superseded by a newer session
          }
          const blob = new Blob(chunksRef.current, { type: mime });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          lastBlobRef.current = blob;
          setState('done');
          if (onAudioReady) onAudioReady(blob, url);
          // Coverage check: honest signal when the recognition service
          // dropped most of the answer (French speech ≈12-15 chars/s; 4 is
          // a cautious floor). The textarea stays editable either way.
          const seconds = recorderStartAtRef.current ? (Date.now() - recorderStartAtRef.current) / 1000 : 0;
          const browserChars = finalTranscriptRef.current.trim().length;
          const empty = browserChars === 0;
          logger.warn('Recorder stop decision', { emptyTranscript: empty, blobSize: blob.size, seconds: +seconds.toFixed(2), deadCycles: deadCyclesRef.current, browserChars });
          if (empty && blob.size > 0 && seconds >= 1) {
            // Browser gave us nothing (Brave/Samsung/Firefox/dead service):
            // transcribe the recorded audio server-side. Chrome/Edge with
            // text never reach this branch.
            logger.warn('Recorder falling back to server transcription', { seconds: +seconds.toFixed(2) });
            emit('server');
            serverTranscribe(blob, mySession);
          } else {
            if (seconds > 1 && browserChars < seconds * 4) {
              setNotice(t('voiceExam.recorder.hint.incomplete'));
            }
            // Nothing transcribed and no server call coming → manual typing.
            emit(browserChars === 0 ? 'failed' : 'idle');
          }
        };

        mediaRecorderRef.current.onerror = () => {
          setError(t('voiceExam.recorder.error.recording'));
          setState('idle');
          emit('idle');
          wantListeningRef.current = false;
          clearRestartTimer();
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
            recognitionRef.current = null;
          }
          setTranscribing(false);
        };

        mediaRecorderRef.current.start();
        recorderActiveRef.current = true;
        recorderStartAtRef.current = Date.now();
        // Discount prompt-time noise: the real session starts now.
        restartAttemptsRef.current = 0;
        noSpeechCountRef.current = 0;
        setNotice('');
        setState('recording');
      } catch (err) {
        if (mySession !== sessionRef.current) return;
        logger.error({ err }, 'Recorder mic access denied');
        try { Sentry.captureException(err); } catch { /* ignore */ }
        // No mic: stop the transcription started in step 1 — nothing to transcribe.
        wantListeningRef.current = false;
        clearRestartTimer();
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
          recognitionRef.current = null;
        }
        setTranscribing(false);
        emit('idle');
        setError(t('voiceExam.recorder.error.mic'));
      }
    })();
  };

  const stopRecording = () => {
    wantListeningRef.current = false;
    clearRestartTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearRestartTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.stop(); } catch {}
        mediaRecorderRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {state === 'idle' && (
        <button type="button" onClick={startRecording} aria-label={t('voiceExam.recorder.record')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          🎤 {t('voiceExam.recorder.record')}
        </button>
      )}
      {state === 'recording' && (
        <>
          <button type="button" onClick={stopRecording} aria-label={t('voiceExam.recorder.stop')} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🔴 {t('voiceExam.recorder.stop')}
          </button>
          <span style={{ fontSize: 11, color: transcribing ? 'var(--teal-accent)' : 'var(--text-muted)' }}>
            {transcribing
              ? (heardResult
                ? <><span aria-hidden="true">🎤</span> {t('voiceExam.recorder.transcribing')}</>
                : <><span aria-hidden="true">🎤</span> {t('voiceExam.recorder.listening')}</>)
              : <><span aria-hidden="true">⏳</span> {t('voiceExam.recorder.waiting')}</>}
          </span>
        </>
      )}
      {state === 'done' && (
        <>
          {audioUrl && <audio src={audioUrl} controls style={{ height: 36 }} />}
          {!audioUrl && <span style={{ fontSize: 12, color: 'var(--teal-accent)', fontWeight: 600 }}>✓ {t('voiceExam.recorder.done')}</span>}
          <button type="button" onClick={() => { setState('idle'); setAudioUrl(null); setNotice(''); emit('idle'); if (onAudioReady) onAudioReady(null, null); }} aria-label={t('voiceExam.recorder.delete')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontSize: 11 }}>
            ✕ {t('voiceExam.recorder.delete')}
          </button>
          {unsupported && <span style={{ fontSize: 11, color: '#e67e22' }}>{t('voiceExam.recorder.unsupported')}</span>}
        </>
      )}
      {error && <span style={{ color: '#e74c3c', fontSize: 12 }}>{error}</span>}
      {notice && !error && <span style={{ color: '#e67e22', fontSize: 12 }}>{notice}</span>}
      {state !== 'done' && (exhausted || error) && (
        <button type="button" onClick={exhausted ? retryListening : startRecording} aria-label={t('voiceExam.recorder.retry')} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--teal-dark)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          ↻ {t('voiceExam.recorder.retry')}
        </button>
      )}
    </div>
  );
}
