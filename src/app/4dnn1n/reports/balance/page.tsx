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
import { formatMoney } from "../_lib/format";
import { getBalanceReport, type ApiBalanceRow } from "./fetch";
import { buildBalanceColumns } from "./_components/columns";

/**
 * Cartera report page — affiliates with a pending balance, filterable by
 * counselor and (for super admin) franchise. Follows the same URL-synced
 * filters/pagination and export pattern as every other report page.
 */
export default function BalanceReportPage() {
  usePageTitle("Reporte de Cartera");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, meta, extra, loading, error, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiBalanceRow, { total_balance: number | string }>(getBalanceReport, {
      filterKeys: ["franchise_id", "counselor_id"],
    });
  // Same response the table already fetched — never a second call just for this number.
  const totalBalance = extra?.total_balance ?? 0;

  const franchises = useFranchiseOptions(isSuperAdmin);

  const columns = useMemo(() => buildBalanceColumns(), []);

  const extraFilters = (
    <>
      <CounselorSearchSelect
        value={filters.counselor_id || ""}
        onChange={(v) => setFilter("counselor_id", v)}
        placeholder="Filtrar por asesor..."
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
      <LoadingOverlay isLoading={loading && meta.current_page === 1 && data.length === 0} />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:w-64">
        <p className="text-xs text-dark-5 dark:text-dark-6">Total Saldo</p>
        <p className="text-lg font-bold text-dark dark:text-white">{formatMoney(totalBalance)}</p>
      </div>

      <DataTable
        title="Reporte de Cartera"
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
            path="/api/reports/balance/export"
            params={exportParams}
            fallbackFilename="Reporte_Cartera.xlsx"
          />
        }
      />
    </>
  );
}
