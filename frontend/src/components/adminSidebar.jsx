import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FaHome, FaClipboardList, FaUsers, FaLayerGroup, FaMicrophone, FaComment, FaDollarSign, FaGraduationCap, FaFilePdf, FaImage, FaSun, FaMoon, FaGlobe, FaSignOutAlt, FaUser, FaChevronLeft } from "react-icons/fa";
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useClerk } from "@clerk/react";
import AnimatedList from './AnimatedList';
import BrandLogo from './BrandLogo';
import "../styles/sidebar.css";

const Sidebar = ({ sidebarOpen, toggleSidebar }) => {
  const play = useSound();
  const { t, lang, setLang } = useTranslation();
  const { darkMode, toggleDarkMode } = useTheme();
  const clerk = useClerk();
  const navigate = useNavigate();

  const userRole = (() => { try { return localStorage.getItem('userRole'); } catch { return null; } })();
  const userName = (() => { try { return localStorage.getItem('userName'); } catch { return ''; } })();

  const handleLogout = () => {
    clerk.signOut();
    try { localStorage.removeItem('userId'); } catch {}
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-logo" onClick={() => { play('navigate'); navigate('/admin/dashboard'); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play('navigate'); navigate('/admin/dashboard'); } }}>
          <BrandLogo width={34} height={22} />
          <span className="sidebar-text">MAITRISEZ</span>
        </div>
        <button className="sidebar-toggle-btn" onClick={() => { play('navigate'); toggleSidebar(); }} aria-label={sidebarOpen ? t('nav.collapse') : t('nav.expand')}>
          <FaChevronLeft />
        </button>
      </div>

      <nav>
        <AnimatedList
          items={[
            { label: t('admin.sidebar.dashboard'), path: '/admin/dashboard', icon: <FaHome /> },
            { label: t('admin.sidebar.modules'), path: '/admin/module-management', icon: <FaLayerGroup /> },
            { label: t('admin.sidebar.quizzes'), path: '/admin/quiz-management', icon: <FaClipboardList /> },
            { label: t('admin.sidebar.users'), path: '/admin/user-management', icon: <FaUsers /> },
            { label: t('admin.sidebar.mockExams'), path: '/admin/mock-exam-management', icon: <FaGraduationCap /> },

            { label: t('admin.sidebar.voiceExams'), path: '/admin/voice-exam-management', icon: <FaMicrophone /> },
            { label: t('admin.sidebar.feedback'), path: '/admin/feedback', icon: <FaComment /> },
            { label: t('admin.sidebar.pricing'), path: '/admin/pricing', icon: <FaDollarSign /> },
            { label: t('admin.sidebar.pdfs'), path: '/admin/pdfs', icon: <FaFilePdf /> },
            { label: t('admin.sidebar.images'), path: '/admin/images', icon: <FaImage /> },
          ]}
          onItemSelect={(item) => { play('navigate'); navigate(item.path); }}
          renderItem={(item, index, isSelected) => (
            <NavLink to={item.path} className={isSelected ? 'active' : ''} onClick={() => play('navigate')}>
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-text">{item.label}</span>
            </NavLink>
          )}
          showGradients={false}
          enableArrowNavigation={false}
          displayScrollbar={false}
          className="animated-list-sidebar"
        />
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { play('navigate'); navigate('/admin/profile'); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play('navigate'); navigate('/admin/profile'); } }}>
          <div className="sidebar-user-avatar"><FaUser /></div>
          <div className="sidebar-text">
            <div className="sidebar-user-name">{userName || t('topbar.user')}</div>
            <div className="sidebar-user-role">{t('nav.admin')}</div>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-action-btn" onClick={toggleDarkMode} title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button className="sidebar-action-btn" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} title={t('nav.language')}>
            <FaGlobe />
          </button>
          <button className="sidebar-action-btn" onClick={handleLogout} title={t('nav.logout')}>
            <FaSignOutAlt />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
