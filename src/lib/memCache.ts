/**
 * In-memory cache with TTL (time to live).
 *
 * Works like a fridge: it stores the result of a request for a set amount
 * of time. As long as the data hasn't expired, the stored value is returned
 * instead of calling the server again.
 *
 * It's a module singleton — all imports share the same store, so
 * `getDepartments` in affiliates/fetch.ts and in counselors/fetch.ts
 * use the same cache entry.
 */

type CacheEntry = { data: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();

export const memCache = {
  /**
   * Returns the cached value if it's still valid, or runs `fn`, stores
   * the result, and returns it.
   *
   * @param key    Unique identifier for the entry (e.g. 'departments', 'cities:5')
   * @param ttlMs  Time to live in milliseconds (e.g. 5 * 60_000 = 5 minutes)
   * @param fn     Async function that makes the actual request if there's no cache
   */
  async get<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.data as T;

    const data = await fn();
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  },

  /** Removes a specific entry to force a reload on the next call. */
  invalidate(key: string): void {
    store.delete(key);
  },

  /** Removes all entries whose key starts with `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

// ─── Standard TTLs ────────────────────────────────────────────────────────────

/** Departments and cities: geographic data, never changes in the system. */
export const TTL_GEO = 30 * 60_000; // 30 min

/** Operational catalogs: specialties, agreements, advisors, franchises. */
export const TTL_CATALOG = 5 * 60_000; // 5 min

/** Paginated lists: affiliates, doctors, appointments. Short so as not to show very stale data. */
export const TTL_LIST = 2 * 60_000; // 2 min
