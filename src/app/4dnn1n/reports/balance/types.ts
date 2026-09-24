import type { ReportMeta } from "../_hooks/useReportsTable";

/** Row shape for the Cartera ("Balance") report, as returned by GET /api/reports/balance. */
export type ApiBalanceRow = {
  id: number;
  counselor: string | null;
  name: string;
  /** Money field: the backend sends it uncast, so it can arrive as either a number or a numeric string. */
  balance: number | string;
  validity: string;
};

export type BalanceMeta = ReportMeta;

/** `total_balance` is the sum computed server-side over the whole filtered set, never client-summed. */
export type BalanceReportResponse = { data: ApiBalanceRow[]; meta: BalanceMeta; total_balance: number | string };
