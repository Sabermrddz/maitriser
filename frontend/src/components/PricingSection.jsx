import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const Tick = ({ color }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M3 8.5L6.2 12L13 4" stroke={color || 'var(--mint-cream)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PricingSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const plans = [
    {
      key: 'solo',
      highlight: false,
      badge: null,
      features: ['landing.pricing.solo.feature.1', 'landing.pricing.solo.feature.2', 'landing.pricing.solo.feature.3'],
      tickColor: 'var(--mint-cream)',
    },
    {
      key: 'clinique',
      highlight: true,
      badge: 'landing.pricing.clinique.badge',
      features: ['landing.pricing.clinique.feature.1', 'landing.pricing.clinique.feature.2', 'landing.pricing.clinique.feature.3', 'landing.pricing.clinique.feature.4'],
      tickColor: 'var(--accent)',
    },
    {
      key: 'faculte',
      highlight: false,
      badge: null,
      features: ['landing.pricing.faculte.feature.1', 'landing.pricing.faculte.feature.2', 'landing.pricing.faculte.feature.3'],
      tickColor: 'var(--mint-cream)',
    },
  ];

  return (
    <section className="landing-pricing" id="tarifs">
      <div className="landing-section-head reveal">
        <h2>{t('landing.pricing.title')}</h2>
        <p>{t('landing.pricing.desc')}</p>
      </div>

      <div className="landing-pricing-grid">
        {plans.map((plan) => (
          <div className={`landing-plan${plan.highlight ? ' highlight' : ''} reveal`} key={plan.key}>
            {plan.badge && <span className="landing-plan-badge">{t(plan.badge)}</span>}
            <span className="landing-plan-name">{t(`landing.pricing.${plan.key}.name`)}</span>
            <div className="landing-plan-price" style={plan.key === 'faculte' ? { fontSize: 26 } : undefined}>
              {t(`landing.pricing.${plan.key}.price`)}
              {plan.key !== 'faculte' && <span>{t('landing.pricing.perMonth')}</span>}
            </div>
            <p className="landing-plan-desc">{t(`landing.pricing.${plan.key}.desc`)}</p>
            <ul className="landing-plan-features">
              {plan.features.map((f, i) => (
                <li key={i}><Tick color={plan.tickColor} /> {t(f)}</li>
              ))}
            </ul>
            <button className="landing-plan-cta" onClick={() => navigate(plan.key === 'faculte' ? '/contact' : '/signup')}>
              {t(`landing.pricing.${plan.key}.cta`)}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
