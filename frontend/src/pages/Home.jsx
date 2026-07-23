import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import HomeHero from '../components/HomeHero';
import FeatureStrip from '../components/FeatureStrip';
import EcosSection from '../components/EcosSection';
import PricingSection from '../components/PricingSection';
import FaqSection from '../components/FaqSection';
import FinalCtaSection from '../components/FinalCtaSection';
import { useTranslation } from '../context/LanguageContext';
import '../styles/pagesStyle/Home.css';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  useDocumentTitle(t('landing.title'));

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing-root">
      <HomeHero />

      <FeatureStrip />
      <EcosSection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />

      <footer className="landing-footer">
        <div className="landing-footer-links">
          <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>{t('landing.footer.terms')}</a>
          <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>{t('landing.footer.privacy')}</a>
        </div>
        <span>{t('landing.footer.copyright')}</span>
      </footer>
    </div>
  );
}