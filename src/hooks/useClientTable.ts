"use client";

import { useEffect, useState } from "react";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type FetchFn<T> = () => Promise<T[]>;

/**
 * Simple hook to load a list from the API (client-side).
 * Complements useServerTable for modules with few records.
 *
 * Usage:
 *   const { data, setData, loading } = useClientTable(getCounselors);
 */
export function useClientTable<T>(fetchFn: FetchFn<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchFn()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) alert.error("Error al cargar datos", getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, setData, loading };
}
