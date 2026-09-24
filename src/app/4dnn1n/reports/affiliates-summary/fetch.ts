import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { AffiliatesSummaryIndicators } from "./types";

export type { AffiliatesSummaryIndicators } from "./types";
// Re-exported so the page imports every catalog it needs from this one
// module, and so its test can mock a single source for departments/cities —
// the franchise catalog is intentionally NOT re-exported here: the page
// reads it through the shared `useFranchiseOptions` hook instead.
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";

/**
 * Fetches the six affiliate/beneficiary indicators for the given filters.
 * Unlike every other report's fetch, the response has no `{data, meta}` list
 * shape to unwrap into rows — just the indicator object itself.
 */
export async function getAffiliatesSummaryReport(
  params: Record<string, string | number | undefined>,
): Promise<AffiliatesSummaryIndicators> {
  const res = await apiFetch<{ message: string; data: AffiliatesSummaryIndicators }>(
    `/api/reports/affiliates-summary${toQueryString(params)}`,
  );
  return res.data;
}
