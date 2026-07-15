import React, { useState, useEffect } from "react";
import { authFetch } from '../config/authFetch';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Spinner from '../components/Spinner';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAdminWS } from '../hooks/useAdminWS';
import { logger } from '../utils/logger';
import '../styles/Dashboard.css';
import useDocumentTitle from '../utils/useDocumentTitle';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StatCard = ({ label, value, color }) => (
  <div className="stat-card">
    <h3>{label}</h3>
    <p>{value}</p>
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const { lastEvent, connected } = useAdminWS();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useDocumentTitle(t('admin.dashboard.title'), 'Admin');

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch('/api/dashboard-stats');
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      setStats(await response.json());
    } catch (error) {
      logger.error({ err: error }, 'Dashboard fetchDashboardStats failed');
      setError(t('admin.dashboard.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardStats(); }, []);

  useEffect(() => {
    if (lastEvent && ['quiz:submitted', 'user:signedUp', 'contact:new'].includes(lastEvent.type)) {
      fetchDashboardStats();
    }
  }, [lastEvent]);

  if (loading) return <div className="dashboard"><Spinner text={t('admin.dashboard.loading')} /></div>;

  if (error) return (
    <div className="dashboard" style={{ textAlign: 'center', paddingTop: 60 }}>
      <p style={{ color: 'var(--dc-highlight)', marginBottom: 16 }}>{error}</p>
      <button className="btn-primary" onClick={fetchDashboardStats}
        style={{ padding: '10px 24px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
        {t('admin.dashboard.retry')}
      </button>
    </div>
  );

  const chartColors = darkMode
    ? ['rgba(193, 255, 48, 0.7)', 'rgba(255, 82, 5, 0.7)', 'rgba(232, 241, 240, 0.7)',
       'rgba(4, 72, 79, 0.7)', 'rgba(193, 255, 48, 0.4)', 'rgba(255, 82, 5, 0.4)',
       'rgba(232, 241, 240, 0.4)']
    : ['rgba(4, 72, 79, 0.6)', 'rgba(193, 255, 48, 0.6)', 'rgba(255, 82, 5, 0.6)',
       'rgba(232, 241, 240, 0.6)', 'rgba(4, 72, 79, 0.3)', 'rgba(193, 255, 48, 0.3)',
       'rgba(255, 82, 5, 0.3)'];
  const chartBorders = chartColors.map(c => c.replace('0.7', '1').replace('0.6', '1').replace('0.4', '1').replace('0.3', '1'));

  const barData = {
    labels: [t('admin.dashboard.chartUsers'), t('admin.dashboard.chartQuizzes'), t('admin.dashboard.chartModules'), t('admin.dashboard.chartCases'), t('admin.dashboard.chartVoiceExams'), t('admin.dashboard.chartContacts')],
    datasets: [{
      label: t('admin.dashboard.chartCount'),
      data: [stats?.users ?? 0, stats?.quizzes ?? 0, stats?.modules ?? 0, stats?.cases ?? 0, stats?.voiceExams ?? 0, stats?.contacts ?? 0],
      backgroundColor: chartColors,
      borderColor: chartBorders,
      borderWidth: 1,
    }],
  };

  const passData = {
    labels: [t('admin.dashboard.chartPassRate')],
    datasets: [{
      label: '%',
      data: [stats?.passRate ?? 0],
      backgroundColor: [darkMode ? 'rgba(193, 255, 48, 0.7)' : 'rgba(4, 72, 79, 0.6)'],
      borderColor: [darkMode ? 'rgba(193, 255, 48, 1)' : 'rgba(4, 72, 79, 1)'],
      borderWidth: 1,
    }],
  };

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{t('admin.dashboard.title')}</h2>
        <span style={{
          display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
          background: connected ? 'var(--color-success)' : 'var(--dc-highlight)',
          transition: 'background 0.3s',
        }} title={connected ? t('admin.dashboard.live') : t('admin.dashboard.reconnecting')} />
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 14, color: 'var(--dc-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{t('admin.dashboard.usersExams')}</h3>
      <div className="stats-container">
        <StatCard label={t('admin.dashboard.users')} value={stats?.users ?? 0} />
        <StatCard label={t('admin.dashboard.quizAttempts')} value={stats?.attempts ?? 0} />
        <StatCard label={t('admin.dashboard.voiceResults')} value={stats?.voiceResults ?? 0} />
        <StatCard label={t('admin.dashboard.passRate')} value={`${stats?.passRate ?? 0}%`} />
      </div>

      <h3 style={{ margin: '20px 0 10px', fontSize: 14, color: 'var(--dc-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{t('admin.dashboard.content')}</h3>
      <div className="stats-container">
        <StatCard label={t('admin.dashboard.quizzes')} value={stats?.quizzes ?? 0} />
        <StatCard label={t('admin.dashboard.drafts')} value={stats?.drafts ?? 0} />
        <StatCard label={t('admin.dashboard.published')} value={stats?.published ?? 0} />
        <StatCard label={t('admin.dashboard.modules')} value={stats?.modules ?? 0} />
        <StatCard label={t('admin.dashboard.cases')} value={stats?.cases ?? 0} />
        <StatCard label={t('admin.dashboard.voiceExams')} value={stats?.voiceExams ?? 0} />
        <StatCard label={t('admin.dashboard.messages')} value={stats?.contacts ?? 0} />
      </div>

      <div className="chart-section">
        <div className="chart">
          <h3>{t('admin.dashboard.chartContent')}</h3>
          <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="chart">
          <h3>{t('admin.dashboard.chartPassRate')}</h3>
          <Bar data={passData} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100 } } }} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;