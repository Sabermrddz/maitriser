import { Router } from 'express';
import https from 'https';
import logger from '../utils/logger.js';

/**
 * Clerk Frontend API proxy.
 *
 * A production Clerk instance normally serves its Frontend API from
 * clerk.<your-domain>. That hostname is only provisioned once its CNAME
 * resolves, so it is instead reached through a proxy: the browser talks to the
 * proxy path, and the proxy forwards to Clerk's Frontend API, adding the three
 * headers Clerk requires — Clerk-Proxy-Url, Clerk-Secret-Key and
 * X-Forwarded-For. The last must carry the real end user's address, because
 * Clerk uses it for rate limiting and bot detection.
 */

const MOUNT = '/__clerk';
const FAPI_HOST = 'frontend-api.clerk.dev';

const router = Router();

const config = () => ({
  proxyUrl: process.env.CLERK_PROXY_URL,
  secretKey: process.env.CLERK_SECRET_KEY,
  // Cookies minted upstream are re-scoped so the app origin and this origin
  // share one session cookie.
  cookieDomain: process.env.CLERK_COOKIE_DOMAIN
    || (process.env.CLERK_PROXY_URL
      ? new URL(process.env.CLERK_PROXY_URL).hostname.split('.').slice(-2).join('.')
      : ''),
});

// The proxy answers its own preflight and carries the session cookie, so CORS
// is handled here rather than by the global config.
router.use(MOUNT, (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] || 'Content-Type, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { proxyUrl, secretKey, cookieDomain } = config();
  if (!proxyUrl || !secretKey) {
    return res.status(503).json({ message: 'Clerk proxy not configured' });
  }

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  delete headers['content-length'];
  headers['Clerk-Proxy-Url'] = proxyUrl;
  headers['Clerk-Secret-Key'] = secretKey;
  // trust proxy is enabled, so req.ip is the end user rather than the router.
  headers['X-Forwarded-For'] = req.ip || req.socket?.remoteAddress || '';

  const forward = (path, hops, bodyStream) => {
    if (hops > 3) {
      if (!res.headersSent) res.status(502).json({ message: 'Clerk proxy redirect loop' });
      return;
    }
    const upstream = https.request(
      { host: FAPI_HOST, port: 443, method: req.method, path, headers },
      (upRes) => {
        const location = upRes.headers.location;
        if ([301, 302, 307, 308].includes(upRes.statusCode) && location) {
          // Clerk resolves versioned asset URLs with a redirect back through
          // the proxy path. Follow it upstream instead of sending the browser
          // to the static host, which has no CORS headers.
          upRes.resume();
          try {
            const target = new URL(location, `https://${FAPI_HOST}`);
            let next = target.pathname + target.search;
            const mountIndex = next.indexOf(MOUNT);
            if (mountIndex >= 0) next = next.slice(mountIndex + MOUNT.length) || '/';
            return forward(next, hops + 1, null);
          } catch {
            return forward(location, hops + 1, null);
          }
        }
        const out = { ...upRes.headers };
        delete out['content-security-policy'];
        delete out['strict-transport-security'];
        delete out.location;
        if (cookieDomain && out['set-cookie']) {
          out['set-cookie'] = out['set-cookie'].map((c) =>
            c.replace(/;\s*Domain=[^;]*/i, '').replace(/;\s*$/, '') + `; Domain=${cookieDomain}`
          );
        }
        if (origin) {
          out['access-control-allow-origin'] = origin;
          out['access-control-allow-credentials'] = 'true';
        }
        res.writeHead(upRes.statusCode || 502, out);
        upRes.pipe(res);
      }
    );

    upstream.on('error', (err) => {
      logger.error({ err: err.message, url: req.originalUrl }, 'Clerk proxy upstream failed');
      if (!res.headersSent) res.status(502).json({ message: 'Clerk proxy unavailable' });
    });

    if (bodyStream) bodyStream.pipe(upstream);
    else req.pipe(upstream);
  };

  forward(req.url, 0, null);
});

export default router;