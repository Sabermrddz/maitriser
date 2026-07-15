import { verifyToken } from '@clerk/backend';
import { WebSocketServer } from 'ws';
import User from './models/userModel.js';
import { logger } from './utils/logger.js';

const wsConnections = new Map();

const wsRateLimit = (ip) => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxConnections = 10;
  const existing = wsConnections.get(ip) || [];
  const timestamps = existing.filter((t) => now - t < windowMs);
  if (timestamps.length >= maxConnections) return false;
  timestamps.push(now);
  wsConnections.set(ip, timestamps);
  return true;
};

let wss = null;

export function initWS(server) {
  wss = new WebSocketServer({ server, path: '/ws/admin' });

  let interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws._alive === false) return ws.terminate();
      ws._alive = false;
      ws.ping();
    });
  }, 30000);
  const cleanupInterval = setInterval(() => {
    const cutoff = Date.now() - 60000;
    for (const [ip, timestamps] of wsConnections) {
      const active = timestamps.filter((t) => t > cutoff);
      if (active.length === 0) wsConnections.delete(ip);
      else wsConnections.set(ip, active);
    }
  }, 120000);
  wss.on('close', () => { clearInterval(interval); clearInterval(cleanupInterval); interval = null; });
  wss.on('error', () => { clearInterval(interval); clearInterval(cleanupInterval); interval = null; });

  wss.on('connection', async (ws, req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!wsRateLimit(ip)) { ws.close(4002, 'Rate limited'); return; }
    const token = req.headers['sec-websocket-protocol'];
    if (!token) { ws.close(4001, 'Token required'); return; }
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      const user = await User.findOne({ clerkId: payload.sub });
      if (!user || user.role !== 'admin') { ws.close(4001, 'Admin only'); return; }
      ws._alive = true;
      ws.on('pong', () => { ws._alive = true; });
      ws.on('error', (err) => logger.error({ err }, 'WebSocket error'));
    } catch {
      ws.close(4001, 'Invalid token');
    }
  });

  logger.info('WebSocket server initialized at /ws/admin');
}

export function broadcast(event, data) {
  if (!wss) return;
  const msg = JSON.stringify({ event, data, ts: Date.now() });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) {
      try { ws.send(msg); } catch { logger.warn('Failed to send WS message to a client'); }
    }
  });
}
