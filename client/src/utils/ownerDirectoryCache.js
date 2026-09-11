/**
 * Short-lived in-memory cache for Walk-in partner/samsar directories.
 * Avoids re-fetching the same lists on every visit during a session.
 */
const TTL_MS = 5 * 60 * 1000;

const store = new Map();

const keyOf = (ownerKey, resource) => `${ownerKey || 'anon'}:${resource}`;

export const getCachedOwnerDirectory = (ownerKey, resource) => {
  const entry = store.get(keyOf(ownerKey, resource));
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(keyOf(ownerKey, resource));
    return null;
  }
  return entry.data;
};

export const setCachedOwnerDirectory = (ownerKey, resource, data) => {
  store.set(keyOf(ownerKey, resource), { at: Date.now(), data });
};

export const clearCachedOwnerDirectory = (ownerKey, resource) => {
  if (resource) store.delete(keyOf(ownerKey, resource));
  else {
    for (const key of store.keys()) {
      if (key.startsWith(`${ownerKey || 'anon'}:`)) store.delete(key);
    }
  }
};
