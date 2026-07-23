import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import BrandLogo from './BrandLogo';

const scrollToSection = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

const CurveNode = ({ cx, cy, label, labelPos, delay, r, fill }) => (
  <>
    <circle className="curve-node" style={{ animationDelay: `${delay}s` }} cx={cx} cy={cy} r={r || 4} fill={fill || 'var(--mint-cream)'} />
    <text className="curve-label" style={{ animationDelay: `${delay + 0.1}s` }} x={labelPos?.x || cx} y={labelPos?.y || cy + 30} textAnchor={labelPos?.anchor || 'middle'}>{label}</text>
  </>
);

export default function HomeHero() {
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
    <section className="landing-hero">
      <div className="landing-hero-top" ref={menuRef}>
        <a className="landing-brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} aria-label={t('landing.nav.home')}>
          <BrandLogo />
          <span className="brand-name">MAITRISEZ</span>
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
      </div>

      <h1 className="landing-h1">
        {t('landing.hero.heading.1')}<br />
        <span className="hl-accent">{t('landing.hero.heading.2')}</span><br />
        <span className="hl-accent">{t('landing.hero.heading.3')}</span>
      </h1>

      <p className="landing-hero-sub">
        {t('landing.hero.subtitle')}
      </p>

      <div className="landing-hero-actions">
        <button className="landing-btn-primary" onClick={() => navigate('/signup')}>
          {t('landing.hero.cta')}
        </button>
        <button className="landing-btn-secondary" onClick={() => {
          const el = document.getElementById('ecos');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}>
          <span className="landing-play-ring">
            <svg width="11" height="11" viewBox="0 0 10 10"><path d="M1 0.5 L9 5 L1 9.5 Z" fill="var(--mint-cream)" /></svg>
          </span>
          {t('landing.hero.secondary')}
        </button>
      </div>

      <div className="landing-curve-wrap">
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none" role="img" aria-label="Illustration : un tracé irrégulier de stress se transforme progressivement en courbe ascendante régulière de maîtrise.">
          <line x1="0" y1="220" x2="1200" y2="220" stroke="var(--mint-faint)" strokeWidth="1" />
          <path className="curve-path" style={{ stroke: 'var(--turf-green)' }}
            d="M0,220 L40,220 L58,150 L76,255 L94,140 L112,240 L130,160 L148,225 L172,225 L196,175 L220,235 L244,150 L268,220 C 340,205 400,150 460,140 C 560,124 640,150 720,108 C 820,58 940,44 1200,20" />
          <defs>
            <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="curve-fill" fill="url(#fillGrad)" d="M460,140 C560,124 640,150 720,108 C820,58 940,44 1200,20 L1200,220 L460,220 Z" />
          <CurveNode cx={150} cy={222} label={t('landing.curve.stress')} delay={2.4} labelPos={{ y: 252 }} />
          <CurveNode cx={460} cy={140} label={t('landing.curve.qcm')} delay={2.65} labelPos={{ y: 120 }} />
          <CurveNode cx={800} cy={70} label={t('landing.curve.ecos')} delay={2.9} labelPos={{ y: 48 }} />
          <CurveNode cx={1150} cy={24} label={t('landing.curve.mastery')} delay={3.15} labelPos={{ x: 1120, y: 46, anchor: 'end' }} r={5} fill="var(--accent)" />
        </svg>
      </div>
    </section>
  );
}