import { useTranslation } from '../context/LanguageContext';

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.2 12L13 4" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function EcosSection() {
  const { t } = useTranslation();

  const items = [
    'landing.ecos.list.1',
    'landing.ecos.list.2',
    'landing.ecos.list.3',
  ];

  return (
    <section className="landing-ecos" id="ecos">
      <div className="landing-ecos-copy reveal">
        <h2>{t('landing.ecos.title')}</h2>
        <p>{t('landing.ecos.desc')}</p>
        <ul className="landing-ecos-list">
          {items.map((key, i) => (
            <li key={i}>
              <CheckIcon />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-ecos-card reveal">
        <div className="landing-ecos-card-top">
          <span>{t('landing.ecos.card.station')}</span>
          <span className="landing-ecos-timer">
            <span className="landing-ring-dot"></span> {t('landing.ecos.card.timer')}
          </span>
        </div>
        <div className="landing-ecos-patient">
          <span className="landing-ecos-label">{t('landing.ecos.card.vignette')}</span>
          <p>{t('landing.ecos.card.vignette.text')}</p>
        </div>
        <div className="landing-ecos-checklist">
          <div className="landing-check-row"><span className="landing-check-box done" /> {t('landing.ecos.card.item.1')}</div>
          <div className="landing-check-row"><span className="landing-check-box done" /> {t('landing.ecos.card.item.2')}</div>
          <div className="landing-check-row dim"><span className="landing-check-box" /> {t('landing.ecos.card.item.3')}</div>
          <div className="landing-check-row dim"><span className="landing-check-box" /> {t('landing.ecos.card.item.4')}</div>
        </div>
      </div>
    </section>
  );
}
