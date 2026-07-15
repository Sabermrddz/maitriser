const store = new Map();
const keysOrder = [];

const defaultTTL = 5 * 60 * 1000; // 5 minutes
const MAX_SIZE = 1000;
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

function _touch(key) {
  const idx = keysOrder.indexOf(key);
  if (idx !== -1) keysOrder.splice(idx, 1);
  keysOrder.push(key);
}

function _evictIfNeeded() {
  while (keysOrder.length > MAX_SIZE) {
    const oldest = keysOrder.shift();
    store.delete(oldest);
  }
}

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    const idx = keysOrder.indexOf(key);
    if (idx !== -1) keysOrder.splice(idx, 1);
    return null;
  }
  _touch(key);
  return entry.value;
}

function set(key, value, ttl = defaultTTL) {
  const existed = store.has(key);
  store.set(key, { value, expiry: Date.now() + ttl });
  if (!existed) _touch(key);
  _evictIfNeeded();
}

// Periodic cleanup of expired entries
let cleanupTimer = null;
function _startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (let i = keysOrder.length - 1; i >= 0; i--) {
      const key = keysOrder[i];
      const entry = store.get(key);
      if (entry && now > entry.expiry) {
        store.delete(key);
        keysOrder.splice(i, 1);
      }
    }
  }, CLEANUP_INTERVAL);
}
_startCleanup();

function del(key) {
  store.delete(key);
  const idx = keysOrder.indexOf(key);
  if (idx !== -1) keysOrder.splice(idx, 1);
}

function delPattern(pattern) {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
      const idx = keysOrder.indexOf(key);
      if (idx !== -1) keysOrder.splice(idx, 1);
    }
  }
}

function clear() {
  store.clear();
  keysOrder.length = 0;
}

function size() {
  return store.size;
}

function cacheMiddleware(ttl = defaultTTL) {
  return (req, res, next) => {
    const uid = req.user?.id || '';
    const key = `${req.method}:${req.originalUrl}:${uid}`;
    const cached = get(key);
    if (cached) return res.json(cached);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) set(key, body, ttl);
      originalJson(body);
    };
    next();
  };
}

export { get, set, del, delPattern, clear, size, cacheMiddleware };
export default { get, set, del, delPattern, clear, size, cacheMiddleware };
