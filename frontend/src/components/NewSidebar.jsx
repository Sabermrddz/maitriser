import { NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaFileMedical, FaStethoscope, FaChartBar, FaCog, FaUserShield, FaSun, FaMoon, FaGlobe, FaSignOutAlt, FaUser, FaChevronLeft } from "react-icons/fa";
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useClerk } from "@clerk/react";
import AnimatedList from './AnimatedList';
import BrandLogo from './BrandLogo';
import { ECOS_YEARS } from '../constants';
import "../styles/userDashboard.css";

const NewSidebar = ({ sidebarOpen, toggleSidebar }) => {
  const play = useSound();
  const { t, lang, setLang } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const clerk = useClerk();
  const navigate = useNavigate();

  const userDiscipline = (() => { try { return localStorage.getItem('userDiscipline'); } catch { return null; } })();
  const userYear = (() => { try { return localStorage.getItem('userYear'); } catch { return null; } })();
  const userRole = (() => { try { return localStorage.getItem('userRole'); } catch { return null; } })();
  const userName = (() => { try { return localStorage.getItem('userName'); } catch { return ''; } })();

  const handleLogout = () => {
    clerk.signOut();
    try { localStorage.removeItem('userId'); } catch {}
    navigate('/login');
  };

  return (
    <aside className={`dash-sidebar${sidebarOpen ? '' : ' collapsed'}`}>
      <div className="dash-sidebar-header">
        <div className="dash-logo-area" onClick={() => { play('navigate'); navigate('/dashboard'); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play('navigate'); navigate('/dashboard'); } }}>
          <BrandLogo width={38} height={24} />
          <span className="dash-logo-text brand-name">MAITRISEZ</span>
        </div>
        <button className="dash-toggle-btn" onClick={() => { play('navigate'); toggleSidebar(); }} aria-label={sidebarOpen ? t('nav.collapse') : t('nav.expand')}>
          <FaChevronLeft />
        </button>
      </div>

      <nav className="dash-sidebar-nav">
        <AnimatedList
          items={[
            { label: t('nav.home'), path: '/dashboard', icon: <FaHome /> },
            { label: t('nav.qcmExams'), path: '/quizPage', icon: <FaFileMedical /> },
            ...(userDiscipline === 'medicine' && ECOS_YEARS.includes(userYear)
              ? [{ label: t('nav.ecos'), path: '/voice-exams', icon: <FaStethoscope /> }]
              : []),
            { label: t('nav.stats'), path: '/review', icon: <FaChartBar /> },
            { label: t('nav.settings'), path: '/profile', icon: <FaCog /> },
            ...(userRole === 'admin'
              ? [{ label: t('nav.adminPanel'), path: '/admin/dashboard', icon: <FaUserShield /> }]
              : []),
          ]}
          onItemSelect={(item) => { play('navigate'); navigate(item.path); }}
          renderItem={(item, index, isSelected) => (
            <NavLink to={item.path} end className={`dash-nav-item${isSelected ? ' active' : ''}`}>
              <i>{item.icon}</i>
              <span className="dash-nav-text">{item.label}</span>
            </NavLink>
          )}
          showGradients={false}
          enableArrowNavigation={false}
          displayScrollbar={false}
          className="animated-list-sidebar"
        />
      </nav>

      <div className="dash-sidebar-footer">
        <div className="dash-user-summary" onClick={() => { play('navigate'); navigate('/profile'); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play('navigate'); navigate('/profile'); } }}>
          <div className="dash-user-avatar">
            <FaUser />
          </div>
          <div className="dash-user-meta">
            <span className="dash-user-name">{userName || t('topbar.user')}</span>
            <span className="dash-user-role">{userRole === 'admin' ? t('nav.admin') : t('nav.student')}</span>
          </div>
        </div>

        <div className="dash-sidebar-actions" style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <button className="dash-sidebar-action" onClick={toggleDarkMode} title={darkMode ? t('nav.lightMode') : t('nav.darkMode')} style={{ width: 'auto', padding: '6px 8px', justifyContent: 'center' }}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button className="dash-sidebar-action" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} title={t('nav.language')} style={{ width: 'auto', padding: '6px 8px', justifyContent: 'center' }}>
            <FaGlobe />
          </button>
          <button className="dash-sidebar-action" onClick={handleLogout} title={t('nav.logout')} style={{ width: 'auto', padding: '6px 8px', justifyContent: 'center' }}>
            <FaSignOutAlt />
          </button>
        </div>

        <div className="dash-premium-box">
          <h4>{t('nav.premium')}</h4>
          <p>{t('nav.premium.desc')}</p>
          <button className="dash-premium-btn" onClick={() => { play('navigate'); navigate('/pricing'); }}>{t('nav.premium.cta')}</button>
        </div>
      </div>
    </aside>
  );
};

export default NewSidebar;
