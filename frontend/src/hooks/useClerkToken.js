import { useState, useEffect, useRef } from 'react';
import { useAuth } from "@clerk/react";
import axios from 'axios';
import { setToken, setTokenGetter, refreshToken } from '../utils/tokenStore';
import { logger } from '../utils/logger';

const useClerkToken = () => {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const [ready, setReady] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) return;
    setTokenGetter(() => getTokenRef.current());
    let aborted = false;

    const init = async () => {
      let token = await getTokenRef.current();
      if (!token && isSignedIn) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (aborted) return;
          token = await getTokenRef.current();
          if (token) break;
        }
      }
      if (aborted) return;
      if (token) {
        setToken(token);
        getTokenRef.current().then((t) => { if (t) setToken(t); }).catch((err) => { logger.error({ err }, 'Token refresh failed'); });
        setReady(true);
      } else if (!isSignedIn) {
        setReady(true);
      } else {
        setTimeout(() => setReady(true), 100);
      }
    };

    init();

    const interceptor = axios.interceptors.request.use(async (config) => {
      const token = await refreshToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const refreshInterval = setInterval(async () => {
      if (aborted) return;
      getTokenRef.current().then((token) => { if (token) setToken(token); }).catch((err) => { logger.error({ err }, 'Refresh interval failed'); });
    }, 30 * 1000);

    return () => {
      aborted = true;
      axios.interceptors.request.eject(interceptor);
      clearInterval(refreshInterval);
    };
  }, [isLoaded, isSignedIn]);

  return ready;
};

export default useClerkToken;
