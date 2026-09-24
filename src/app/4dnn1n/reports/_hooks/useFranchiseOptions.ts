"use client";

import { useEffect, useState } from "react";
import { getActiveFranchises, type FranchiseOption } from "../_lib/catalogs";

/**
 * Loads the active-franchise catalog for the "Franquicia" filter, shared by
 * every report page that offers it. Centralizes the "only load for a super
 * admin, swallow a rejection to an empty list, ignore a response that
 * resolves after unmount" logic that was duplicated verbatim across pages.
 */
export function useFranchiseOptions(isSuperAdmin: boolean): FranchiseOption[] {
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    let cancelled = false;
    getActiveFranchises()
      .then((options) => {
        if (!cancelled) setFranchises(options);
      })
      .catch(() => {
        if (!cancelled) setFranchises([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  return franchises;
}
