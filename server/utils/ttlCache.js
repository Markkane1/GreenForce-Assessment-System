const defaultNow = () => Date.now();

export const createTtlCache = ({ ttlMs, now = defaultNow } = {}) => {
  const store = new Map();

  const isExpired = (entry) => !entry || entry.expiresAt <= now();

  const get = (key) => {
    const entry = store.get(key);

    if (isExpired(entry)) {
      store.delete(key);
      return null;
    }

    return entry.value;
  };

  const set = (key, value, customTtlMs = ttlMs) => {
    const resolvedTtl = Number(customTtlMs);

    if (!Number.isFinite(resolvedTtl) || resolvedTtl <= 0) {
      store.set(key, {
        value,
        expiresAt: Number.POSITIVE_INFINITY,
      });
      return value;
    }

    store.set(key, {
      value,
      expiresAt: now() + resolvedTtl,
    });

    return value;
  };

  const del = (key) => {
    store.delete(key);
  };

  const clear = () => {
    store.clear();
  };

  const clearByPrefix = (prefix) => {
    for (const key of store.keys()) {
      if (String(key).startsWith(prefix)) {
        store.delete(key);
      }
    }
  };

  const getOrSet = async (key, factory, customTtlMs = ttlMs) => {
    const cachedValue = get(key);

    if (cachedValue !== null) {
      return cachedValue;
    }

    const value = await factory();
    return set(key, value, customTtlMs);
  };

  return {
    get,
    set,
    delete: del,
    clear,
    clearByPrefix,
    getOrSet,
  };
};
