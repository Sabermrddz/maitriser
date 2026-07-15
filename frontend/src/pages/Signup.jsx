import React from 'react';
import { SignUp } from "@clerk/react";
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/pagesStyle/login.css';
import '../styles/teal-theme.css';

const Signup = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('signup.title'));
  return (
    <div className="login-page page-teal">
      <div className="login-container">
        <div className="login-form">
          <SignUp fallbackRedirectUrl="/dashboard" afterSignUpUrl="/discipline-picker" signInUrl="/login"
            appearance={{
              elements: {
                card: { boxShadow: 'none', width: '100%' },
                headerTitle: { display: 'none' },
                headerSubtitle: { display: 'none' },
              },
            }}
          />
        </div>
        <div className="vertical-line"></div>
        <div className="description">
          <h2>{t('signup.title')}</h2>
          <p>{t('signup.subtitle')}</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
