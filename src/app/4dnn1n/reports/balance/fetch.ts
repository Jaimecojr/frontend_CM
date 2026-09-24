import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiBalanceRow, BalanceReportResponse } from "./types";

export type { ApiBalanceRow, BalanceMeta, BalanceReportResponse } from "./types";

/**
 * Fetches one page of the Cartera report. `total_balance` rides along in the
 * same response as `data`/`meta`, so the page never issues a second request
 * just to read the totals card.
 */
export async function getBalanceReport(
  params: Record<string, string | number | undefined>,
): Promise<BalanceReportResponse> {
  const res = await apiFetch<{
    message: string;
    data: ApiBalanceRow[];
    meta: BalanceReportResponse["meta"];
    total_balance: BalanceReportResponse["total_balance"];
  }>(`/api/reports/balance${toQueryString(params)}`);
  return { data: res.data ?? [], meta: res.meta, total_balance: res.total_balance };
}
