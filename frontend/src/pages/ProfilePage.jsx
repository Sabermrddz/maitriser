import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/teal-theme.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

function calcStreak(results) {
  if (!results.length) return 0;
  const dayMap = {};
  for (const r of results) {
    const day = new Date(r.timestamp).toDateString();
    dayMap[day] = Math.max(dayMap[day] || 0, r.score);
  }
  const days = Object.keys(dayMap).sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  for (const day of days) {
    if (dayMap[day] === 1) streak++;
    else break;
  }
  return streak;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  useDocumentTitle(t('profile.title'));
  const notify = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [userId, setUserId] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [results, setResults] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [originalDiscipline, setOriginalDiscipline] = useState('');
  const [originalYear, setOriginalYear] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchUser(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setStatsLoading(true);
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/results/${userId}?limit=200`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setResults(data.data || []);
        }
      } catch (err) {
        if (!cancelled) logger.error({ err }, 'ProfilePage fetchResults failed');
      }
      if (!cancelled) setStatsLoading(false);
    })();
    (async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
        if (!cancelled && res.ok) { const d = await res.json(); setSubscription(d.subscription); }
      } catch { if (!cancelled) logger.error({}, 'ProfilePage fetchSubscription failed') }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const fetchUser = async (signal) => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, { signal });
      if (res.ok) {
        const data = await res.json();
        setName(data.user?.name || '');
        setEmail(data.user?.email || '');
        setDiscipline(data.user?.discipline || '');
        setYear(data.user?.year || '');
        setUserId(data.user?.userId || '');
        setOriginalDiscipline(data.user?.discipline || '');
        setOriginalYear(data.user?.year || '');
      } else {
        notify(t('profile.error'), 'error');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error({ err }, 'ProfilePage fetchUser failed');
      notify(t('profile.error'), 'error');
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) return notify(t('profile.nameRequired'), 'warning');

    const subActive = subscription?.status === 'active';
    const yearChanged = year !== '' && Number(year) !== Number(originalYear);
    const discChanged = discipline !== '' && discipline !== originalDiscipline;

    if (subActive && (yearChanged || discChanged)) {
      setShowConfirmModal(true);
      return;
    }

    await doSaveProfile();
  };

  const doSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        body: { name: name.trim(), email: email.trim(), discipline, year: year === '' ? null : Number(year) },
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) {
        notify(t('profile.saved'), 'success');
        if (data?.user) { setName(data.user.name); setEmail(data.user.email); setDiscipline(data.user.discipline || ''); setYear(data.user.year || ''); setOriginalDiscipline(data.user.discipline || ''); setOriginalYear(data.user.year || ''); }
        try { localStorage.setItem('userDiscipline', data?.user?.discipline || ''); } catch {}
        try { localStorage.setItem('userYear', data?.user?.year || ''); } catch {}
        if (subscription?.status === 'active') {
          setSubscription((prev) => ({ ...prev, status: 'expired' }));
        }
      } else notify(data?.message || t('profile.error'), 'error');
    } catch (err) { logger.error({ err }, 'ProfilePage save failed'); notify(t('profile.error'), 'error'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return notify(t('profile.fillAllFields'), 'warning');
    if (newPassword.length < 6) return notify(t('profile.passwordMinLength'), 'warning');
    if (newPassword !== confirmPassword) return notify(t('profile.pwdMismatch'), 'warning');
    setChangingPwd(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/change-password`, {
        method: 'PUT',
        body: { currentPassword, newPassword },
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) { notify(t('profile.pwdChanged'), 'success'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }
      else notify(data?.message || t('profile.error'), 'error');
    } catch (err) { logger.error({ err }, 'ProfilePage changePassword failed'); notify(t('profile.error'), 'error'); }
    finally { setChangingPwd(false); }
  };

  const stats = useMemo(() => {
    const total = results.length;
    const correct = results.filter((r) => r.score === 1).length;
    const pct = total > 0 ? (correct / total * 100).toFixed(1) : 0;
    return { total, correct, percentage: pct, streak: calcStreak(results) };
  }, [results]);

  const trendData = useMemo(() => {
    const sorted = [...results].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const last = sorted.slice(-20);
    return {
      labels: last.map((_, i) => `#${i + 1}`),
      datasets: [{
        label: 'Accuracy',
        data: last.map((r) => r.score * 100),
        borderColor: '#3BB8B0',
        backgroundColor: 'rgba(59, 184, 176, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: last.map((r) => r.score === 1 ? '#3BB8B0' : '#EF4444'),
      }],
    };
  }, [results]);

  const moduleData = useMemo(() => {
    const map = {};
    results.forEach((r) => {
      const name = r.quizId?.moduleId?.name || 'Unknown';
      if (!map[name]) map[name] = { total: 0, correct: 0 };
      map[name].total++;
      if (r.score === 1) map[name].correct++;
    });
    const entries = Object.entries(map)
      .map(([name, v]) => ({ name, accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 }))
      .sort((a, b) => b.accuracy - a.accuracy);
    return {
      labels: entries.map((e) => e.name),
      datasets: [{
        label: 'Accuracy %',
        data: entries.map((e) => e.accuracy),
        backgroundColor: entries.map((e) =>
          e.accuracy >= 70 ? 'rgba(59, 184, 176, 0.75)' :
          e.accuracy >= 50 ? 'rgba(234, 179, 8, 0.75)' :
          'rgba(239, 68, 68, 0.75)'
        ),
        borderRadius: 4,
      }],
    };
  }, [results]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}%` } },
    },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, color: 'var(--dc-text-muted)', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { ticks: { color: 'var(--dc-text-muted)', font: { size: 10 } }, grid: { display: false } },
    },
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x}%` } },
    },
    scales: {
      x: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, color: 'var(--dc-text-muted)', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
      y: { ticks: { color: 'var(--dc-text)', font: { size: 11 } }, grid: { display: false } },
    },
  };

  if (loading) return <div className="page-teal"><div className="card-teal profile-loading">{t('loading')}</div></div>;

  return (
    <div className="page-teal">
      <div className="card-teal profile-card">
        <h2 className="profile-heading">{t('profile.title')}</h2>

        <label className="profile-label">{t('profile.name')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.discipline')}</label>
        <select value={discipline} onChange={(e) => setDiscipline(e.target.value)} className="profile-input">
          <option value="">{t('profile.discipline.none')}</option>
          <option value="medicine">{t('profile.discipline.medicine')}</option>
          <option value="pharmacy">{t('profile.discipline.pharmacy')}</option>
        </select>

        <label className="profile-label">{t('profile.year')}</label>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="profile-input">
          <option value="">{t('profile.discipline.none')}</option>
          {[1,2,3,4,5,6,7].map(y => <option key={y} value={y}>{t('profile.year.nth', { n: y })}</option>)}
        </select>

        <button className="btn-primary profile-btn" onClick={handleSaveProfile} disabled={saving}>
          {saving ? t('profile.saving') : t('profile.save')}
        </button>

        <h3 className="profile-heading">{t('profile.passwordTitle')}</h3>

        <label className="profile-label">{t('profile.currentPwd')}</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.newPwd')}</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="profile-input" />

        <label className="profile-label">{t('profile.confirmPwd')}</label>
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="profile-input" />

        <button className="btn-primary profile-btn" onClick={handleChangePassword} disabled={changingPwd}>
          {changingPwd ? t('profile.saving') : t('profile.changePwd')}
        </button>
      </div>

      {subscription && (
        <div className="card-teal profile-sub-card">
          <div className="profile-sub-header">
            <span className="profile-sub-icon">{subscription.status === 'active' ? '⭐' : '🔓'}</span>
            <h3 className="profile-sub-title">{subscription.status === 'active' ? t('profile.subscription.my') : t('profile.subscription.none')}</h3>
          </div>
          {subscription.status === 'active' ? (
            <>
              <div className="profile-sub-row"><span className="profile-sub-label">{t('profile.subscription.plan')}</span><span className="profile-sub-value">{subscription.planName || '—'}</span></div>
              <div className="profile-sub-row"><span className="profile-sub-label">{t('profile.subscription.status')}</span><span className="profile-sub-badge active">{t('profile.subscription.active')}</span></div>
              <div className="profile-sub-row"><span className="profile-sub-label">{t('profile.subscription.expires')}</span><span className="profile-sub-value">{subscription.endDate ? formatDate(subscription.endDate, lang) : '—'}</span></div>
            </>
          ) : (
            <p className="profile-sub-desc">{t('profile.subscription.desc')}</p>
          )}
          <button className="btn-primary profile-btn" onClick={() => navigate('/pricing')}>{t('profile.subscription.viewPlans')}</button>
        </div>
      )}
      <ConfirmModal
        open={showConfirmModal}
        title={t('profile.confirmCancelTitle') || 'Cancel Subscription?'}
        message={t('profile.confirmCancelMsg') || 'Changing your year or discipline will cancel your current subscription. Continue?'}
        confirmText={t('profile.confirmCancelYes') || 'Yes, continue'}
        cancelText={t('profile.confirmCancelNo') || 'Cancel'}
        onConfirm={() => { setShowConfirmModal(false); doSaveProfile(); }}
        onCancel={() => setShowConfirmModal(false)}
      />
      {!statsLoading && (
        <div className="card-teal" style={{ maxWidth: 560, margin: '24px auto 0', padding: 24 }}>
          <h2 className="profile-heading">📊 {t('profile.progress.title')}</h2>

          <div className="dashboard-stats" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">{t('profile.progress.quizzesTaken')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.correct}</div>
              <div className="stat-label">{t('profile.progress.correct')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: stats.percentage >= 70 ? '#3BB8B0' : stats.percentage >= 50 ? '#eab308' : '#ef4444' }}>
                {stats.percentage}%
              </div>
              <div className="stat-label">{t('profile.progress.accuracy')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#e67e22' }}>{stats.streak}</div>
              <div className="stat-label">{t('profile.progress.streak')}</div>
            </div>
          </div>

          {results.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0 24px' }}>
              {t('profile.progress.empty')}
            </p>
          )}

          {trendData.labels.length > 1 && (
            <div style={{ height: 220, marginBottom: 28 }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dc-text)', marginBottom: 8 }}>{t('profile.progress.trendTitle')}</p>
              <Line data={trendData} options={lineOptions} />
            </div>
          )}

          {moduleData.labels.length > 0 && (
            <div style={{ height: Math.max(140, moduleData.labels.length * 36) }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dc-text)', marginBottom: 8 }}>{t('profile.progress.moduleTitle')}</p>
              <Bar data={moduleData} options={barOptions} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;