import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiNonRenewedRow, NonRenewedReportResponse } from "./types";

export type { ApiNonRenewedRow, NonRenewedMeta, NonRenewedReportResponse } from "./types";
// Re-exported so the page (and its tests, which mock this module) only need
// one import source for both the report data and its franchise filter catalog.
export { getActiveFranchises, type FranchiseOption } from "../_lib/catalogs";

/**
 * Fetches one page of the Sin Renovación report. Only `from` exists as a
 * date filter — the backend always uses today as the implicit upper bound,
 * so `to` is never part of `params` here.
 */
export async function getNonRenewedAffiliatesReport(
  params: Record<string, string | number | undefined>,
): Promise<NonRenewedReportResponse> {
  const res = await apiFetch<{
    message: string;
    data: ApiNonRenewedRow[];
    meta: NonRenewedReportResponse["meta"];
  }>(`/api/reports/non-renewed-affiliates${toQueryString(params)}`);
  return { data: res.data ?? [], meta: res.meta };
}
