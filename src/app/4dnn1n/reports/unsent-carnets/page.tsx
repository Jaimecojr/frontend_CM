"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { FranchiseSelect } from "../_components/FranchiseSelect";
import { getUnsentCarnetsReport, getActiveFranchises, type FranchiseOption } from "./fetch";
import { buildUnsentCarnetsColumns } from "./_components/columns";

/**
 * Carnets No Enviados report page — super-admin only. A franchise user
 * hitting this URL directly is redirected away rather than shown an empty
 * or 403'd table, mirroring the content-admin hub's guard pattern.
 *
 * Every hook runs unconditionally before the early `return null` below, so
 * the redirect guard never violates the rules of hooks.
 */
export default function UnsentCarnetsPage() {
  usePageTitle("Carnets No Enviados");
  const { user } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.type === 1;

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/home");
  }, [user, router]);

  // No explicit <T> here: see the appointments page for why a lone T would
  // leave E defaulted to Record<string, never>, which breaks assignability
  // for a response with no extra fields beyond data/meta.
  const { data, meta, loading, error, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable(getUnsentCarnetsReport, { filterKeys: ["franchise_id"] });

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    if (isSuperAdmin) {
      getActiveFranchises()
        .then(setFranchises)
        .catch(() => setFranchises([]));
    }
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildUnsentCarnetsColumns(), []);

  if (!user || user.type !== 1) return null;

  const extraFilters = (
    <>
      <FranchiseSelect
        value={filters.franchise_id || ""}
        onChange={(v) => setFilter("franchise_id", v)}
        options={franchises}
      />

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

      <DataTable
        title="Carnets No Enviados"
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
            path="/api/reports/unsent-carnets/export"
            params={exportParams}
            fallbackFilename="Reporte_Carnets_No_Enviados.xlsx"
          />
        }
      />
    </>
  );
}
