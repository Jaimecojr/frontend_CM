import type { ReportMeta } from "../_hooks/useReportsTable";

/** Row shape for the Sin Renovación report, as returned by GET /api/reports/non-renewed-affiliates. */
export type ApiNonRenewedRow = {
  id: number;
  validity_end: string;
  name: string;
  phone: string | null;
  movil: string;
  franchise: string | null;
};

export type NonRenewedMeta = ReportMeta;
export type NonRenewedReportResponse = { data: ApiNonRenewedRow[]; meta: NonRenewedMeta };
