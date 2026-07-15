import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const ProfileGuardModal = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [incomplete, setIncomplete] = useState(true);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    let disc = null, year = null;
    try { disc = localStorage.getItem('userDiscipline'); year = localStorage.getItem('userYear'); } catch { /* incognito */ }
    setIncomplete(!disc || !year);
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!(incomplete && !dismissed)) return;
    prevFocusRef.current = document.activeElement;
    const dlg = dialogRef.current;
    const focusables = dlg?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    (focusables && focusables[0]) ? focusables[0].focus() : dlg?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); setDismissed(true); return; }
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevFocusRef.current?.focus?.();
    };
  }, [incomplete, dismissed]);

  if (checking) return null;

  if (incomplete && !dismissed) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pg-title"
        ref={dialogRef}
        tabIndex={-1}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => setDismissed(true)}
      >
        <div
          style={{
            background: 'var(--card-bg, #fff)',
            color: 'var(--text-dark, #0F172A)',
            borderRadius: 16, padding: 40, maxWidth: 420,
            width: '90%', textAlign: 'center', position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setDismissed(true)}
            aria-label="Fermer"
            style={{
              position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
              color: '#999', lineHeight: 1,
            }}
          >
            &times;
          </button>
          <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>⚠️</div>
          <h2 id="pg-title" style={{ marginBottom: 12, color: 'var(--teal-dark, #04484F)' }}>{t('profileGuard.title')}</h2>
          <p style={{ color: 'var(--text-dark, #555)', marginBottom: 24, lineHeight: 1.6, fontSize: 15 }}>
            {t('profileGuard.message')}
          </p>
          <button
            onClick={() => navigate('/profile')}
            style={{
              padding: '12px 32px', fontSize: 16, fontWeight: 600,
              background: 'linear-gradient(135deg, var(--teal-dark, #04484F), var(--teal-deeper, #066A73))',
              color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {t('profileGuard.cta')}
          </button>
          <p style={{ marginTop: 16, fontSize: 13, color: '#999' }}>
            <button
              onClick={() => setDismissed(true)}
              style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}
            >
              {t('profileGuard.skip') || 'Continuer sans profil'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProfileGuardModal;
