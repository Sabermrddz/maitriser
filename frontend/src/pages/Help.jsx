import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/pagesStyle/help.css';
import '../styles/teal-theme.css';

const Icon = ({ children }) => (
  <span className="help-icon">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  </span>
);

const HelpPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('help.title'));

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card-teal" style={{ maxWidth: '720px', width: '100%' }}>
        <h1 className="help-heading">{t('help.title')}</h1>

        <div className="help-section">
          <h2><Icon><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></Icon>{t('help.getStarted')}</h2>
          <p>{t('help.getStarted.text')}</p>
        </div>

        <div className="help-section">
          <h2><Icon><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>{t('help.mcqs')}</h2>
          <p>{t('help.mcqs.text')}</p>
        </div>

        <div className="help-section">
          <h2><Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Icon>{t('help.mockExam')}</h2>
          <p>{t('help.mockExam.text')}</p>
        </div>

        <div className="help-section">
          <h2><Icon><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></Icon>{t('help.oralExam')}</h2>
          <p>{t('help.oralExam.text')}</p>
        </div>


        <div className="help-section">
          <h2><Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>{t('help.feedback')}</h2>
          <p>{t('help.feedback.text')}</p>
        </div>

        <div className="help-section help-faq">
          <h2><Icon><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></Icon>{t('help.faq')}</h2>
          <ul>
            <li>
              <q>{t('help.faq.q1')}</q>
              <p>{t('help.faq.a1')}</p>
            </li>
            <li>
              <q>{t('help.faq.q2')}</q>
              <p>{t('help.faq.a2')} <a href="mailto:support@maitrisez.com">support@maitrisez.com</a></p>
            </li>
            <li>
              <q>{t('help.faq.q3')}</q>
              <p>{t('help.faq.a3')}</p>
            </li>
          </ul>
        </div>

        <div className="help-section">
          <h2><Icon><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Icon>{t('help.contact')}</h2>
          <p>{t('help.contact.text')} <a href="mailto:support@maitrisez.com">support@maitrisez.com</a>.</p>
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>{t('help.contact.feedbackHint')}</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
