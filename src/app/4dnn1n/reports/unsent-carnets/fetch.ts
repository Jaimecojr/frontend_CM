import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiUnsentCarnetRow, UnsentCarnetsReportResponse } from "./types";

export type { ApiUnsentCarnetRow, UnsentCarnetsMeta, UnsentCarnetsReportResponse } from "./types";
// Re-exported so the page (and its tests, which mock this module) only need
// one import source for both the report data and its franchise filter catalog.
export { getActiveFranchises, type FranchiseOption } from "../_lib/catalogs";

/**
 * Fetches one page of the Carnets No Enviados report. No date filter exists
 * on this contract by design — it's a live "still unresolved" list, not a
 * historical log, so only `franchise_id`/`per_page` are ever sent.
 */
export async function getUnsentCarnetsReport(
  params: Record<string, string | number | undefined>,
): Promise<UnsentCarnetsReportResponse> {
  const res = await apiFetch<{
    message: string;
    data: ApiUnsentCarnetRow[];
    meta: UnsentCarnetsReportResponse["meta"];
  }>(`/api/reports/unsent-carnets${toQueryString(params)}`);
  return { data: res.data ?? [], meta: res.meta };
}
