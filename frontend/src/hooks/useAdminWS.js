import { useEffect, useRef, useState } from 'react';
import { refreshToken } from '../utils/tokenStore';

const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;
const MAX_RETRIES = 10;

export const useAdminWS = () => {
  const [lastEvent, setLastEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);

  const connect = () => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const wsUrl = `${proto}://${host}/ws/admin`;

    refreshToken().then((token) => {
      if (cancelledRef.current || !token) return;
      const ws = new WebSocket(wsUrl, [token]);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) { ws.close(); return; }
        setConnected(true);
        retriesRef.current = 0;
      };

      ws.onmessage = (msg) => {
        if (cancelledRef.current) return;
        try {
          setLastEvent(JSON.parse(msg.data));
        } catch { /* ignore malformed */ }
      };

      ws.onclose = () => {
        if (cancelledRef.current) return;
        setConnected(false);
        wsRef.current = null;
        if (retriesRef.current >= MAX_RETRIES) return;
        const delay = Math.min(RECONNECT_BASE * 2 ** retriesRef.current, RECONNECT_MAX);
        retriesRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {};
    });
  };

  useEffect(() => {
    cancelledRef.current = false;
    connect();
    return () => {
      cancelledRef.current = true;
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, []);

  return { lastEvent, connected };
};
