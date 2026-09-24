import { apiFetch } from "@/lib/api";
import { toQueryString } from "../_lib/query";
import type { ApiSaleRow, SalesReportResponse } from "./types";

export type { ApiSaleRow, SalesTotals, SalesMeta, SalesReportResponse } from "./types";

/**
 * Fetches one page of the Ventas report. Filters, page and per_page all come
 * from the URL via useReportsTable, so this is the single request each param
 * change fires — never a second call for the totals, which ride along in
 * the same response.
 */
export async function getSalesReport(
  params: Record<string, string | number | undefined>,
): Promise<SalesReportResponse> {
  const res = await apiFetch<{
    message: string;
    data: ApiSaleRow[];
    meta: SalesReportResponse["meta"];
    totals: SalesReportResponse["totals"];
  }>(`/api/reports/sales${toQueryString(params)}`);
  return { data: res.data ?? [], meta: res.meta, totals: res.totals };
}
