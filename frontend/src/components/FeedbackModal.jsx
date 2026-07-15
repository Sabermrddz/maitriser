import React, { useState } from 'react';
import { authFetch } from '../config/authFetch';
import { useToast } from './Toast';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'var(--dc-overlay)',
  zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalStyle = {
  background: 'var(--dc-white)', borderRadius: 12, padding: 28,
  width: '90%', maxWidth: 460, boxShadow: 'var(--dc-shadow)',
  animation: 'slideUp 0.25s ease',
};

const FeedbackModal = ({ onClose }) => {
  const { t } = useTranslation();
  const addToast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      addToast(t('feedback.minLength'), 'warning');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch('/api/feedback', {
        method: 'POST',
        body: { message: message.trim(), pageUrl: window.location.href },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast(t('feedback.success'), 'success');
      onClose();
    } catch (err) {
      logger.error({ err }, 'Feedback submit failed');
      addToast(t('feedback.error'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: 'var(--dc-dark)' }}>{t('feedback.title')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--dc-text-muted)' }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedback.placeholder')}
            maxLength={2000}
            rows={5}
            style={{
              width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--dc-border)',
              fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit', background: 'var(--dc-cream-light)', color: 'var(--dc-text)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--dc-text-muted)' }}>{t('feedback.charCount', { count: message.length, max: 2000 })}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={onClose} style={{
                padding: '8px 20px', borderRadius: 8, border: '1px solid var(--dc-border)',
                background: 'var(--dc-cream)', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--dc-text)',
              }}>{t('cancel')}</button>
              <button type="submit" disabled={sending} className="feedback-send-btn"
                style={{ opacity: sending ? 0.5 : 1, cursor: sending ? 'not-allowed' : 'pointer' }}
              >{sending ? t('feedback.sending') : t('feedback.send')}</button>
            </div>
          </div>
        </form>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
};

export default FeedbackModal;
