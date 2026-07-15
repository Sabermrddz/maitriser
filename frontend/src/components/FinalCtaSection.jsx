import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

export default function FinalCtaSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="landing-final-cta">
      <h2>{t('landing.cta.title')}</h2>
      <p>{t('landing.cta.desc')}</p>
      <button className="landing-btn-primary" onClick={() => navigate('/signup')}>
        {t('landing.cta.btn')}
      </button>
    </section>
  );
}
