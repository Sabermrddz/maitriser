import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from "@clerk/react";
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { setToken } from '../utils/tokenStore';
import { useTranslation } from '../context/LanguageContext';

const AdminProtectedRoute = () => {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [synced, setSynced] = useState(false);
  const [role, setRole] = useState(() => { try { return localStorage.getItem('adminRole'); } catch { return null; } });

  useEffect(() => {
    if (!isSignedIn || !isLoaded || synced) return;
    let aborted = false;
    const sync = async () => {
      let controller, timeoutId;
      try {
        let token = await getToken();
        if (!token) {
          for (let i = 0; i < 10; i++) {
            await new Promise((r) => setTimeout(r, 300));
            if (aborted) return;
            token = await getToken();
            if (token) break;
          }
        }
        if (!token) throw new Error('No token');
        setToken(token);
        if (aborted) return;
        controller = new AbortController();
        timeoutId = setTimeout(() => { controller.abort(); setSynced(true); }, 10000);
        const res = await axios.post(`${API_BASE_URL}/api/auth/clerk-sync`, {}, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        clearTimeout(timeoutId);
        if (aborted) return;
        try { localStorage.setItem('adminRole', res.data.role); } catch { /* incognito */ }
        setRole(res.data.role);
        setSynced(true);
      } catch (err) {
        clearTimeout(timeoutId);
        if (aborted) return;
        setRole(null);
        try { localStorage.removeItem('adminRole'); } catch { /* incognito */ }
        setSynced(true);
      }
    };
    sync();
    return () => { aborted = true; };
  }, [isSignedIn, isLoaded]);

  if (!isLoaded) return <div style={{ padding: 24 }}>{t('loading')}</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (!synced) return <div style={{ padding: 24 }}>{t('login.syncing')}</div>;
  if (role !== 'admin') return <Navigate to="/admin/setup" replace />;
  return <Outlet />;
};

export default AdminProtectedRoute;
