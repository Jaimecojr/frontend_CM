"use client";

import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useFranchiseOptions } from "../_hooks/useFranchiseOptions";
import { useAffiliatesSummaryData, EMPTY_INDICATORS } from "./_hooks/useAffiliatesSummaryData";
import { AffiliatesSummaryFilters } from "./_components/AffiliatesSummaryFilters";
import { IndicatorCards } from "./_components/IndicatorCards";

/**
 * Resumen de Afiliados report page — the only report with no table and no
 * pagination, so it renders six indicator cards driven by
 * `useAffiliatesSummaryData` instead of the shared `useReportsTable` hook,
 * which assumes a `{data: T[], meta}` list shape this endpoint doesn't
 * return.
 */
export default function AffiliatesSummaryPage() {
  usePageTitle("Resumen de Afiliados");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;
  const franchises = useFranchiseOptions(isSuperAdmin);

  const {
    from,
    to,
    setDateRange,
    departmentId,
    setDepartmentId,
    cityId,
    setCityId,
    franchiseId,
    setFranchiseId,
    departments,
    cities,
    citiesLoading,
    indicators,
    loading,
    error,
    exportParams,
  } = useAffiliatesSummaryData();

  return (
    <>
      <LoadingOverlay isLoading={loading && indicators === null} />

      <div className="rounded-[10px] bg-white px-7.5 pb-7.5 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="mb-4 flex flex-col gap-4">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Resumen de Afiliados
          </h2>

          <AffiliatesSummaryFilters
            from={from}
            to={to}
            onDateRangeChange={setDateRange}
            departments={departments}
            departmentId={departmentId}
            onDepartmentChange={setDepartmentId}
            cities={cities}
            cityId={cityId}
            onCityChange={setCityId}
            citiesLoading={citiesLoading}
            isSuperAdmin={isSuperAdmin}
            franchiseId={franchiseId}
            onFranchiseChange={setFranchiseId}
            franchises={franchises}
            exportParams={exportParams}
          />
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <IndicatorCards indicators={indicators ?? EMPTY_INDICATORS} />
      </div>
    </>
  );
}
