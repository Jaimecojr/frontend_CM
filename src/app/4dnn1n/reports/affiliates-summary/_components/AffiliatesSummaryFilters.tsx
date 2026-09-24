"use client";

import { ExportReportButton } from "../../_components/ExportReportButton";
import { FranchiseSelect } from "../../_components/FranchiseSelect";
import { DateRangeFilter } from "../../_components/DateRangeFilter";
import type { FranchiseOption } from "../../_lib/catalogs";
import type { Department, City } from "@/types/geo";

/**
 * Filter bar for the Resumen de Afiliados page, split out of the page
 * component to keep it under the module's line-count/readability limit —
 * this page has more filters (date range + department/city cascade +
 * franchise) than the fields that fit comfortably inline.
 */
export function AffiliatesSummaryFilters({
  from,
  to,
  onDateRangeChange,
  departments,
  departmentId,
  onDepartmentChange,
  cities,
  cityId,
  onCityChange,
  citiesLoading,
  isSuperAdmin,
  franchiseId,
  onFranchiseChange,
  franchises,
  exportParams,
}: {
  from: string;
  to: string;
  onDateRangeChange: (updates: Record<string, string | undefined>) => void;
  departments: Department[];
  departmentId: number | "";
  onDepartmentChange: (value: number | "") => void;
  cities: City[];
  cityId: number | "";
  onCityChange: (value: number | "") => void;
  citiesLoading: boolean;
  isSuperAdmin: boolean;
  franchiseId: string;
  onFranchiseChange: (value: string) => void;
  franchises: FranchiseOption[];
  exportParams: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <DateRangeFilter from={from} to={to} onChange={onDateRangeChange} />

      <select
        title="Filtrar por Departamento"
        value={departmentId}
        onChange={(e) => onDepartmentChange(e.target.value ? Number(e.target.value) : "")}
        className="h-9 w-full shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary sm:w-auto"
      >
        <option value="">Departamento (Todos)</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <select
        title="Filtrar por Ciudad"
        value={cityId}
        onChange={(e) => onCityChange(e.target.value ? Number(e.target.value) : "")}
        disabled={!departmentId || citiesLoading}
        className="h-9 w-full shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary sm:w-auto"
      >
        <option value="">Ciudad (Todas)</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {isSuperAdmin && (
        <FranchiseSelect value={franchiseId} onChange={onFranchiseChange} options={franchises} />
      )}

      <ExportReportButton
        path="/api/reports/affiliates-summary/export"
        params={exportParams}
        fallbackFilename="Reporte_Resumen_Afiliados.xlsx"
      />
    </div>
  );
}
