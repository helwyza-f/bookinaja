type CacheEntry<T> = {
  data?: T;
  ts?: number;
  promise?: Promise<T>;
};

const PORTAL_CACHE_TTL = 30_000;
const cache = new Map<string, CacheEntry<unknown>>();

export function peekCustomerPortalCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry?.data || !entry.ts) return null;
  if (Date.now() - entry.ts > PORTAL_CACHE_TTL) return null;
  return entry.data;
}

export async function getCustomerPortalCached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = peekCustomerPortalCache<T>(key);
  if (cached) return cached;

  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry?.promise) return entry.promise;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, {
        data,
        ts: Date.now(),
      });
      return data;
    })
    .finally(() => {
      const latest = cache.get(key) as CacheEntry<T> | undefined;
      if (latest?.promise) {
        cache.set(key, {
          data: latest.data,
          ts: latest.ts,
        });
      }
    });

  cache.set(key, {
    data: entry?.data,
    ts: entry?.ts,
    promise,
  });

  return promise;
}

export function primeCustomerPortalCache<T>(key: string, data: T) {
  cache.set(key, {
    data,
    ts: Date.now(),
  });
}
