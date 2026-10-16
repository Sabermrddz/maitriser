/**
 * Local test for the Clerk Frontend API proxy (Backend/routes/clerkProxyRoutes.js).
 *
 * Exercises the proxy through the running backend — no secrets live in this
 * file; the backend reads its own .env. Run with the backend on live keys plus
 * CLERK_PROXY_URL set, e.g.:
 *
 *   node Backend/scripts/test-clerk-proxy.mjs
 *
 * Exit 0 = all checks pass. Any failure prints what broke and exits 1.
 */
const BASE = process.env.PROXY_TEST_BASE || 'http://localhost:4000/__clerk';
const ORIGIN = process.env.PROXY_TEST_ORIGIN || 'http://localhost:5173';

let failures = 0;

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures += 1;
};

const req = async (path, { method = 'GET', body = null, origin = ORIGIN } = {}) => {
  const headers = {};
  if (origin) headers.Origin = origin;
  let payload;
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
};

// 1 — v1/client: proxied JSON + CORS
{
  const r = await req('/v1/client');
  check('v1/client returns 200', r.status === 200, `got ${r.status}`);
  let isClient = false;
  try { isClient = JSON.parse(r.text)?.response?.object === 'client'; } catch { /* not JSON */ }
  check('v1/client body is a Clerk client object', isClient);
  check('v1/client ACAO echoes origin', r.headers.get('access-control-allow-origin') === ORIGIN);
  check('v1/client allows credentials', r.headers.get('access-control-allow-credentials') === 'true');
}

// 2 — v1/environment: live instance config visible through proxy
{
  const r = await req('/v1/environment');
  check('v1/environment returns 200', r.status === 200, `got ${r.status}`);
  let password = '';
  try { password = JSON.parse(r.text)?.auth_config?.password; } catch { /* not JSON */ }
  check('environment shows password auth', password === 'required', `got ${password || '?'}`);
}

// 3 — preflight answered by the proxy itself
{
  const r = await req('/v1/client', { method: 'OPTIONS' });
  check('OPTIONS preflight returns 204', r.status === 204, `got ${r.status}`);
  check(
    'preflight allows credentials',
    r.headers.get('access-control-allow-credentials') === 'true'
  );
}

// 4 — versioned JS bundle (exercises Clerk's 307 + our redirect-follow)
{
  const r = await req('/npm/@clerk/clerk-js@6/dist/clerk.browser.js');
  const type = r.headers.get('content-type') || '';
  check('clerk.browser.js returns 200', r.status === 200, `got ${r.status}`);
  check('clerk.browser.js is JavaScript', type.includes('javascript'), type);
  check('clerk.browser.js has real size', r.text.length > 100000, `${r.text.length} bytes`);
  check('clerk.browser.js carries CORS', r.headers.get('access-control-allow-origin') === ORIGIN);
}

// 5 — POST forwarding (Clerk answers the sign-in attempt itself, whatever the
// outcome; only a 502/503 means the proxy failed to reach Clerk)
{
  const r = await req('/v1/client/sign_ins', {
    method: 'POST',
    body: { identifier: 'proxy-test-nonexistent@example.com' },
  });
  const reachedClerk = r.status !== 502 && r.status !== 503;
  let answered = false;
  try {
    const parsed = JSON.parse(r.text);
    const s = parsed.response || parsed;
    answered = typeof s.status === 'string' || Array.isArray(s.errors);
  } catch { /* not JSON */ }
  check('bogus sign-in reaches Clerk (Clerk answers, proxy does not fail)', reachedClerk && answered, `got ${r.status}`);
}

// 6 — cookie domain rewrite (informational: only fails if Clerk sets no cookie here)
{
  const r = await req('/v1/client');
  const setCookie = r.headers.get('set-cookie');
  if (!setCookie) {
    console.log('SKIP  cookie rewrite check (endpoint set no cookie)');
  } else {
    check('Set-Cookie re-scoped to shared domain', /Domain=maitrisez\.app/i.test(setCookie), setCookie.slice(0, 80));
  }
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll proxy checks passed');
