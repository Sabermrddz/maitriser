import React, { useEffect, useState, useRef } from 'react';
import { SignIn, useAuth } from "@clerk/react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import BrandLogo from '../components/BrandLogo';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/login.css';

const CLERK_APPEARANCE = {
  elements: {
    rootBox: { display: 'flex', justifyContent: 'center', width: '100%' },
    card: { boxShadow: 'none', border: 'none', background: 'transparent' },
    headerTitle: { display: 'none' },
    headerSubtitle: { display: 'none' },
    socialButtonsBlockButton: { border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '10px', padding: '10px 16px', backgroundColor: 'var(--card-bg, #fff)', color: 'var(--text-primary, #1a202c)' },
    socialButtonsBlockButtonText: { fontWeight: '500' },
    dividerLine: { backgroundColor: 'var(--border-light, #e2e8f0)' },
    dividerText: { color: 'var(--text-muted, #718096)', fontSize: '0.85rem' },
    formFieldLabel: { fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-primary, #1a202c)' },
    formFieldInput: { borderRadius: '10px', border: '1px solid var(--border-light, #e2e8f0)', padding: '11px 14px', fontSize: '0.95rem', backgroundColor: 'var(--card-bg, #fff)', color: 'var(--text-primary, #1a202c)' },
    formButtonPrimary: { backgroundColor: 'var(--teal-dark, #04484F)', borderRadius: '10px', padding: '12px', fontSize: '0.95rem', textTransform: 'none', boxShadow: 'none', fontWeight: '600' },
    footerAction: { marginTop: '8px' },
    footerActionLink: { color: 'var(--teal-dark, #04484F)', fontSize: '0.9rem' },
    badge: { display: 'none' },
  },
};

const BrandHeader = () => (
  <div className="login-brand">
    <BrandLogo width={48} height={30} />
    <h1 className="login-brand-name brand-name">MAITRISEZ</h1>
  </div>
);

const Login = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('login.title'));
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conflict] = useState(() => searchParams.get('conflict') === '1');
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

  if (isSignedIn && syncFailed) {
    return (
      <div className="login-page page-teal">
        <div className="login-card">
          <BrandHeader />
          <p className="login-status-text login-status-error">{t('login.syncFailed')}</p>
          <button className="btn-primary" onClick={() => { setSyncFailed(false); navigate('/login', { replace: true }); }}>
            {t('login.retry')}
          </button>
        </div>
      </div>
    );
  }

  if (isSignedIn && waiting) {
    return (
      <div className="login-page page-teal">
        <div className="login-card">
          <BrandHeader />
          <div className="login-loader" />
          <p className="login-status-text">{t('login.syncing')}</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) return null;

  return (
    <div className="login-page page-teal">
      <div className="login-card">
        {conflict && (
          <div className="login-conflict">
            {t('login.sessionConflict')}
          </div>
        )}

        <BrandHeader />

        <div className="login-form" role="main" aria-label={t('login.title')}>
          <SignIn signUpUrl="/signup" afterSignInUrl="/dashboard" appearance={CLERK_APPEARANCE} />
          <p className="login-forgot">
            <a href="/forgot-password">{t('login.forgotPassword')}</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;