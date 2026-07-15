import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../config/api';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';

const DisciplinePicker = () => {
  const navigate = useNavigate();
  const notify = useToast();
  const { t } = useTranslation();
  useDocumentTitle(t('disciplinePicker.welcome'));
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(true);

  const disciplines = [
    { value: 'medicine', label: t('disciplinePicker.medicine.label'), icon: '🩺', description: t('disciplinePicker.medicine.desc') },
    { value: 'pharmacy', label: t('disciplinePicker.pharmacy.label'), icon: '💊', description: t('disciplinePicker.pharmacy.desc') },
  ];

  useEffect(() => {
    const check = () => {
      try { if (localStorage.getItem('userId')) { setSyncing(false); return; } } catch { setSyncing(false); return; }
      setTimeout(check, 500);
    };
    check();
  }, []);

  const handleSelect = async (discipline) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users/profile`, {
        method: 'PUT',
        body: { discipline },
      });
      if (res.ok) {
        try { localStorage.setItem('userDiscipline', discipline); } catch { /* incognito */ }
        navigate('/dashboard');
      } else {
        const d = await res.json().catch((err) => { logger.error({ err }, 'Failed to parse JSON'); return {}; });
        notify(d.message || t('error'), 'error');
      }
    } catch (err) {
      logger.error({ err }, 'DisciplinePicker failed');
      notify(t('disciplinePicker.networkError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (syncing) {
    return (
      <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}>
        <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 18 }}>{t('disciplinePicker.syncing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-teal" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
      <div className="card-teal" style={{ maxWidth: 600, width: '100%', padding: 40 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>{t('disciplinePicker.welcome')}</h2>
        <p style={{ textAlign: 'center', color: 'var(--dc-text-muted)', marginBottom: 28 }}>
          {t('disciplinePicker.subtitle')}
        </p>
        <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
          {disciplines.map((d) => (
            <button
              key={d.value}
              onClick={() => handleSelect(d.value)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px',
                border: '2px solid var(--border-light, #ddd)', borderRadius: 12,
                background: 'var(--card-bg, #fff)', cursor: 'pointer', textAlign: 'left',
                fontSize: 16, transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal, #04484F)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light, #ddd)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 36 }}>{d.icon}</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.label}</div>
                <div style={{ fontSize: 13, color: 'var(--dc-text-muted)' }}>{d.description}</div>
              </div>
            </button>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--dc-text-muted)', fontSize: 12, marginTop: 20 }}>
          {t('disciplinePicker.hint')}
        </p>
      </div>
    </div>
  );
};

export default DisciplinePicker;
