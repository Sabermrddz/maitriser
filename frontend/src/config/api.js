import { getToken, refreshToken, clearToken } from '../utils/tokenStore';
import { logger } from '../utils/logger';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const authHeaders = () => {
  const token = getToken();
  if (!token) logger.warn('No token in store');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const handleSessionConflict = () => {
  clearToken();
  try { localStorage.removeItem('userId'); } catch { /* incognito */ }
  window.location.href = '/login?conflict=1';
};

export const fetchWithAuth = async (url, options = {}) => {
  const doFetch = async (token) => {
    const headers = { ...options.headers, Authorization: `Bearer ${token}` };
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    return fetch(url, { ...options, headers, body });
  };

  const maxAttempts = 3;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const token = await refreshToken();
    if (!token) {
      logger.error('No auth token available');
      throw new Error('No auth token');
    }

    let res;
    try {
      res = await doFetch(token);
    } catch (networkErr) {
      lastErr = networkErr;
      logger.warn(`Attempt ${attempt}/${maxAttempts} network error:`, networkErr.message);
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
      throw networkErr;
    }

    if (res.status === 409) {
      handleSessionConflict();
      return res;
    }

    if (res.status === 401) {
      const body = await res.clone().text();
      logger.warn(`Attempt ${attempt}/${maxAttempts} got 401:`, body);
      if (attempt < maxAttempts) {
        await sleep(300 * attempt);
        continue;
      }
      throw new Error('Token rejected after 3 retries');
    }

    if (res.status >= 500 && res.status < 600) {
      lastErr = new Error(`Server error ${res.status}`);
      logger.warn(`Attempt ${attempt}/${maxAttempts} got ${res.status}`);
      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
        continue;
      }
      return res;
    }

    return res;
  }
  throw lastErr || new Error('Request failed');
};
