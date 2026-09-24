"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useUrlFilters } from "./useUrlFilters";

type ReportMeta = { current_page: number; last_page: number; per_page: number; total: number };

type FetchFn<T, E extends Record<string, unknown>> = (
  params: Record<string, string | number | undefined>,
) => Promise<{ data: T[]; meta: ReportMeta } & E>;

type Options = {
  /** Query-string keys this report reads/writes besides page/per_page (e.g. ["from","to","franchise_id"]). */
  filterKeys: string[];
  /**
   * Gates the fetch entirely. Defaults to true. A role-gated page (e.g. a
   * super-admin-only report) mounts and runs its hooks before its own
   * redirect-away effect has a chance to navigate a disallowed user off the
   * page — without this, the disallowed user's browser would still fire the
   * GET request for data they can't access, if only for one render.
   */
  enabled?: boolean;
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
  const enabled = options.enabled ?? true;
  const { filters, setParams, searchParams } = useUrlFilters(options.filterKeys);

  const page = Number(searchParams.get("page") || "1");
  const perPage = searchParams.get("per_page") || "25";

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState<ReportMeta>({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [extra, setExtra] = useState<E | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    if (!enabled) {
      // No fetch while gated off — e.g. a super-admin-only page rendering
      // for a disallowed user on the render(s) before its own redirect
      // effect navigates away.
      setLoading(false);
      return;
    }

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
  }, [page, perPage, JSON.stringify(filters), enabled]);

  // Filters/per_page reset back to page 1; only changing the page itself doesn't.
  const setFilter = useCallback(
    (key: string, value: string | undefined) => setParams({ [key]: value }, { resetPage: true }),
    [setParams],
  );
  const setPage = useCallback((p: number) => setParams({ page: String(p) }), [setParams]);
  const setPerPage = useCallback(
    (size: string) => setParams({ per_page: size }, { resetPage: true }),
    [setParams],
  );

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
