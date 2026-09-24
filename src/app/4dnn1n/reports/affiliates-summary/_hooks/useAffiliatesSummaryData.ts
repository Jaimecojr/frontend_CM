"use client";

import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
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

/**
 * Owns every piece of state this report needs — date range, the
 * department→city cascade, and the resulting indicator fetch — kept out of
 * the page component so it stays a short, readable layout. Unlike every
 * other report there's no `useReportsTable`: the backend response has no
 * `{data, meta}` list shape, just the six indicators.
 */
export function useAffiliatesSummaryData() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [franchiseId, setFranchiseId] = useState("");

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
    // Always resets, not only when cleared: a city selected under the
    // previous department wouldn't exist in the new department's list.
    setCityId("");

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

  const exportParams: Record<string, string | undefined> = {
    from: from || undefined,
    to: to || undefined,
    city_id: cityId ? String(cityId) : undefined,
    department_id: !cityId && departmentId ? String(departmentId) : undefined,
    franchise_id: franchiseId || undefined,
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
