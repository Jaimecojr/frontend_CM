import { apiFetch } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

/** A franchise as offered by the super-admin-only "Franquicia" report filter. */
export type FranchiseOption = { id: number; name: string };

/**
 * Fetches the active franchises for the "Franquicia" filter. Reuses the same
 * endpoint AND the same `franchises:active` cache entry `affiliates/fetch.ts`
 * and `counselors/fetch.ts` already use for this catalog — a second,
 * independent cache key for identical data would double the requests and let
 * the two copies go stale out of sync with each other.
 */
export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  return memCache.get("franchises:active", TTL_CATALOG, async () => {
    const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
    return res.data ?? [];
  });
}
