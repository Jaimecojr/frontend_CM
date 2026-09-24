"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** A batch of query-string updates; `undefined`/`""` removes that key. */
export type UrlFilterUpdates = Record<string, string | undefined>;

/**
 * Core URL read/write shared by every report page, paginated or not.
 * Filters live in the query string so a filtered view is bookmarkable and
 * shareable, and (for paginated reports) the export button can read exactly
 * what's on screen. Split out of `useReportsTable` so a report with no
 * list/pagination (Resumen de Afiliados) can get URL-synced filters without
 * pulling in page/per_page machinery it has no use for.
 */
export function useUrlFilters(filterKeys: string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsStr = searchParams.toString();

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    for (const key of filterKeys) {
      const v = searchParams.get(key);
      if (v) f[key] = v;
    }
    return f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsStr]);

  /**
   * Applies one or more key changes in a single `router.replace` — e.g.
   * clearing a department must drop `city_id` in the same navigation, not a
   * separate one, or an intermediate URL with a now-invalid `city_id` would
   * briefly exist. `resetPage: true` additionally forces `page` back to `1`,
   * for a caller (like `useReportsTable`) that paginates.
   */
  const setParams = useCallback(
    (updates: UrlFilterUpdates, options?: { resetPage?: boolean }) => {
      const next = new URLSearchParams(searchParamsStr);
      for (const [k, v] of Object.entries(updates)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      if (options?.resetPage) next.set("page", "1");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParamsStr],
  );

  return { filters, setParams, searchParams, searchParamsStr };
}
