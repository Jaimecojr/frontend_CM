"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { useFranchiseOptions } from "../_hooks/useFranchiseOptions";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { FranchiseSelect } from "../_components/FranchiseSelect";
import { getAppointmentsReport, getActiveDoctors, type DoctorOption } from "./fetch";
import { buildAppointmentsReportColumns } from "./_components/columns";

/**
 * Citas report page — appointments in a date range, filterable by doctor and
 * (for super admin) franchise. Follows the same URL-synced filters/pagination
 * and export pattern as every other report page.
 */
export default function AppointmentsReportPage() {
  usePageTitle("Reporte de Citas");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  // No explicit <T> here: passing only the row type would leave E defaulted
  // to `Record<string, never>`, which TS then requires every response
  // property to satisfy — including `data`/`meta` themselves — breaking the
  // call. Letting both T and E infer from `getAppointmentsReport`'s actual
  // return type keeps `data` correctly typed as `ApiAppointmentReportRow[]`.
  const { data, meta, loading, error, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable(getAppointmentsReport, {
      filterKeys: ["from", "to", "doctor_id", "franchise_id"],
    });

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  useEffect(() => {
    getActiveDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);
  const franchises = useFranchiseOptions(isSuperAdmin);

  const columns = useMemo(() => buildAppointmentsReportColumns(), []);

  const extraFilters = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <DatePickerWithToday
          value={filters.from || ""}
          onChange={(v) => setFilter("from", v)}
          placeholder="Desde"
          className="h-9 w-full sm:w-auto"
        />
        <DatePickerWithToday
          value={filters.to || ""}
          onChange={(v) => setFilter("to", v)}
          placeholder="Hasta"
          className="h-9 w-full sm:w-auto"
        />
      </div>

      <select
        title="Filtrar por Médico"
        value={filters.doctor_id || ""}
        onChange={(e) => setFilter("doctor_id", e.target.value)}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        <option value="">Médico (Todos)</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} {d.lastname}
          </option>
        ))}
      </select>

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

      <DataTable
        title="Reporte de Citas"
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
            path="/api/reports/appointments/export"
            params={exportParams}
            fallbackFilename="Reporte_Citas.xlsx"
          />
        }
      />
    </>
  );
}
