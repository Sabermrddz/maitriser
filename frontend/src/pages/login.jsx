import React, { useEffect, useState, useRef } from 'react';
import { SignIn, useAuth } from "@clerk/react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/login.css';

const Login = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('login.title'));
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const userId = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
    if (userId) {
      navigate('/dashboard', { replace: true });
    } else {
      setWaiting(true);
      pollCountRef.current = 0;
      const interval = setInterval(() => {
        pollCountRef.current++;
        const uid = (() => { try { return localStorage.getItem('userId'); } catch { return null; } })();
        if (uid) {
          clearInterval(interval);
          navigate('/dashboard', { replace: true });
        } else if (pollCountRef.current >= 20) {
          clearInterval(interval);
          setWaiting(false);
          setSyncFailed(true);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) return (
    <div className="login-page page-teal">
      <div className="login-loading">{t('loading')}</div>
    </div>
  );

  if (isSignedIn && waiting) {
    return (
      <div className="login-page page-teal">
        <div className="login-container login-sync-container">
          <div className="login-sync-inner">
            <p>{t('login.syncing')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn && syncFailed) {
    return (
      <div className="login-page page-teal">
        <div className="login-container login-sync-container">
          <div className="login-sync-inner">
            <p>{t('login.syncFailed')}</p>
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => { setSyncFailed(false); navigate('/login', { replace: true }); }}>{t('login.retry')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <div className="login-page page-teal">
      <div className="login-container">
        <div className="login-form" role="main" aria-label={t('login.title')}>
          <SignIn signUpUrl="/signup" afterSignInUrl="/login" />
          <p style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('forgot.backToLogin')}</a>
          </p>
        </div>
        <div className="vertical-line"></div>
        <div className="description">
          <h2>{t('login.title')}</h2>
          <p>{t('login.subtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
