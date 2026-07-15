import React from 'react';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/teal-theme.css';
import '../styles/pagesStyle/legal.css';

const PrivacyPage = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('privacy.title'));
  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card-teal legal-page">
        <h1 className="legal-heading">{t('privacy.title')}</h1>
        <p className="legal-updated">{t('privacy.lastUpdated')}</p>
        <p>{t('privacy.intro')}</p>

        <section className="legal-section">
          <h2>1. {t('privacy.dataTitle')}</h2>
          <p>{t('privacy.dataText')}</p>
        </section>

        <section className="legal-section">
          <h2>2. Utilisation des données</h2>
          <p>Vos données sont utilisées pour : vous fournir l'accès à la plateforme, suivre votre progression, améliorer nos services, et communiquer avec vous.</p>
        </section>

        <section className="legal-section">
          <h2>3. Partage des données</h2>
          <p>Nous ne partageons pas vos données personnelles avec des tiers, sauf obligation légale.</p>
        </section>

        <section className="legal-section">
          <h2>4. Conservation des données</h2>
          <p>Vos données sont conservées pendant la durée de votre compte. Après suppression du compte, les données anonymisées peuvent être conservées à des fins statistiques.</p>
        </section>

        <section className="legal-section">
          <h2>5. Vos droits (RGPD)</h2>
          <p>Vous avez le droit d'accéder, rectifier, exporter et supprimer vos données personnelles. Pour exercer ces droits, contactez-nous à support@maitrisez.com.</p>
        </section>

        <section className="legal-section">
          <h2>6. {t('privacy.cookiesTitle')}</h2>
          <p>{t('privacy.cookiesText')}</p>
        </section>

        <p>{t('privacy.contact')}</p>
      </div>
    </div>
  );
};

export default PrivacyPage;
