/**
 * Row shape for the Carnets No Enviados report, as returned by
 * GET /api/reports/unsent-carnets. Rows come from a `whatsapp_messages` join
 * rather than an affiliate record directly, so there is no `id` field.
 */
export type ApiUnsentCarnetRow = {
  date: string;
  name: string;
  phone: string | null;
  movil: string;
  franchise: string | null;
};

export type UnsentCarnetsMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type UnsentCarnetsReportResponse = { data: ApiUnsentCarnetRow[]; meta: UnsentCarnetsMeta };
