import React from 'react';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import '../styles/pagesStyle/About.css';
import '../styles/teal-theme.css';

const AboutPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('about.title'));
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card-teal" style={{ maxWidth: '720px' }}>
        <h1 className="about-heading">{t('about.title')}</h1>
        <p className="about-paragraph">
          {t('about.intro')}
        </p>
        <h3 className="features-heading">{t('about.featuresTitle')}</h3>
        <ul className="features-list">
          <li>🎯 {t('about.feature1')}</li>
          <li>⏱️ {t('about.feature2')}</li>
          <li>📈 {t('about.feature3')}</li>
          <li>🧠 {t('about.feature4')}</li>
          <li>🔗 {t('about.feature5')}</li>
        </ul>
        <p className="about-paragraph">
          {t('about.mission')}
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
