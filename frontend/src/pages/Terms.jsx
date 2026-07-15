import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/legal.css';

const TermsPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('terms.title'));
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card-teal legal-page">
        <h1 className="legal-heading">{t('terms.title')}</h1>
        <p className="legal-updated">{t('terms.lastUpdated')}</p>
        <p>{t('terms.intro')}</p>

        <section className="legal-section">
          <h2>1. {t('terms.acceptance')}</h2>
          <p>{t('terms.acceptance')}</p>
        </section>

        <section className="legal-section">
          <h2>2. Description du service</h2>
          <p>MAITRISEZ est une plateforme éducative destinée aux étudiants en médecine, proposant des QCM, des examens oraux, des études de cas et des ressources documentaires.</p>
        </section>

        <section className="legal-section">
          <h2>3. {t('terms.accountTitle')}</h2>
          <p>{t('terms.accountText')}</p>
        </section>

        <section className="legal-section">
          <h2>4. {t('terms.contentTitle')}</h2>
          <p>{t('terms.contentText')}</p>
        </section>

        <section className="legal-section">
          <h2>5. Limitation de responsabilité</h2>
          <p>{t('terms.limitation')}</p>
        </section>

        <section className="legal-section">
          <h2>6. Contact</h2>
          <p>Pour toute question concernant ces conditions, contactez-nous à support@maitrisez.com.</p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
