import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiNonRenewedRow, NonRenewedReportResponse } from "./types";

export type { ApiNonRenewedRow, NonRenewedMeta, NonRenewedReportResponse } from "./types";

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
