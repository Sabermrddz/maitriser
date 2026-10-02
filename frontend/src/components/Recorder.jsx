import { useState, useRef, useEffect } from 'react';
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
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const wantListeningRef = useRef(false);
  const restartAttemptsRef = useRef(0);
  const noSpeechCountRef = useRef(0);
  const restartTimerRef = useRef(null);
  const MAX_RESTARTS = 5;
  const NO_SPEECH_HINT_AT = 3;

  const clearRestartTimer = () => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  };

  const startRecognition = () => {
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
    logger.warn({ lang: recognition.lang }, 'Recorder recognition started');

    recognition.onresult = (event) => {
      noSpeechCountRef.current = 0;
      setNotice('');
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
      logger.error({ error: event?.error }, 'Recorder recognition error');
      if (event.error === 'aborted' && !wantListeningRef.current) return;
      if (event.error === 'no-speech') {
        noSpeechCountRef.current += 1;
        if (noSpeechCountRef.current >= NO_SPEECH_HINT_AT) {
          setNotice(t('voiceExam.recorder.hint.noSpeech'));
        }
        return;
      }
      if (event.error === 'network' || event.error === 'service-not-allowed' || event.error === 'not-allowed') {
        setError(t('voiceExam.recorder.error.service'));
      } else {
        setError(t('voiceExam.recorder.error.recognition'));
      }
      setTranscribing(false);
    };

    recognition.onend = () => {
      logger.warn('Recorder recognition ended');
      setTranscribing(false);
      if (onTranscript) onTranscript(finalTranscriptRef.current);
      // Keep-alive: restart while the user is still recording (pauses kill
      // recognition on mobile; without this everything said after is lost).
      if (
        wantListeningRef.current &&
        mediaRecorderRef.current?.state === 'recording' &&
        restartAttemptsRef.current < MAX_RESTARTS
      ) {
        const delay = 300 * (restartAttemptsRef.current + 1);
        restartAttemptsRef.current += 1;
        logger.warn({ attempt: restartAttemptsRef.current, delay }, 'Recorder restarting recognition');
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!wantListeningRef.current) return;
          try {
            startRecognition();
            setTranscribing(true);
          } catch (e) {
            logger.error({ e }, 'Recorder recognition restart failed');
          }
        }, delay);
      }
    };

    recognition.start();
    setTranscribing(true);
    recognitionRef.current = recognition;
  };

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = async () => {
    setError('');
    setNotice('');
    setHeardResult(false);
    setUnsupported(false);
    chunksRef.current = [];
    finalTranscriptRef.current = '';
    wantListeningRef.current = true;
    restartAttemptsRef.current = 0;
    noSpeechCountRef.current = 0;
    if (onTranscript) onTranscript('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: mime });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('done');
        if (onAudioReady) onAudioReady(blob, url);
      };

      mediaRecorderRef.current.onerror = () => {
        setError(t('voiceExam.recorder.error.recording'));
        setState('idle');
      };

      mediaRecorderRef.current.start();
      setState('recording');

      if (SpeechRecognitionAPI) {
        startRecognition();
      } else {
        setUnsupported(true);
      }
    } catch (err) {
      logger.error({ err }, 'Recorder mic access denied');
      setError(t('voiceExam.recorder.error.mic'));
    }
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
      {state === 'done' && audioUrl && (
        <>
          <audio src={audioUrl} controls style={{ height: 36 }} />
          <button type="button" onClick={() => { setState('idle'); setAudioUrl(null); if (onAudioReady) onAudioReady(null, null); }} aria-label={t('voiceExam.recorder.delete')} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer', fontSize: 11 }}>
            ✕ {t('voiceExam.recorder.delete')}
          </button>
          {unsupported && <span style={{ fontSize: 11, color: '#e67e22' }}>{t('voiceExam.recorder.unsupported')}</span>}
        </>
      )}
      {error && <span style={{ color: '#e74c3c', fontSize: 12 }}>{error}</span>}
      {notice && !error && <span style={{ color: '#e67e22', fontSize: 12 }}>{notice}</span>}
    </div>
  );
}
