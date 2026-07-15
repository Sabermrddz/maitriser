import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import { API_BASE_URL } from '../config/api';
import '../styles/teal-theme.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('verifyEmail.title'));
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage(t('verifyEmail.tokenMissing')); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok) { setStatus('success'); setMessage(t('verify.success')); }
        else { setStatus('error'); setMessage(data.message || t('verify.error.generic')); }
      } catch {
        setStatus('error'); setMessage(t('verifyEmail.networkError'));
      }
    })();
  }, [searchParams]);

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div className="card-teal" style={{ maxWidth: 440, textAlign: 'center', padding: '2rem' }}>
        <h2>{t('verify.title')}</h2>
        {status === 'verifying' && <p>{t('loading')}</p>}
        {status === 'success' && <p style={{ color: 'var(--color-success, #10B981)' }}>{message}</p>}
        {status === 'error' && <p style={{ color: 'var(--color-danger, #EF4444)' }}>{message}</p>}
        <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>{t('nav.login')}</Link>
      </div>
    </div>
  );
};

export default VerifyEmail;
