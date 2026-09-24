"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useUrlFilters } from "../../_hooks/useUrlFilters";
import {
  getAffiliatesSummaryReport,
  getDepartments,
  getCitiesByDepartment,
  type AffiliatesSummaryIndicators,
} from "../fetch";
import type { Department, City } from "@/types/geo";

/** Shown while the first fetch is still in flight, before real counts exist. */
export const EMPTY_INDICATORS: AffiliatesSummaryIndicators = {
  titulares: 0,
  titulares_activos: 0,
  titulares_inactivos: 0,
  beneficiarios: 0,
  beneficiarios_activos: 0,
  beneficiarios_inactivos: 0,
};

const FILTER_KEYS = ["from", "to", "department_id", "city_id", "franchise_id"];

/**
 * Owns every piece of state this report needs — date range, the
 * department→city cascade, and the resulting indicator fetch — kept out of
 * the page component so it stays a short, readable layout. Filters live in
 * the URL (via the shared `useUrlFilters`, the same core `useReportsTable`
 * uses) so a filtered view is bookmarkable/shareable like every other
 * report page, even though this one has no list/pagination to justify
 * pulling in `useReportsTable` itself.
 */
export function useAffiliatesSummaryData() {
  const { filters, setParams } = useUrlFilters(FILTER_KEYS);

  const from = filters.from || "";
  const to = filters.to || "";
  const departmentId: number | "" = filters.department_id ? Number(filters.department_id) : "";
  const cityId: number | "" = filters.city_id ? Number(filters.city_id) : "";
  const franchiseId = filters.franchise_id || "";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [indicators, setIndicators] = useState<AffiliatesSummaryIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDepartments()
      .then((list) => {
        if (!cancelled) setDepartments(list);
      })
      .catch(() => {
        if (!cancelled) setDepartments([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!departmentId) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setCitiesLoading(true);
    getCitiesByDepartment(departmentId)
      .then((list) => {
        if (!cancelled) setCities(list);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const setFrom = (value: string) => setParams({ from: value || undefined });
  const setTo = (value: string) => setParams({ to: value || undefined });
  const setFranchiseId = (value: string) => setParams({ franchise_id: value || undefined });
  const setCityId = (value: number | "") => setParams({ city_id: value ? String(value) : undefined });
  /**
   * Clears `city_id` in the SAME navigation as the department change — a
   * city that belonged to the previous department wouldn't exist in the new
   * department's list, so leaving it in the URL would silently send a
   * stale/invalid `city_id` to the backend.
   */
  const setDepartmentId = (value: number | "") =>
    setParams({ department_id: value ? String(value) : undefined, city_id: undefined });

  const exportParams: Record<string, string | undefined> = {
    from: filters.from,
    to: filters.to,
    city_id: filters.city_id,
    department_id: !filters.city_id ? filters.department_id : undefined,
    franchise_id: filters.franchise_id,
  };
  // A stable string key, so the fetch effect below reacts to a filter value
  // actually changing rather than a fresh object identity every render.
  const filtersKey = JSON.stringify(exportParams);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAffiliatesSummaryReport(exportParams)
      .then((result) => {
        if (!cancelled) setIndicators(result);
      })
      .catch((err) => {
        // Last successful indicators stay on screen — a transient failure
        // while adjusting filters shouldn't blank out what's already shown.
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return {
    from,
    setFrom,
    to,
    setTo,
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
  };
}
