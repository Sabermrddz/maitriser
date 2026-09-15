import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import '../styles/modal.css';

const PremiumGateModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    return () => { previousFocusRef.current?.focus?.(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="premium-gate-overlay" onClick={onClose}
      role="dialog" aria-modal="true" aria-labelledby="premium-gate-title">
      <div className="premium-gate-card" onClick={(e) => e.stopPropagation()}>
        <div className="premium-gate-icon" aria-hidden="true">&#128274;</div>
        <h3 className="premium-gate-title" id="premium-gate-title">{t('modal.premium.title')}</h3>
        <p className="premium-gate-desc">
          {t('modal.premium.desc')}
        </p>
        <button
          className="premium-gate-btn"
          onClick={() => { navigate('/pricing'); }}
        >
          {t('modal.premium.viewPlans')}
        </button>
        <button className="premium-gate-cancel" onClick={onClose}>
          {t('modal.premium.cancel')}
        </button>
      </div>
    </div>
  );
};

export default PremiumGateModal;
