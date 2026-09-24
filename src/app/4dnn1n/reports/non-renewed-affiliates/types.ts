/** Row shape for the Sin Renovación report, as returned by GET /api/reports/non-renewed-affiliates. */
export type ApiNonRenewedRow = {
  id: number;
  validity_end: string;
  name: string;
  phone: string | null;
  movil: string;
  franchise: string | null;
};

export type NonRenewedMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type NonRenewedReportResponse = { data: ApiNonRenewedRow[]; meta: NonRenewedMeta };
