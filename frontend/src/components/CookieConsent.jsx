import React, { useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import '../styles/teal-theme.css';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { const consent = localStorage.getItem('cookie-consent'); if (!consent) setVisible(true); } catch { setVisible(true); }
  }, []);

  const accept = () => {
    try { localStorage.setItem('cookie-consent', 'accepted'); } catch { /* incognito */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem('cookie-consent', 'declined'); } catch { /* incognito */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="alert" aria-live="polite">
      <p className="cookie-consent-text">{t('cookie.text')}</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn-primary cookie-consent-btn" onClick={accept}>{t('cookie.accept')}</button>
        <button className="btn-secondary" onClick={decline} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>{t('cookie.decline') || 'Decline'}</button>
      </div>
    </div>
  );
};

export default CookieConsent;
