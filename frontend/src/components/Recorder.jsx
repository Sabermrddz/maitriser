import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';

export default function Recorder({ onAudioReady, onTranscript }) {
  const { t, lang } = useTranslation();
  const [state, setState] = useState('idle');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  const startRecording = async () => {
    setError('');
    setUnsupported(false);
    chunksRef.current = [];
    finalTranscriptRef.current = '';
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
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US';

        recognition.onresult = (event) => {
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
          if (event.error === 'no-speech' || event.error === 'aborted') return;
          setError(t('voiceExam.recorder.error.recognition'));
          setTranscribing(false);
        };

        recognition.onend = () => {
          setTranscribing(false);
          if (onTranscript) onTranscript(finalTranscriptRef.current);
        };

        recognition.start();
        setTranscribing(true);
        recognitionRef.current = recognition;
      } else {
        setUnsupported(true);
      }
    } catch (err) {
      logger.error({ err }, 'Recorder mic access denied');
      setError(t('voiceExam.recorder.error.mic'));
    }
  };

  const stopRecording = () => {
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
            {transcribing ? <>🎤 {t('voiceExam.recorder.transcribing')}</> : <>⏳ {t('voiceExam.recorder.waiting')}</>}
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
    </div>
  );
}
