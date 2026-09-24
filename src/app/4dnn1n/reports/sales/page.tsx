"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { useFranchiseOptions } from "../_hooks/useFranchiseOptions";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { CounselorSearchSelect } from "../_components/CounselorSearchSelect";
import { FranchiseSelect } from "../_components/FranchiseSelect";
import { DateRangeFilter } from "../_components/DateRangeFilter";
import { formatMoney } from "../_lib/format";
import { getSalesReport, type ApiSaleRow, type SalesTotals } from "./fetch";
import { buildSalesColumns } from "./_components/columns";

const EMPTY_TOTALS: SalesTotals = { new_count: 0, new_value: 0, renewal_count: 0, renewal_value: 0 };

/**
 * Ventas report page — the structural template every remaining report page
 * follows: URL-synced filters/pagination via useReportsTable, a franchise
 * filter gated to super admin, and an export that always reads the same
 * filters the on-screen table just fetched with.
 */
export default function SalesReportPage() {
  usePageTitle("Reporte de Ventas");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const {
    data,
    meta,
    extra,
    loading,
    error,
    filters,
    setFilter,
    setFilters,
    setPage,
    setPerPage,
    perPage,
    exportParams,
    isInitialLoad,
  } = useReportsTable<ApiSaleRow, { totals: SalesTotals }>(getSalesReport, {
    filterKeys: ["from", "to", "franchise_id", "counselor_id"],
  });
  // Same response the table already fetched — never a second call just for these 4 numbers.
  const totals = extra?.totals ?? EMPTY_TOTALS;

  const franchises = useFranchiseOptions(isSuperAdmin);

  const columns = useMemo(() => buildSalesColumns(), []);

  const extraFilters = (
    <>
      <DateRangeFilter from={filters.from || ""} to={filters.to || ""} onChange={setFilters} />

      <CounselorSearchSelect
        value={filters.counselor_id || ""}
        onChange={(v) => setFilter("counselor_id", v)}
      />

      {isSuperAdmin && (
        <FranchiseSelect
          value={filters.franchise_id || ""}
          onChange={(v) => setFilter("franchise_id", v)}
          options={franchises}
        />
      )}

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && isInitialLoad} />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 sm:max-w-xl">
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <p className="text-xs text-dark-5 dark:text-dark-6">Nuevos</p>
          <p className="text-lg font-bold text-dark dark:text-white">{totals.new_count}</p>
          <p className="text-sm text-dark-5 dark:text-dark-6">{formatMoney(totals.new_value)}</p>
        </div>
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <p className="text-xs text-dark-5 dark:text-dark-6">Renovaciones</p>
          <p className="text-lg font-bold text-dark dark:text-white">{totals.renewal_count}</p>
          <p className="text-sm text-dark-5 dark:text-dark-6">{formatMoney(totals.renewal_value)}</p>
        </div>
      </div>

      <DataTable
        title="Reporte de Ventas"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/sales/export"
            params={exportParams}
            fallbackFilename="Reporte_Ventas.xlsx"
          />
        }
      />
    </>
  );
}
