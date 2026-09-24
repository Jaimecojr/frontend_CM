/** Row shape for the Ventas ("Sales") report, as returned by GET /api/reports/sales. */
export type ApiSaleRow = {
  id: number;
  payment_date: string;
  fecha_desde: string;
  validity_end: string;
  validity: string;
  counselor: string | null;
  name: string;
  franchise: string | null;
  tipo_venta: "Nuevo" | "Renovación";
  /** Money field: the backend sends it uncast, so it can arrive as either a number or a numeric string. */
  valor_venta: number | string;
};

/** Aggregate counts/values for the requested period — computed server-side, never summed client-side. */
export type SalesTotals = {
  new_count: number;
  new_value: number | string;
  renewal_count: number;
  renewal_value: number | string;
};

export type SalesMeta = { current_page: number; last_page: number; per_page: number; total: number };

export type SalesReportResponse = { data: ApiSaleRow[]; meta: SalesMeta; totals: SalesTotals };
