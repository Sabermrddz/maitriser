import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import BrandLogo from './BrandLogo';

export default function Header() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t, lang, setLang } = useTranslation();
  const play = useSound();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const linkClass = ({ isActive }) => `header-link ${isActive ? 'active' : ''}`;

  return (
    <nav className="header-nav" role="navigation" aria-label="Navigation principale" ref={menuRef}>
      <NavLink to="/" onClick={() => play('navigate')} className="header-logo" aria-label="Accueil MAITRISEZ">
        <BrandLogo width={36} height={23} />
      </NavLink>

        <button className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={isMenuOpen}>
        {isMenuOpen ? '✖' : '☰'}
      </button>

      <div className={`header-links ${isMenuOpen ? 'header-links--open' : ''}`}>
        <NavLink to="/" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className={linkClass}>{t('nav.home')}</NavLink>
        <NavLink to="/about" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className={linkClass}>{t('nav.about')}</NavLink>
        <NavLink to="/help" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className={linkClass}>{t('nav.help')}</NavLink>
        <NavLink to="/contact" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className={linkClass}>{t('nav.contact')}</NavLink>
        <div className="header-actions-mobile">
          <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="header-btn-lang" title={t('nav.language')} aria-label={t('nav.language')}>
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
          <button onClick={toggleDarkMode} className="header-btn-theme" title={darkMode ? t('nav.lightMode') : t('nav.darkMode')} aria-label={darkMode ? t('nav.lightMode') : t('nav.darkMode')}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <NavLink to="/login" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className="btn-secondary" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.login')}</NavLink>
          <NavLink to="/signup" onClick={() => { play('navigate'); setIsMenuOpen(false); }} className="btn-dark" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.signup')}</NavLink>
        </div>
      </div>

      <div className="header-actions">
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="header-btn-lang" title={t('nav.language')} aria-label={t('nav.language')}>
          {lang === 'fr' ? 'EN' : 'FR'}
        </button>
        <button onClick={toggleDarkMode} className="header-btn-theme" title={darkMode ? t('nav.lightMode') : t('nav.darkMode')} aria-label={darkMode ? t('nav.lightMode') : t('nav.darkMode')}>
          {darkMode ? '☀️' : '🌙'}
        </button>
        <NavLink to="/login" onClick={() => play('navigate')}><button className="btn-secondary" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.login')}</button></NavLink>
        <NavLink to="/signup" onClick={() => play('navigate')}><button className="btn-dark" style={{ padding: '8px 20px', minHeight: 'auto' }}>{t('nav.signup')}</button></NavLink>
      </div>
    </nav>
  );
}
