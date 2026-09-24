"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type ReportMeta = { current_page: number; last_page: number; per_page: number; total: number };

type FetchFn<T, E extends Record<string, unknown>> = (
  params: Record<string, string | number | undefined>,
) => Promise<{ data: T[]; meta: ReportMeta } & E>;

type Options = {
  /** Query-string keys this report reads/writes besides page/per_page (e.g. ["from","to","franchise_id"]). */
  filterKeys: string[];
};

/**
 * URL-synced server pagination for the Reportes module. Every filter, the
 * page, and per_page live in the query string — so ExportReportButton can
 * fire with exactly what's on screen, and a filtered view is bookmarkable.
 * Deliberately separate from the existing useServerTable: reports have no
 * "stade" concept, and per_page must support the literal string 'all' the
 * backend's per_page=all contract expects, not a numeric substitute.
 *
 * Generic E captures whatever a report's response carries beyond
 * {data, meta} — e.g. Sales' `totals`, Balance's `total_balance` — in
 * `extra`, from the SAME response the table just fetched. A page that needs
 * one of those must read it from `extra`, never issue a second fetch call
 * for numbers the first call already returned.
 */
export function useReportsTable<T, E extends Record<string, unknown> = Record<string, never>>(
  fetchFn: FetchFn<T, E>,
  options: Options,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsStr = searchParams.toString();

  const page = Number(searchParams.get("page") || "1");
  const perPage = searchParams.get("per_page") || "25";

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    for (const key of options.filterKeys) {
      const v = searchParams.get(key);
      if (v) f[key] = v;
    }
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsStr]);

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<ReportMeta>({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [extra, setExtra] = useState<E | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchFnRef
      .current({ page, per_page: perPage, ...filters })
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setMeta(res.meta);
          const rest: Record<string, unknown> = { ...res };
          delete rest.data;
          delete rest.meta;
          setExtra(rest as E);
        }
      })
      .catch((err) => {
        // Surfaced via `error` (rather than swallowed) so the page can render
        // its own failure UI; `data`/`meta` from the last successful fetch
        // are left untouched, so a transient failure while paging doesn't
        // blank out what's already on screen.
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, JSON.stringify(filters)]);

  /** Pushes new query params. Resets to page 1 unless the caller is only changing the page itself. */
  const setParams = useCallback(
    (updates: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParamsStr);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (resetPage) next.set("page", "1");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParamsStr],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => setParams({ [key]: value }),
    [setParams],
  );
  const setPage = useCallback((p: number) => setParams({ page: String(p) }, false), [setParams]);
  const setPerPage = useCallback((size: string) => setParams({ per_page: size }), [setParams]);

  return {
    data,
    meta,
    extra,
    loading,
    error,
    page,
    perPage,
    filters,
    setFilter,
    setPage,
    setPerPage,
    /** Same filter object the fetch used — pass straight into ExportReportButton's `params`. */
    exportParams: filters,
  };
}
