const store = new Map();

const prune = (key, windowMs) => {
  const now = Date.now();
  const hits = store.get(key) || [];
  const fresh = hits.filter((ts) => now - ts < windowMs);
  if (fresh.length) store.set(key, fresh);
  else store.delete(key);
  return fresh;
};

/** Occasional global prune so idle keys do not grow forever in long-lived processes. */
let lastGlobalPrune = 0;
const maybeGlobalPrune = () => {
  const now = Date.now();
  if (now - lastGlobalPrune < 60_000) return;
  lastGlobalPrune = now;
  for (const [key, hits] of store.entries()) {
    if (!hits.length || now - hits[hits.length - 1] > 60 * 60_000) {
      store.delete(key);
    }
  }
};

/**
 * Simple in-memory IP rate limiter.
 * Note: per-process only — use a shared store (Redis) if you run multiple instances.
 */
export const rateLimit = ({ windowMs = 60_000, max = 60, message = 'Too many requests, please try again later' } = {}) => {
  return (req, res, next) => {
    maybeGlobalPrune();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const hits = prune(key, windowMs);
    if (hits.length >= max) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ success: false, message });
    }
    hits.push(Date.now());
    store.set(key, hits);
    next();
  };
};
