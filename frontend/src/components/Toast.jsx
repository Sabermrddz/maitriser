import React, { createContext, useContext, useState, useCallback } from 'react';
import { playSound } from '../utils/sound';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    if (type === 'success') playSound('success');
    else if (type === 'error') playSound('error');
    else if (type === 'warning') playSound('warning');
    const id = Date.now() + Math.random();
    setToasts((prev) => { const next = [...prev, { id, message, type }]; return next.length > 5 ? next.slice(-5) : next; });
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const colors = {
    success: '#2e7d32',
    error: '#d32f2f',
    info: '#04484F',
    warning: '#f57c00',
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div role="region" aria-label="Notifications" aria-live="polite" style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {toasts.map((t) => (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} style={{
            background: colors[t.type] || colors.info,
            color: '#fff', padding: '10px 16px', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer', fontSize: '0.9rem',
            minWidth: 250, maxWidth: 400,
            animation: 'slideIn 0.25s ease',
          }} onClick={() => removeToast(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
