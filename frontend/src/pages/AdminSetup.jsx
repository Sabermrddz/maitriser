import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@clerk/react";
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import '../styles/adminLogin.css';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const AdminSetup = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.setup.title'));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let aborted = false;
    (async () => {
      let token = await getToken();
      if (!token && isSignedIn) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (aborted || !mountedRef.current) return;
          token = await getToken();
          if (token) break;
        }
      }
      if (!aborted && mountedRef.current) setTokenReady(true);
    })();
    return () => { aborted = true; };
  }, [isLoaded, isSignedIn, getToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) { setError(t('admin.setup.sessionExpired')); setLoading(false); return; }
      await axios.post(`${API_BASE_URL}/api/admin/claim`, { code });
      try { localStorage.setItem('adminRole', 'admin'); } catch { /* incognito */ }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || (err.message === 'Network Error' ? t('admin.setup.networkError') : t('admin.setup.error')));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return <div style={{ padding: 24 }}>{t('admin.setup.initializing')}</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (!tokenReady) {
    return (
      <div className="form-container">
        <div className="form" style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32, border: '3px solid var(--dc-border)', borderTopColor: 'var(--dc-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--dc-text-muted)', fontSize: 14 }}>{t('admin.setup.initializing')}</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form">
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{t('admin.setup.title')}</h2>
        <p style={{ textAlign: 'center', color: 'var(--dc-text-muted)', marginBottom: 16, fontSize: 14 }}>
          {t('admin.setup.subtitle')}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="code">{t('admin.setup.code')}</label>
            <input type="password" id="code" value={code}
              onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="form-btn" disabled={loading}>
            {loading ? t('admin.setup.verifying') : t('admin.setup.claim')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSetup;
