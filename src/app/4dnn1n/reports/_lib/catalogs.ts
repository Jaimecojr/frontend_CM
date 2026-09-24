import { apiFetch } from "@/lib/api";

/** A franchise as offered by the super-admin-only "Franquicia" report filter. */
export type FranchiseOption = { id: number; name: string };

/**
 * Fetches the active franchises for the "Franquicia" filter. Reuses the same
 * endpoint `affiliates/fetch.ts` and `counselors/fetch.ts` already call,
 * rather than adding a reports-specific catalog endpoint for the same data.
 */
export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
