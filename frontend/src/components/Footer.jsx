import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import '../styles/componentstyle/footer.css';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <div className="footer">
      <div className="footer-content">
        <div className="footer-info">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
        <div className="footer-links">
          <Link to="/terms" className="footer-link">{t('footer.terms')}</Link>
          <Link to="/privacy" className="footer-link">{t('footer.privacy')}</Link>
        </div>
      </div>
    </div>
  );
}
