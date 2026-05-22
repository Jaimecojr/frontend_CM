"use client";

import { useEffect, useRef, useState } from "react";

type FetchFn<T> = (params: {
  stade: string;
  search: string;
  page: number;
  per_page: number;
  [key: string]: any;
}) => Promise<{ data: T[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>;

type Options = {
  perPage?: number;
  defaultStade?: string;
  debounceMs?: number;
  extraParams?: Record<string, any>;
};

/**
 * Hook reutilizable de paginación server-side para el DataTable.
 * Encapsula: filtro de estado, búsqueda debounced, paginación y estados de carga.
 *
 * Uso:
 *   const table = useServerTable(getAffiliates, { defaultStade: "1" });
 *   <DataTable {...table.tableProps} ... />
 */
export function useServerTable<T>(fetchFn: FetchFn<T>, options: Options = {}) {
  const { perPage = 20, defaultStade = "1", debounceMs = 400 } = options;

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: perPage, total: 0 });
  const [loading, setLoading] = useState(true);
  const [isHardLoad, setIsHardLoad] = useState(true);

  const [stadeFilter, setStadeFilter] = useState(defaultStade);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(1);
    }, debounceMs);
  };

  const handleStateFilterChange = (v: string) => {
    setIsHardLoad(true);
    setStadeFilter(v);
    setPage(1);
  };

  const extraParamsStr = JSON.stringify(options.extraParams || {});
  const prevExtraParamsRef = useRef(extraParamsStr);

  // Resetear página y activar skeleton cuando cambian los filtros extra
  if (prevExtraParamsRef.current !== extraParamsStr) {
    prevExtraParamsRef.current = extraParamsStr;
    if (page !== 1) setPage(1);
    if (!isHardLoad) setIsHardLoad(true);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const extra = JSON.parse(extraParamsStr);

    fetchFn({ stade: stadeFilter, search: debouncedSearch, page, per_page: perPage, ...extra })
      .then(({ data: rows, meta: m }) => {
        if (!cancelled) { setData(rows); setMeta(m); }
      })
      .catch(() => {}) // el caller puede manejar el error si quiere
      .finally(() => {
        if (!cancelled) { isInitialLoadRef.current = false; setLoading(false); setIsHardLoad(false); }
      });

    return () => { cancelled = true; };
  }, [stadeFilter, debouncedSearch, page, extraParamsStr]);

  /** Props listos para pasar directamente al DataTable */
  const tableProps = {
    data,
    loading: isHardLoad && loading,
    serverSide: true as const,
    serverPage: page,
    serverLastPage: meta.last_page,
    serverTotal: meta.total,
    onPageChange: setPage,
    defaultPageSize: perPage,
    searchValue: search,
    onSearchChange: handleSearchChange,
    isSearching: search !== debouncedSearch,
    enableStateFilter: true,
    stateFilterValue: stadeFilter,
    onStateFilterChange: handleStateFilterChange,
  };

  return {
    data,
    setData,
    meta,
    setMeta,
    loading,
    stadeFilter,
    tableProps,
    isInitialLoad: isInitialLoadRef.current,
  };
}
