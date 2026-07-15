import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import { API_BASE_URL } from '../config/api';
import '../styles/teal-theme.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('forgotPassword.title'));
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || t('forgot.success'));
    } catch {
      setMessage(t('forgot.error.generic'));
    } finally { setLoading(false); }
  };

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div className="card-teal" style={{ maxWidth: 400, padding: '2rem' }}>
        <h2>{t('forgot.title')}</h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          {t('forgot.subtitle')}
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder={t('forgot.email')} required />
          <button className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('forgot.loading') : t('forgot.button')}
          </button>
        </form>
        {message && <p style={{ marginTop: 12, color: 'var(--text-muted)' }}>{message}</p>}
        <p style={{ marginTop: 16, textAlign: 'center' }}><Link to="/login">{t('forgot.backToLogin')}</Link></p>
      </div>
    </div>
  );
};

export default ForgotPassword;
