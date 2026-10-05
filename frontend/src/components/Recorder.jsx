/* eslint-disable no-empty -- teardown and best-effort telemetry guards are intentionally empty */
import { useState, useRef, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';

export default function Recorder({ onAudioReady, onTranscript }) {
  const { t, lang } = useTranslation();
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
  const MAX_RESTARTS = 8;
  const NO_SPEECH_HINT_AT = 3;

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

  const startRecognition = () => {
    const myId = ++recognitionIdRef.current;
    const mySession = sessionRef.current; // drop callbacks from a superseded session
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
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    logger.warn({ lang: recognition.lang }, 'Recorder recognition started');

    recognition.onresult = (event) => {
      if (mySession !== sessionRef.current) return; // superseded session
      noSpeechCountRef.current = 0;
      restartAttemptsRef.current = 0;
      setNotice('');
      setExhausted(false);
      setHeardResult(true);
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          finalTranscriptRef.current += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
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
        setError(t('voiceExam.recorder.error.service'));
      } else {
        setError(t('voiceExam.recorder.error.recognition'));
      }
      try { Sentry.captureException(new Error(`recognition:${event?.error}`)); } catch { /* ignore */ }
      setTranscribing(false);
    };

    recognition.onend = () => {
      if (mySession !== sessionRef.current) return; // superseded session
      logger.warn('Recorder recognition ended');
      if (onTranscript) onTranscript(finalTranscriptRef.current);
      // Keep-alive: restart while the user is still recording. The budget
      // counts only CONSECUTIVE result-less restarts (reset on any result),
      // so long answers never exhaust it — only a dead service does.
      const stillListening = wantListeningRef.current;
      if (stillListening && restartAttemptsRef.current < MAX_RESTARTS) {
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
      } else if (stillListening) {
        setTranscribing(false);
        setExhausted(true);
        setNotice(t('voiceExam.recorder.hint.exhausted'));
        logger.error('Recorder recognition restarts exhausted without results');
        try { Sentry.captureException(new Error('recognition:restarts-exhausted')); } catch { /* ignore */ }
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
    wantListeningRef.current = true;
    restartAttemptsRef.current = 0;
    noSpeechCountRef.current = 0;
    recorderActiveRef.current = false;
    if (onTranscript) onTranscript('');

    // 1) Transcription starts SYNCHRONOUSLY inside the tap (user gesture).
    //    Mobile browsers may reject recognition.start() issued after an await.
    if (SpeechRecognitionAPI) {
      if (!startRecognition()) return; // engine unusable — accurate error already shown
      setState('recording');
    } else {
      setUnsupported(true);
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
          if (mySession !== sessionRef.current) return; // superseded by a newer session
          const blob = new Blob(chunksRef.current, { type: mime });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          setState('done');
          if (onAudioReady) onAudioReady(blob, url);
        };

        mediaRecorderRef.current.onerror = () => {
          setError(t('voiceExam.recorder.error.recording'));
          setState('idle');
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
          <button type="button" onClick={() => { setState('idle'); setAudioUrl(null); if (onAudioReady) onAudioReady(null, null); }} aria-label={t('voiceExam.recorder.delete')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontSize: 11 }}>
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
