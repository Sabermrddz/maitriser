import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export default function LandingNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (sectionId) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToSection(sectionId), 100);
    } else {
      scrollToSection(sectionId);
    }
  };

  return (
    <nav className="landing-nav" ref={menuRef}>
      <a className="landing-brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} aria-label={t('landing.nav.home')}>
        <BrandLogo />
        <span>MAITRISEZ</span>
      </a>
      <button className="landing-mobile-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')} aria-expanded={menuOpen}>
        {menuOpen ? '✖' : '☰'}
      </button>
      <div className={`landing-nav-links${menuOpen ? ' landing-nav-links--open' : ''}`}>
        <button onClick={() => handleNav('comment-ca-marche')}>{t('landing.nav.qcm')}</button>
        <button onClick={() => handleNav('ecos')}>{t('landing.nav.ecos')}</button>
        <button onClick={() => handleNav('tarifs')}>{t('landing.nav.pricing')}</button>
        <button onClick={() => handleNav('faq')}>{t('landing.nav.faq')}</button>
        <div className="landing-nav-cta-mobile">
          <button className="landing-btn-ghost" onClick={() => { setMenuOpen(false); navigate('/login'); }}>{t('landing.nav.login')}</button>
          <button className="landing-btn-solid" onClick={() => { setMenuOpen(false); navigate('/signup'); }}>{t('landing.nav.trial')}</button>
        </div>
      </div>
      <div className="landing-nav-cta">
        <button className="landing-btn-ghost" onClick={() => navigate('/login')}>{t('landing.nav.login')}</button>
        <button className="landing-btn-solid" onClick={() => navigate('/signup')}>{t('landing.nav.trial')}</button>
      </div>
    </nav>
  );
}
