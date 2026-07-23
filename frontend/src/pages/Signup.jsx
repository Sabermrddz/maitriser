import React from 'react';
import { SignUp } from "@clerk/react";
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import BrandLogo from '../components/BrandLogo';
import '../styles/pagesStyle/login.css';
import '../styles/teal-theme.css';

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

const Signup = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('signup.title'));
  return (
    <div className="login-page page-teal">
      <div className="login-card">
        <div className="login-brand">
          <BrandLogo width={48} height={30} />
          <h1 className="login-brand-name brand-name">MAITRISEZ</h1>
        </div>

        <div className="login-form">
          <SignUp fallbackRedirectUrl="/dashboard" afterSignUpUrl="/discipline-picker" signInUrl="/login" appearance={CLERK_APPEARANCE} />
        </div>
      </div>
    </div>
  );
};

export default Signup;