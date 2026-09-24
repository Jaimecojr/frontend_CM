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
import { FranchiseSelect } from "../_components/FranchiseSelect";
import { DateRangeFilter } from "../_components/DateRangeFilter";
import { getNonRenewedAffiliatesReport, type ApiNonRenewedRow } from "./fetch";
import { buildNonRenewedColumns } from "./_components/columns";

/**
 * Sin Renovación report page — titulares vencidos who haven't renewed yet.
 * Only a "Desde" date filter is offered: the backend contract has no `to`,
 * since it always compares against today internally.
 */
export default function NonRenewedAffiliatesPage() {
  usePageTitle("Clientes Sin Renovación");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const {
    data,
    meta,
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
  } = useReportsTable<ApiNonRenewedRow>(getNonRenewedAffiliatesReport, {
    filterKeys: ["from", "franchise_id"],
  });

  const franchises = useFranchiseOptions(isSuperAdmin);

  const columns = useMemo(() => buildNonRenewedColumns(), []);

  const extraFilters = (
    <>
      <DateRangeFilter from={filters.from || ""} to="" onChange={setFilters} hideTo />

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

      <DataTable
        title="Clientes Sin Renovación"
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
            path="/api/reports/non-renewed-affiliates/export"
            params={exportParams}
            fallbackFilename="Reporte_Sin_Renovacion.xlsx"
          />
        }
      />
    </>
  );
}
