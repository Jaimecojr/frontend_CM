# Módulo de Reportes — Frontend (Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Next.js admin UI for the 6 reports already implemented and merged on the backend (`api-cm`, branch `develop`, commits `6eca724..f674f27` + `5ac6807`): Ventas, Cartera, Resumen de Afiliados, Citas, Sin Renovación, Carnets No Enviados. Each gets a filtered, paginated list page (or indicator cards for Resumen de Afiliados) and a "Generar reporte" button that downloads the `.xlsx` the backend already produces.

**Architecture:** A "Reportes" hub page (mirroring the existing `content/page.tsx` pattern) links to 6 report pages under `src/app/4dnn1n/reports/<slug>/`. Every report page shares three pieces of new infrastructure this plan builds first: `useReportsTable` (URL-synced server pagination — filters live in `searchParams` so the export button always fires with exactly what's on screen), `downloadFile`/`ExportReportButton` (this codebase has no existing file-download mechanism — `apiFetch` always calls `res.json()`, which breaks on a binary `.xlsx` response), and `CounselorSearchSelect` (debounced async search against the backend's dedicated catalog endpoint). Everything else follows this codebase's existing, already-researched conventions exactly — no new UI library, no new table component.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), Tailwind CSS, `@tanstack/react-table` (via the existing `DataTable`), Vitest + React Testing Library, `flatpickr` (via the existing `DatePickerWithToday`), SweetAlert2 (via the existing `alert` helper).

**Backend reference:** `docs/superpowers/specs/2026-09-22-reports-module-design.md` and `docs/superpowers/plans/2026-09-22-reports-module-backend.md` in the sibling `api-cm` repo — read these for the *why* behind each report's business rules (Report 5 ignores `stade`, Report 6 has no date filter, Report 6 is super-admin only, etc.). This plan does not repeat that rationale; it only re-states the exact API contract each page consumes.

## Global Constraints

- All 6 report pages live under `src/app/4dnn1n/reports/<slug>/`, using the **exact same slug** as the backend route (`sales`, `balance`, `affiliates-summary`, `appointments`, `non-renewed-affiliates`, `unsent-carnets`) — no renaming for "nicer" URLs.
- **Filters persist in the URL** via `useSearchParams`/`router.replace` (a deliberate, spec-mandated deviation from this codebase's existing convention of local-only filter state — see the design spec §4). This is not optional polish: the export button reuses the exact same filter object the list just fetched with, and a filtered report view must be bookmarkable/shareable.
- Dates: always `DatePickerWithToday` (dd/mm/yyyy on screen, already emits `yyyy-mm-dd` — never manually reformat before sending to the API).
- `per_page` supports `25`/`50`/`100`/`"all"` via a dedicated `<select>` this plan adds to each report's `extraFilters` — **never** rely on `DataTable`'s own built-in page-size dropdown for a server-side table; its `onPageSizeChange` is a no-op when `serverSide` (`DataTable.tsx:221`). Every report page passes `defaultPageSize={Number.MAX_SAFE_INTEGER}` to suppress that redundant, non-functional selector from ever rendering.
- The "Franquicia" filter (super-admin only, 5 of 6 reports) fetches `GET /api/users/active` — the exact endpoint and shape `affiliates/fetch.ts`/`counselors/fetch.ts` already use (`{id, name}[]`). A franchise user never sees this control — not because the backend would leak data (it ignores `franchise_id` from non-admins), but because offering a control that silently does nothing is bad UX.
- Export always goes through `src/lib/download.ts` (`downloadFile`), never `apiFetch` — `apiFetch` unconditionally calls `res.json()` and will throw on the binary `.xlsx` body.
- Every report page sets `hideSearch` on `<DataTable>` — none of the 6 backend endpoints accept a generic free-text `search` param (Report 1's counselor autocomplete is a distinct, separate filter, not `DataTable`'s built-in search box).
- Money values: `'$ ' + value.toLocaleString('es-CO')` (thousands separator, no decimals) — mirrors the backend's own `number_format($value, 0, ',', '.')` convention already used in the Excel exports, so on-screen and exported numbers read the same way.
- TypeScript strict. Types named `Api<Entity>Row` (list item), `Api<Entity>Meta`/`Api<Entity>Response` (pagination envelope), matching this codebase's existing `Api<Entity>` convention.
- Tests: Vitest + RTL, under `tests/` mirroring `src/` 1:1, AAA-commented, Spanish `it()` descriptions, `@/lib/api` and `@/lib/memCache` mocked exactly as `tests/app/4dnn1n/appointments/fetch.test.ts` already does. Run with `npm test` (`vitest run`); `npm run test:watch` while iterating.
- Backend prerequisite already applied (commit `5ac6807` on `api-cm` `develop`): `config/cors.php`'s `exposed_headers` now includes `Content-Disposition`, so `downloadFile` can read the filename the backend sets.

## Review Focus

- The export button must always fire with the *current* filters, not a stale snapshot captured at mount — since `useReportsTable`'s `filters` object is derived live from `searchParams` on every render, verify a filter change followed immediately by clicking export uses the new value, not the value from before the change.
- A franchise user must never see the "Carnets No Enviados" card on the hub page, and hitting `/4dnn1n/reports/unsent-carnets` directly (typed URL) must not render a report shell that then silently shows nothing — it should redirect away, the same way `content/page.tsx` already redirects a non-super-admin.
- Clearing a date-range filter (both `from` and `to`) must remove those keys from the URL entirely, not leave `?from=&to=` — an empty string in a `URLSearchParams` still serializes as a visible, meaningless query param.
- Report 3 (Resumen de Afiliados) has no pagination and no list — a naive implementation might try to force it through `useReportsTable`, which assumes a `{data: T[], meta}` list shape; it needs its own simpler indicator-fetching, not the shared hook.
- The counselor autocomplete (Report 1) must not fire a request on every keystroke below the backend's 2-character minimum (`ReportController::counselorsCatalog`), and must debounce above it — an un-debounced version would spam the endpoint on every keypress once past 2 characters.

---

## File Structure

```
src/lib/
  download.ts                                  (new, Task 2)

src/app/4dnn1n/reports/
  page.tsx                                      (new, Task 4 — hub)
  _hooks/
    useReportsTable.ts                          (new, Task 1)
  _components/
    ExportReportButton.tsx                      (new, Task 2)
    CounselorSearchSelect.tsx                   (new, Task 3)
    ReportPageSizeSelect.tsx                    (new, Task 1)
  sales/
    page.tsx                                    (new, Task 5)
    fetch.ts                                    (new, Task 5)
    types.ts                                    (new, Task 5)
    _components/columns.tsx                     (new, Task 5)
  balance/
    page.tsx  fetch.ts  types.ts                (new, Task 6)
    _components/columns.tsx
  affiliates-summary/
    page.tsx  fetch.ts  types.ts                (new, Task 7 — no columns.tsx, no table)
  appointments/
    page.tsx  fetch.ts  types.ts                (new, Task 8)
    _components/columns.tsx
  non-renewed-affiliates/
    page.tsx  fetch.ts  types.ts                (new, Task 9)
    _components/columns.tsx
  unsent-carnets/
    page.tsx  fetch.ts  types.ts                (new, Task 10)
    _components/columns.tsx

src/components/Layouts/sidebar/data/index.ts     (modify, Task 4 — add "Reportes" entry)

tests/lib/download.test.ts                       (new, Task 2)
tests/app/4dnn1n/reports/
  _hooks/useReportsTable.test.ts                 (new, Task 1)
  _components/ExportReportButton.test.tsx        (new, Task 2)
  _components/CounselorSearchSelect.test.tsx     (new, Task 3)
  page.test.tsx                                  (new, Task 4)
  sales/fetch.test.ts  sales/page.test.tsx        (new, Task 5)
  balance/fetch.test.ts  balance/page.test.tsx    (new, Task 6)
  affiliates-summary/fetch.test.ts  affiliates-summary/page.test.tsx (new, Task 7)
  appointments/fetch.test.ts  appointments/page.test.tsx (new, Task 8)
  non-renewed-affiliates/fetch.test.ts  non-renewed-affiliates/page.test.tsx (new, Task 9)
  unsent-carnets/fetch.test.ts  unsent-carnets/page.test.tsx (new, Task 10)
```

---

### Task 1: `useReportsTable` hook + page-size selector

**Files:**
- Create: `src/app/4dnn1n/reports/_hooks/useReportsTable.ts`
- Create: `src/app/4dnn1n/reports/_components/ReportPageSizeSelect.tsx`
- Test: `tests/app/4dnn1n/reports/_hooks/useReportsTable.test.ts`

**Interfaces:**
- Produces: `useReportsTable<T, E = Record<string, never>>(fetchFn, options: { filterKeys: string[] }): { data: T[], meta, loading, filters: Record<string,string>, setFilter(key, value), setPage(n), setPerPage(size), page: number, perPage: string, exportParams: Record<string,string>, extra: E | null }` — consumed by every report page task (5–10). The `extra` field carries whatever fields a report's response has beyond `data`/`meta` (Sales' `totals`, Balance's `total_balance`) — **read those from `extra`, never with a second fetch call**; the same response the table already fetched carries them.
- Produces: `<ReportPageSizeSelect value={perPage} onChange={setPerPage} />` — consumed by every report page task except Task 7 (no pagination).

- [ ] **Step 1: Write the failing test**

```ts
// tests/app/4dnn1n/reports/_hooks/useReportsTable.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReportsTable } from "@/app/4dnn1n/reports/_hooks/useReportsTable";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/sales",
  useSearchParams: () => mockSearchParams,
}));

describe("useReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("llama fetchFn con page=1 y per_page=25 por defecto", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    renderHook(() => useReportsTable(fetchFn, { filterKeys: ["from", "to"] }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(fetchFn).toHaveBeenCalledWith({ page: 1, per_page: "25" });
  });

  it("lee filtros iniciales desde la URL", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&franchise_id=3");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });

    // Act
    renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from", "franchise_id"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(fetchFn).toHaveBeenCalledWith({
      page: 1,
      per_page: "25",
      from: "2026-01-01",
      franchise_id: "3",
    });
  });

  it("setFilter actualiza la URL y resetea a page=1", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("page=3");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setFilter("from", "2026-02-01"));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/sales?page=1&from=2026-02-01",
      { scroll: false },
    );
  });

  it("setFilter con valor vacío elimina la clave de la URL en vez de dejarla vacía", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-31");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from", "to"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setFilter("from", undefined));

    // Assert
    const [url] = mockReplace.mock.calls[mockReplace.mock.calls.length - 1];
    expect(url).not.toContain("from=");
    expect(url).toContain("to=2026-01-31");
  });

  it("setPage NO resetea la página (a diferencia de setFilter)", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 3, per_page: 25, total: 60 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: [] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setPage(2));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/sales?page=2",
      { scroll: false },
    );
  });

  it("extra captura los campos de la respuesta más allá de data/meta, sin una segunda llamada", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
      totals: { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 },
    });

    // Act
    const { result } = renderHook(() =>
      useReportsTable<unknown, { totals: unknown }>(fetchFn, { filterKeys: [] }),
    );
    await waitFor(() => expect(result.current.extra).not.toBeNull());

    // Assert
    expect(result.current.extra).toEqual({
      totals: { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("exportParams refleja los filtros actuales, sin page ni per_page", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&page=2&per_page=50");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 2, last_page: 3, per_page: 50, total: 120 },
    });

    // Act
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(result.current.exportParams).toEqual({ from: "2026-01-01" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useReportsTable`
Expected: FAIL — `Cannot find module '@/app/4dnn1n/reports/_hooks/useReportsTable'`

- [ ] **Step 3: Implement the hook**

`src/app/4dnn1n/reports/_hooks/useReportsTable.ts`:

```ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchFnRef
      .current({ page, per_page: perPage, ...filters })
      .then((res) => {
        if (!cancelled) {
          setData(res.data);
          setMeta(res.meta);
          const { data: _d, meta: _m, ...rest } = res;
          setExtra(rest as unknown as E);
        }
      })
      .catch(() => {}) // the page can surface its own error UI if it wants
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
```

`src/app/4dnn1n/reports/_components/ReportPageSizeSelect.tsx`:

```tsx
"use client";

const OPTIONS = ["25", "50", "100", "all"] as const;

export function ReportPageSizeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (size: string) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-neutral-500 dark:text-neutral-400">Ver</span>
      <select
        title="Registros por página"
        className="h-9 rounded-lg border-[1.5px] border-stroke bg-transparent px-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "Todos" : o}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useReportsTable`
Expected: PASS (7/7)

- [ ] **Step 5: Commit**

```bash
git add src/app/4dnn1n/reports/_hooks/useReportsTable.ts \
        src/app/4dnn1n/reports/_components/ReportPageSizeSelect.tsx \
        tests/app/4dnn1n/reports/_hooks/useReportsTable.test.ts
git commit -m "feat(reports): add URL-synced server pagination hook for the Reportes module"
```

---

### Task 2: File download mechanism (`downloadFile` + `ExportReportButton`)

**Files:**
- Create: `src/lib/download.ts`
- Create: `src/app/4dnn1n/reports/_components/ExportReportButton.tsx`
- Test: `tests/lib/download.test.ts`
- Test: `tests/app/4dnn1n/reports/_components/ExportReportButton.test.tsx`

**Interfaces:**
- Consumes: `ApiError`, `getXsrfToken`, `csrf` from `@/lib/api` (all already exported).
- Produces: `downloadFile(path: string, fallbackFilename: string): Promise<void>` — consumed by `ExportReportButton` only (no other task calls it directly).
- Produces: `<ExportReportButton path="/api/reports/sales/export" params={exportParams} fallbackFilename="Reporte_Ventas.xlsx" />` — consumed by every report page task (5–10).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/lib/download.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { downloadFile } from "@/lib/download";
import { ApiError } from "@/lib/api";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return {
    ...actual,
    csrf: vi.fn().mockResolvedValue(undefined),
    getXsrfToken: vi.fn(() => "test-token"),
  };
});

describe("downloadFile", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it("descarga el archivo usando el filename del header Content-Disposition", async () => {
    // Arrange
    const headers = new Headers({
      "Content-Disposition": 'attachment; filename="Reporte_Ventas_23-09-2026.xlsx"',
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers,
      blob: vi.fn().mockResolvedValue(new Blob(["data"])),
    });
    const clickSpy = vi.fn();
    const anchor = { click: clickSpy, href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "fallback.xlsx");

    // Assert
    expect(anchor.download).toBe("Reporte_Ventas_23-09-2026.xlsx");
    expect(clickSpy).toHaveBeenCalled();
  });

  it("usa fallbackFilename cuando no hay header Content-Disposition", async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      blob: vi.fn().mockResolvedValue(new Blob(["data"])),
    });
    const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "fallback.xlsx");

    // Assert
    expect(anchor.download).toBe("fallback.xlsx");
  });

  it("lanza ApiError con el mensaje del backend cuando la respuesta no es ok", async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({ message: "No tiene permisos para exportar este reporte" }),
    });

    // Act & Assert
    await expect(downloadFile("/api/reports/unsent-carnets/export", "f.xlsx")).rejects.toThrow(
      "No tiene permisos para exportar este reporte",
    );
    await expect(downloadFile("/api/reports/unsent-carnets/export", "f.xlsx")).rejects.toBeInstanceOf(ApiError);
  });

  it("llama csrf antes de hacer fetch", async () => {
    // Arrange
    const { csrf } = await import("@/lib/api");
    const callOrder: string[] = [];
    (csrf as any).mockImplementation(async () => {
      callOrder.push("csrf");
    });
    global.fetch = vi.fn().mockImplementation(async () => {
      callOrder.push("fetch");
      return { ok: true, headers: new Headers(), blob: vi.fn().mockResolvedValue(new Blob()) };
    });
    const anchor = { click: vi.fn(), href: "", download: "", remove: vi.fn() } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation((n) => n);

    // Act
    await downloadFile("/api/reports/sales/export", "f.xlsx");

    // Assert
    expect(callOrder).toEqual(["csrf", "fetch"]);
  });
});
```

```tsx
// tests/app/4dnn1n/reports/_components/ExportReportButton.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportReportButton } from "@/app/4dnn1n/reports/_components/ExportReportButton";
import { downloadFile } from "@/lib/download";
import { alert } from "@/lib/alert";

vi.mock("@/lib/download", () => ({ downloadFile: vi.fn() }));
vi.mock("@/lib/alert", () => ({ alert: { error: vi.fn() } }));

describe("ExportReportButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama downloadFile con la ruta y los params serializados en el query string", async () => {
    // Arrange
    (downloadFile as any).mockResolvedValue(undefined);

    // Act
    render(
      <ExportReportButton
        path="/api/reports/sales/export"
        params={{ from: "2026-01-01", franchise_id: "" }}
        fallbackFilename="Reporte_Ventas.xlsx"
      />,
    );
    fireEvent.click(screen.getByRole("button"));

    // Assert
    await waitFor(() =>
      expect(downloadFile).toHaveBeenCalledWith(
        "/api/reports/sales/export?from=2026-01-01",
        "Reporte_Ventas.xlsx",
      ),
    );
  });

  it("muestra una alerta de error si downloadFile falla", async () => {
    // Arrange
    (downloadFile as any).mockRejectedValue(new Error("Error 500"));

    // Act
    render(<ExportReportButton path="/api/reports/sales/export" params={{}} fallbackFilename="f.xlsx" />);
    fireEvent.click(screen.getByRole("button"));

    // Assert
    await waitFor(() => expect(alert.error).toHaveBeenCalled());
  });

  it("deshabilita el botón mientras exporta", async () => {
    // Arrange
    let resolveDownload: () => void = () => {};
    (downloadFile as any).mockReturnValue(new Promise<void>((res) => { resolveDownload = res; }));

    // Act
    render(<ExportReportButton path="/api/reports/sales/export" params={{}} fallbackFilename="f.xlsx" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Assert
    await waitFor(() => expect(button).toBeDisabled());
    resolveDownload();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- download ExportReportButton`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement `downloadFile`**

`src/lib/download.ts`:

```ts
import { ApiError, type ApiErrorData, csrf, getXsrfToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Downloads a file from an authenticated backend endpoint and triggers the
 * browser's save dialog. Deliberately separate from apiFetch — that helper
 * always calls res.json(), which breaks on a binary .xlsx response body.
 *
 * @param path Backend path including any query string, e.g.
 *   "/api/reports/sales/export?from=2026-01-01".
 * @param fallbackFilename Used only if the server's Content-Disposition
 *   header can't be read (e.g. CORS exposed_headers misconfigured — the
 *   backend already sets this correctly, see api-cm config/cors.php).
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  await csrf();

  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "X-XSRF-TOKEN": getXsrfToken() ?? "" },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as ApiErrorData;
    throw new ApiError(data?.message || `Error ${res.status} al exportar`, res.status, data);
  }

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const filename = match?.[1] || fallbackFilename;

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
```

- [ ] **Step 4: Implement `ExportReportButton`**

`src/app/4dnn1n/reports/_components/ExportReportButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui-elements/button";
import { downloadFile } from "@/lib/download";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

export function ExportReportButton({
  path,
  params,
  fallbackFilename,
  label = "Generar reporte",
}: {
  path: string;
  params: Record<string, string | undefined>;
  fallbackFilename: string;
  label?: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, v);
      }
      const query = qs.toString();
      await downloadFile(`${path}${query ? `?${query}` : ""}`, fallbackFilename);
    } catch (err) {
      await alert.error("No se pudo exportar", getApiErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outlinePrimary"
      size="small"
      shape="rounded"
      className="h-9 shrink-0"
      onClick={handleExport}
      disabled={isExporting}
      title={label}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">{isExporting ? "Generando..." : label}</span>
    </Button>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- download ExportReportButton`
Expected: PASS (4/4 + 3/3)

- [ ] **Step 6: Commit**

```bash
git add src/lib/download.ts src/app/4dnn1n/reports/_components/ExportReportButton.tsx \
        tests/lib/download.test.ts tests/app/4dnn1n/reports/_components/ExportReportButton.test.tsx
git commit -m "feat(reports): add file-download mechanism and export button"
```

---

### Task 3: `CounselorSearchSelect` (debounced async autocomplete)

**Files:**
- Create: `src/app/4dnn1n/reports/_components/CounselorSearchSelect.tsx`
- Test: `tests/app/4dnn1n/reports/_components/CounselorSearchSelect.test.tsx`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/api`, `GET /api/reports/catalogs/counselors?search=` (backend, min 2 chars, max 20 results, role-scoped — already built and merged).
- Produces: `<CounselorSearchSelect value={counselorId} onChange={setCounselorId} />` — consumed by Task 5 (Ventas, autocomplete) and Task 6 (Cartera, select). The backend's existing 20-result cap makes this the better fit for both, over a giant unfiltered dropdown — searching narrows past the cap.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/app/4dnn1n/reports/_components/CounselorSearchSelect.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CounselorSearchSelect } from "@/app/4dnn1n/reports/_components/CounselorSearchSelect";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("CounselorSearchSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("no llama a la API con menos de 2 caracteres", async () => {
    // Arrange
    render(<CounselorSearchSelect value="" onChange={vi.fn()} />);

    // Act
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "a" } });
    vi.advanceTimersByTime(500);

    // Assert
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("busca (debounced) al escribir 2+ caracteres", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }],
    });

    // Act
    render(<CounselorSearchSelect value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
    vi.advanceTimersByTime(400);
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());

    // Assert
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/reports/catalogs/counselors?search=an",
    );
  });

  it("selecciona un resultado y llama onChange con el id", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 5, name: "ANA", lastname: "GÓMEZ" }],
    });
    const onChange = vi.fn();

    // Act
    render(<CounselorSearchSelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "an" } });
    vi.advanceTimersByTime(400);
    await waitFor(() => screen.getByText(/ANA GÓMEZ/i));
    fireEvent.click(screen.getByText(/ANA GÓMEZ/i));

    // Assert
    expect(onChange).toHaveBeenCalledWith("5");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CounselorSearchSelect`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

`src/app/4dnn1n/reports/_components/CounselorSearchSelect.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type CounselorOption = { id: number; name: string; lastname: string };

export function CounselorSearchSelect({
  value,
  onChange,
  placeholder = "Buscar asesor...",
}: {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CounselorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (v.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await apiFetch<{ data: CounselorOption[] }>(
        `/api/reports/catalogs/counselors?search=${encodeURIComponent(v.trim())}`,
      );
      setResults(res.data ?? []);
    }, 300);
  };

  const select = (c: CounselorOption) => {
    onChange(String(c.id));
    setSelectedLabel(`${c.name} ${c.lastname}`);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    setSelectedLabel("");
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <input
        type="text"
        role="textbox"
        className="h-9 w-full sm:w-56 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        placeholder={value ? selectedLabel || placeholder : placeholder}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {value && !open && (
        <button
          type="button"
          onClick={clear}
          title="Limpiar asesor"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-5 hover:text-red-500 dark:text-dark-6"
        >
          ×
        </button>
      )}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full sm:w-56 max-h-52 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-dark-5 dark:text-dark-6">Sin resultados</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                className="w-full px-3 py-2 text-left text-sm uppercase text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
                onClick={() => select(c)}
              >
                {c.name} {c.lastname}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CounselorSearchSelect`
Expected: PASS (3/3)

- [ ] **Step 5: Commit**

```bash
git add src/app/4dnn1n/reports/_components/CounselorSearchSelect.tsx \
        tests/app/4dnn1n/reports/_components/CounselorSearchSelect.test.tsx
git commit -m "feat(reports): add debounced counselor search select"
```

---

### Task 4: Sidebar entry + Reports hub page

**Files:**
- Modify: `src/components/Layouts/sidebar/data/index.ts`
- Create: `src/app/4dnn1n/reports/page.tsx`
- Test: `tests/app/4dnn1n/reports/page.test.tsx`

**Interfaces:**
- Produces: `/4dnn1n/reports` route, linked from the sidebar, reachable by both `type===1` and `type===2`.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/app/4dnn1n/reports/page.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportsPage from "@/app/4dnn1n/reports/page";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));

describe("ReportsPage", () => {
  it("muestra las 6 tarjetas para super admin, incluida Carnets No Enviados", () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });

    // Act
    render(<ReportsPage />);

    // Assert
    expect(screen.getByText(/Ventas/i)).toBeInTheDocument();
    expect(screen.getByText(/Cartera/i)).toBeInTheDocument();
    expect(screen.getByText(/Resumen de Afiliados/i)).toBeInTheDocument();
    expect(screen.getByText(/^Citas$/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin Renovación/i)).toBeInTheDocument();
    expect(screen.getByText(/Carnets No Enviados/i)).toBeInTheDocument();
  });

  it("oculta la tarjeta de Carnets No Enviados para franquicia", () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<ReportsPage />);

    // Assert
    expect(screen.getByText(/Ventas/i)).toBeInTheDocument();
    expect(screen.queryByText(/Carnets No Enviados/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reports/page`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Add the sidebar entry**

In `src/components/Layouts/sidebar/data/index.ts`, add `BarChart3` to the `lucide-react` import list and a new item (placed after "Franquicias", before "Administración de contenido" — visible to both roles, so no `superAdminOnly`):

```ts
import {
  Briefcase,
  Stethoscope,
  Users,
  Building2,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  Phone,
  FileText,
  Settings,
  BarChart3, // Reportes
} from "lucide-react";
```

```ts
      {
        title: "Franquicias",
        icon: Building2,
        url: "/4dnn1n/franchises",
        items: [],
      },
      {
        title: "Reportes",
        icon: BarChart3,
        url: "/4dnn1n/reports",
        items: [],
      },
      {
        title: "Administración de contenido",
```

- [ ] **Step 4: Implement the hub page**

`src/app/4dnn1n/reports/page.tsx` (modeled directly on `content/page.tsx`, but visible to both roles — no redirect guard — with the 6th card gated per-card instead of the whole page):

```tsx
"use client";

import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Users,
  CalendarDays,
  UserX,
  MessageSquareWarning,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

type ReportCard = {
  href: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
  superAdminOnly?: boolean;
};

const CARDS: ReportCard[] = [
  {
    href: "/4dnn1n/reports/sales",
    icon: TrendingUp,
    title: "Ventas",
    description: "Ventas nuevas y renovaciones en un rango de fechas, con totales.",
  },
  {
    href: "/4dnn1n/reports/balance",
    icon: Wallet,
    title: "Cartera",
    description: "Afiliados con saldo pendiente por asesor.",
  },
  {
    href: "/4dnn1n/reports/affiliates-summary",
    icon: Users,
    title: "Resumen de Afiliados",
    description: "Indicadores de titulares y beneficiarios, activos e inactivos.",
  },
  {
    href: "/4dnn1n/reports/appointments",
    icon: CalendarDays,
    title: "Citas",
    description: "Citas médicas por médico y rango de fechas.",
  },
  {
    href: "/4dnn1n/reports/non-renewed-affiliates",
    icon: UserX,
    title: "Sin Renovación",
    description: "Titulares con contrato vencido que aún no han renovado.",
  },
  {
    href: "/4dnn1n/reports/unsent-carnets",
    icon: MessageSquareWarning,
    title: "Carnets No Enviados",
    description: "Carnets que aún no se han confirmado como enviados por WhatsApp.",
    superAdminOnly: true,
  },
];

export default function ReportsPage() {
  usePageTitle("Reportes");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const visibleCards = CARDS.filter((c) => !c.superAdminOnly || isSuperAdmin);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">Reportes</h1>
        <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">
          Consulta y exporta los reportes operativos del panel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visibleCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 shadow-sm transition hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <c.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">{c.title}</h2>
              <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">{c.description}</p>
            </div>
            <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
              Ver reporte →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- reports/page`
Expected: PASS (2/2)

- [ ] **Step 6: Commit**

```bash
git add src/components/Layouts/sidebar/data/index.ts src/app/4dnn1n/reports/page.tsx \
        tests/app/4dnn1n/reports/page.test.tsx
git commit -m "feat(reports): add Reportes sidebar entry and hub page"
```

---

### Task 5: Report 1 — Ventas (`/4dnn1n/reports/sales`)

**Files:**
- Create: `src/app/4dnn1n/reports/sales/types.ts`
- Create: `src/app/4dnn1n/reports/sales/fetch.ts`
- Create: `src/app/4dnn1n/reports/sales/_components/columns.tsx`
- Create: `src/app/4dnn1n/reports/sales/page.tsx`
- Test: `tests/app/4dnn1n/reports/sales/fetch.test.ts`
- Test: `tests/app/4dnn1n/reports/sales/page.test.tsx`

**Interfaces:**
- Consumes: `useReportsTable`, `ReportPageSizeSelect`, `ExportReportButton`, `CounselorSearchSelect` (Tasks 1–3); `getDepartments`/`getCitiesByDepartment` NOT needed here (Ventas has no geo filter per the backend contract).
- Backend contract (already built, `api-cm` `develop`): `GET /api/reports/sales?from&to&franchise_id&counselor_id&per_page` → `{message, data: SaleRow[], meta, totals: {new_count, new_value, renewal_count, renewal_value}}`. `GET /api/reports/sales/export` (same query params) → `.xlsx` download.
- This task establishes the per-report template every remaining report task (6–10) follows structurally.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/sales/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSalesReport } from "@/app/4dnn1n/reports/sales/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("sales/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getSalesReport", () => {
    it("construye el query string con los params presentes", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
        totals: { new_count: 0, new_value: 0, renewal_count: 0, renewal_value: 0 },
      });

      // Act
      await getSalesReport({ from: "2026-01-01", page: 1, per_page: "25" });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/reports/sales?from=2026-01-01&page=1&per_page=25",
      );
    });

    it("retorna data, meta y totals de la respuesta", async () => {
      // Arrange
      const mockTotals = { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 };
      (apiFetch as any).mockResolvedValue({
        data: [{ id: 1, tipo_venta: "Nuevo" }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
        totals: mockTotals,
      });

      // Act
      const result = await getSalesReport({});

      // Assert
      expect(result.data).toEqual([{ id: 1, tipo_venta: "Nuevo" }]);
      expect(result.totals).toEqual(mockTotals);
    });
  });
});
```

```tsx
// tests/app/4dnn1n/reports/sales/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SalesReportPage from "@/app/4dnn1n/reports/sales/page";
import { useAuth } from "@/context/AuthContext";
import { getSalesReport } from "@/app/4dnn1n/reports/sales/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/sales",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/sales/fetch", () => ({
  getSalesReport: vi.fn(),
}));

describe("SalesReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getSalesReport as any).mockResolvedValue({
      data: [
        {
          id: 1,
          payment_date: "2026-01-15",
          fecha_desde: "2026-01-15",
          validity_end: "2027-01-15",
          validity: "2026-01-15",
          counselor: "PEDRO GOMEZ",
          name: "ANA LOPEZ",
          franchise: "FRANQUICIA CENTRO",
          tipo_venta: "Nuevo",
          valor_venta: 150000,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      totals: { new_count: 1, new_value: 150000, renewal_count: 0, renewal_value: 0 },
    });
  });

  it("renderiza las filas del reporte y los totales", async () => {
    // Act
    render(<SalesReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    expect(screen.getByText(/Nuevo/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/sales`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Implement `types.ts`**

`src/app/4dnn1n/reports/sales/types.ts`:

```ts
export type ApiSaleRow = {
  id: number;
  payment_date: string;
  fecha_desde: string;
  validity_end: string;
  validity: string;
  counselor: string | null;
  name: string;
  franchise: string | null;
  tipo_venta: "Nuevo" | "Renovación";
  valor_venta: number;
};

export type SalesTotals = {
  new_count: number;
  new_value: number;
  renewal_count: number;
  renewal_value: number;
};

export type SalesMeta = { current_page: number; last_page: number; per_page: number; total: number };

export type SalesReportResponse = { data: ApiSaleRow[]; meta: SalesMeta; totals: SalesTotals };
```

- [ ] **Step 4: Implement `fetch.ts`**

`src/app/4dnn1n/reports/sales/fetch.ts`:

```ts
import { apiFetch } from "@/lib/api";
import type { ApiSaleRow, SalesReportResponse } from "./types";

export type { ApiSaleRow, SalesTotals, SalesMeta, SalesReportResponse } from "./types";

export type FranchiseOption = { id: number; name: string };

export async function getSalesReport(
  params: Record<string, string | number | undefined>,
): Promise<SalesReportResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{
    message: string;
    data: ApiSaleRow[];
    meta: SalesReportResponse["meta"];
    totals: SalesReportResponse["totals"];
  }>(`/api/reports/sales${query}`);
  return { data: res.data ?? [], meta: res.meta, totals: res.totals };
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `_components/columns.tsx`**

`src/app/4dnn1n/reports/sales/_components/columns.tsx`:

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiSaleRow } from "../fetch";

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function formatMoney(value: number): string {
  return `$ ${value.toLocaleString("es-CO")}`;
}

export function buildSalesColumns(): ColumnDef<ApiSaleRow>[] {
  return [
    {
      accessorKey: "payment_date",
      header: "Fecha Venta",
      cell: ({ row }) => formatDate(row.original.payment_date),
    },
    {
      accessorKey: "fecha_desde",
      header: "Desde",
      cell: ({ row }) => formatDate(row.original.fecha_desde),
    },
    {
      accessorKey: "validity_end",
      header: "Hasta",
      cell: ({ row }) => formatDate(row.original.validity_end),
    },
    {
      accessorKey: "validity",
      header: "Afiliación",
      cell: ({ row }) => formatDate(row.original.validity),
    },
    {
      accessorKey: "counselor",
      header: "Asesor",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.counselor ?? "-",
    },
    {
      accessorKey: "name",
      header: "Nombre Afiliado",
      meta: { uppercase: true },
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "franchise",
      header: "Franquicia",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.franchise ?? "-",
    },
    {
      accessorKey: "tipo_venta",
      header: "Tipo Venta",
      cell: ({ row }) => {
        const isNew = row.original.tipo_venta === "Nuevo";
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isNew
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            }`}
          >
            {row.original.tipo_venta}
          </span>
        );
      },
    },
    {
      accessorKey: "valor_venta",
      header: "Valor Venta",
      cell: ({ row }) => formatMoney(row.original.valor_venta),
    },
  ];
}
```

- [ ] **Step 6: Implement `page.tsx`**

`src/app/4dnn1n/reports/sales/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { CounselorSearchSelect } from "../_components/CounselorSearchSelect";
import { getSalesReport, getActiveFranchises, type ApiSaleRow, type SalesTotals, type FranchiseOption } from "./fetch";
import { buildSalesColumns } from "./_components/columns";

export default function SalesReportPage() {
  usePageTitle("Reporte de Ventas");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, meta, extra, loading, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiSaleRow, { totals: SalesTotals }>(getSalesReport, {
      filterKeys: ["from", "to", "franchise_id", "counselor_id"],
    });
  // Same response the table already fetched — never a second call just for these 4 numbers.
  const totals = extra?.totals ?? { new_count: 0, new_value: 0, renewal_count: 0, renewal_value: 0 };

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildSalesColumns(), []);

  const extraFilters = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <DatePickerWithToday
          value={filters.from || ""}
          onChange={(v) => setFilter("from", v)}
          placeholder="Desde"
          className="h-9 w-full sm:w-auto"
        />
        <DatePickerWithToday
          value={filters.to || ""}
          onChange={(v) => setFilter("to", v)}
          placeholder="Hasta"
          className="h-9 w-full sm:w-auto"
        />
      </div>

      <CounselorSearchSelect
        value={filters.counselor_id || ""}
        onChange={(v) => setFilter("counselor_id", v)}
      />

      {isSuperAdmin && (
        <select
          title="Filtrar por Franquicia"
          value={filters.franchise_id || ""}
          onChange={(e) => setFilter("franchise_id", e.target.value)}
          className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        >
          <option value="">Franquicia (Todas)</option>
          {franchises.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && meta.current_page === 1 && data.length === 0} />

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <p className="text-xs text-dark-5 dark:text-dark-6">Nuevos</p>
          <p className="text-lg font-bold text-dark dark:text-white">{totals.new_count}</p>
          <p className="text-sm text-dark-5 dark:text-dark-6">$ {totals.new_value.toLocaleString("es-CO")}</p>
        </div>
        <div className="rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark">
          <p className="text-xs text-dark-5 dark:text-dark-6">Renovaciones</p>
          <p className="text-lg font-bold text-dark dark:text-white">{totals.renewal_count}</p>
          <p className="text-sm text-dark-5 dark:text-dark-6">$ {totals.renewal_value.toLocaleString("es-CO")}</p>
        </div>
      </div>

      <DataTable
        title="Reporte de Ventas"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/sales/export"
            params={exportParams}
            fallbackFilename="Reporte_Ventas.xlsx"
          />
        }
      />
    </>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- reports/sales`
Expected: PASS (2/2 fetch + 1/1 page)

- [ ] **Step 8: Manual check**

Run `npm run dev`, sign in as super admin, visit `/4dnn1n/reports/sales`. Confirm: table renders, date filters update the URL, franchise select appears, counselor search debounces, "Generar reporte" downloads an `.xlsx` named `Reporte_Ventas_dd-mm-yyyy.xlsx` (per the backend's actual filename convention — `fallbackFilename` here is a placeholder in case `Content-Disposition` isn't read, the real name always comes from the header).

- [ ] **Step 9: Commit**

```bash
git add src/app/4dnn1n/reports/sales tests/app/4dnn1n/reports/sales
git commit -m "feat(reports): add Ventas report page"
```

---

### Task 6: Report 2 — Cartera (`/4dnn1n/reports/balance`)

**Files:**
- Create: `src/app/4dnn1n/reports/balance/types.ts`, `fetch.ts`, `_components/columns.tsx`, `page.tsx`
- Test: `tests/app/4dnn1n/reports/balance/fetch.test.ts`, `page.test.tsx`

**Interfaces:**
- Backend contract: `GET /api/reports/balance?franchise_id&counselor_id&per_page` (default `per_page=15`, per the backend's own exception for this report) → `{message, data: BalanceRow[], meta, total_balance}`. Export at `/api/reports/balance/export`.
- Consumes: `useReportsTable`, `ReportPageSizeSelect`, `ExportReportButton`, `CounselorSearchSelect` (this time as a plain select-style use — no autocomplete-only framing needed, same component).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/balance/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBalanceReport } from "@/app/4dnn1n/reports/balance/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("balance/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string y retorna data, meta y total_balance", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "JUAN PEREZ", balance: 50000 }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      total_balance: 50000,
    });

    // Act
    const result = await getBalanceReport({ counselor_id: "4" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/balance?counselor_id=4");
    expect(result.total_balance).toBe(50000);
    expect(result.data).toHaveLength(1);
  });
});
```

```tsx
// tests/app/4dnn1n/reports/balance/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BalanceReportPage from "@/app/4dnn1n/reports/balance/page";
import { useAuth } from "@/context/AuthContext";
import { getBalanceReport } from "@/app/4dnn1n/reports/balance/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/balance",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/balance/fetch", () => ({ getBalanceReport: vi.fn() }));

describe("BalanceReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getBalanceReport as any).mockResolvedValue({
      data: [{ id: 1, counselor: "PEDRO GOMEZ", name: "JUAN PEREZ", balance: 50000, validity: "2026-01-01" }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      total_balance: 50000,
    });
  });

  it("renderiza las filas y el total de saldo", async () => {
    // Act
    render(<BalanceReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument());
    expect(screen.getByText(/50.000/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/balance`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/app/4dnn1n/reports/balance/types.ts
export type ApiBalanceRow = {
  id: number;
  counselor: string | null;
  name: string;
  balance: number;
  validity: string;
};

export type BalanceMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type BalanceReportResponse = { data: ApiBalanceRow[]; meta: BalanceMeta; total_balance: number };
```

- [ ] **Step 4: Implement `fetch.ts`**

```ts
// src/app/4dnn1n/reports/balance/fetch.ts
import { apiFetch } from "@/lib/api";
import type { ApiBalanceRow, BalanceReportResponse } from "./types";

export type { ApiBalanceRow, BalanceMeta, BalanceReportResponse } from "./types";
export type FranchiseOption = { id: number; name: string };

export async function getBalanceReport(
  params: Record<string, string | number | undefined>,
): Promise<BalanceReportResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{
    message: string;
    data: ApiBalanceRow[];
    meta: BalanceReportResponse["meta"];
    total_balance: number;
  }>(`/api/reports/balance${query}`);
  return { data: res.data ?? [], meta: res.meta, total_balance: res.total_balance };
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `_components/columns.tsx`**

```tsx
// src/app/4dnn1n/reports/balance/_components/columns.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiBalanceRow } from "../fetch";

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function buildBalanceColumns(): ColumnDef<ApiBalanceRow>[] {
  return [
    {
      accessorKey: "counselor",
      header: "Asesor",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.counselor ?? "-",
    },
    {
      accessorKey: "name",
      header: "Nombre Afiliado",
      meta: { uppercase: true },
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "balance",
      header: "Valor Saldo",
      cell: ({ row }) => `$ ${row.original.balance.toLocaleString("es-CO")}`,
    },
    {
      accessorKey: "validity",
      header: "Fecha de Ingreso",
      cell: ({ row }) => formatDate(row.original.validity),
    },
  ];
}
```

- [ ] **Step 6: Implement `page.tsx`**

```tsx
// src/app/4dnn1n/reports/balance/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { CounselorSearchSelect } from "../_components/CounselorSearchSelect";
import { getBalanceReport, getActiveFranchises, type ApiBalanceRow, type FranchiseOption } from "./fetch";
import { buildBalanceColumns } from "./_components/columns";

export default function BalanceReportPage() {
  usePageTitle("Reporte de Cartera");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, meta, extra, loading, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiBalanceRow, { total_balance: number }>(getBalanceReport, {
      filterKeys: ["franchise_id", "counselor_id"],
    });
  // Same response the table already fetched — never a second call just for this number.
  const totalBalance = extra?.total_balance ?? 0;

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildBalanceColumns(), []);

  const extraFilters = (
    <>
      <CounselorSearchSelect
        value={filters.counselor_id || ""}
        onChange={(v) => setFilter("counselor_id", v)}
        placeholder="Filtrar por asesor..."
      />

      {isSuperAdmin && (
        <select
          title="Filtrar por Franquicia"
          value={filters.franchise_id || ""}
          onChange={(e) => setFilter("franchise_id", e.target.value)}
          className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        >
          <option value="">Franquicia (Todas)</option>
          {franchises.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && meta.current_page === 1 && data.length === 0} />

      <div className="mb-4 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-gray-dark sm:w-64">
        <p className="text-xs text-dark-5 dark:text-dark-6">Total Saldo</p>
        <p className="text-lg font-bold text-dark dark:text-white">
          $ {totalBalance.toLocaleString("es-CO")}
        </p>
      </div>

      <DataTable
        title="Reporte de Cartera"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/balance/export"
            params={exportParams}
            fallbackFilename="Reporte_Cartera.xlsx"
          />
        }
      />
    </>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- reports/balance`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/4dnn1n/reports/balance tests/app/4dnn1n/reports/balance
git commit -m "feat(reports): add Cartera report page"
```

---

### Task 7: Report 3 — Resumen de Afiliados (`/4dnn1n/reports/affiliates-summary`)

**Files:**
- Create: `src/app/4dnn1n/reports/affiliates-summary/types.ts`, `fetch.ts`, `page.tsx`
- Test: `tests/app/4dnn1n/reports/affiliates-summary/fetch.test.ts`, `page.test.tsx`

**Interfaces:**
- Backend contract: `GET /api/reports/affiliates-summary?from&to&city_id&department_id&franchise_id` → `{message, data: {titulares, titulares_activos, titulares_inactivos, beneficiarios, beneficiarios_activos, beneficiarios_inactivos}, from, to}`. No pagination — **does not use `useReportsTable`**, per this plan's Review Focus item. Export at `.../affiliates-summary/export`.
- Consumes: `getDepartments`/`getCitiesByDepartment` from `@/lib/geo` (already shared, no changes needed).

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/affiliates-summary/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAffiliatesSummaryReport } from "@/app/4dnn1n/reports/affiliates-summary/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("affiliates-summary/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string y retorna los 6 indicadores", async () => {
    // Arrange
    const mockData = {
      titulares: 100,
      titulares_activos: 80,
      titulares_inactivos: 20,
      beneficiarios: 40,
      beneficiarios_activos: 30,
      beneficiarios_inactivos: 10,
    };
    (apiFetch as any).mockResolvedValue({ data: mockData, from: null, to: null });

    // Act
    const result = await getAffiliatesSummaryReport({ city_id: "5" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/affiliates-summary?city_id=5");
    expect(result).toEqual(mockData);
  });
});
```

```tsx
// tests/app/4dnn1n/reports/affiliates-summary/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AffiliatesSummaryPage from "@/app/4dnn1n/reports/affiliates-summary/page";
import { useAuth } from "@/context/AuthContext";
import { getAffiliatesSummaryReport } from "@/app/4dnn1n/reports/affiliates-summary/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
// page.tsx imports all four of these from "./fetch" (which re-exports the geo
// two from @/lib/geo) — the mock factory must cover all four, or the two it
// omits come back `undefined` and crash the page on mount.
vi.mock("@/app/4dnn1n/reports/affiliates-summary/fetch", () => ({
  getAffiliatesSummaryReport: vi.fn(),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
  getDepartments: vi.fn().mockResolvedValue([]),
  getCitiesByDepartment: vi.fn().mockResolvedValue([]),
}));

describe("AffiliatesSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getAffiliatesSummaryReport as any).mockResolvedValue({
      titulares: 100,
      titulares_activos: 80,
      titulares_inactivos: 20,
      beneficiarios: 40,
      beneficiarios_activos: 30,
      beneficiarios_inactivos: 10,
    });
  });

  it("renderiza los 6 indicadores", async () => {
    // Act
    render(<AffiliatesSummaryPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("100")).toBeInTheDocument());
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/affiliates-summary`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/app/4dnn1n/reports/affiliates-summary/types.ts
export type AffiliatesSummaryIndicators = {
  titulares: number;
  titulares_activos: number;
  titulares_inactivos: number;
  beneficiarios: number;
  beneficiarios_activos: number;
  beneficiarios_inactivos: number;
};
```

- [ ] **Step 4: Implement `fetch.ts`**

```ts
// src/app/4dnn1n/reports/affiliates-summary/fetch.ts
import { apiFetch } from "@/lib/api";
import type { AffiliatesSummaryIndicators } from "./types";

export type { AffiliatesSummaryIndicators } from "./types";
export type FranchiseOption = { id: number; name: string };
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";

export async function getAffiliatesSummaryReport(
  params: Record<string, string | number | undefined>,
): Promise<AffiliatesSummaryIndicators> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{ message: string; data: AffiliatesSummaryIndicators }>(
    `/api/reports/affiliates-summary${query}`,
  );
  return res.data;
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `page.tsx`**

No table, no `useReportsTable` — plain local state + one fetch on filter change. Cascading department→city follows `doctors/_hooks/useDoctorFilters.ts`'s pattern (summarized inline here since this page's filter set is small enough not to need its own hook file).

```tsx
// src/app/4dnn1n/reports/affiliates-summary/page.tsx
"use client";

import { useEffect, useState } from "react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { ExportReportButton } from "../_components/ExportReportButton";
import {
  getAffiliatesSummaryReport,
  getActiveFranchises,
  getDepartments,
  getCitiesByDepartment,
  type AffiliatesSummaryIndicators,
  type FranchiseOption,
} from "./fetch";
import type { Department, City } from "@/types/geo";

const EMPTY: AffiliatesSummaryIndicators = {
  titulares: 0,
  titulares_activos: 0,
  titulares_inactivos: 0,
  beneficiarios: 0,
  beneficiarios_activos: 0,
  beneficiarios_inactivos: 0,
};

export default function AffiliatesSummaryPage() {
  usePageTitle("Resumen de Afiliados");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [franchiseId, setFranchiseId] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);

  useEffect(() => {
    getDepartments().then(setDepartments);
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!departmentId) {
      setCities([]);
      setCityId("");
      return;
    }
    setCitiesLoading(true);
    getCitiesByDepartment(departmentId)
      .then(setCities)
      .finally(() => setCitiesLoading(false));
  }, [departmentId]);

  const [indicators, setIndicators] = useState<AffiliatesSummaryIndicators>(EMPTY);
  const [loading, setLoading] = useState(true);

  const filters = {
    from: from || undefined,
    to: to || undefined,
    city_id: cityId || undefined,
    department_id: !cityId && departmentId ? departmentId : undefined,
    franchise_id: franchiseId || undefined,
  };

  useEffect(() => {
    setLoading(true);
    getAffiliatesSummaryReport(filters)
      .then(setIndicators)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, cityId, departmentId, franchiseId]);

  const cards: { label: string; value: number }[] = [
    { label: "Titulares", value: indicators.titulares },
    { label: "Titulares Activos", value: indicators.titulares_activos },
    { label: "Titulares Inactivos", value: indicators.titulares_inactivos },
    { label: "Beneficiarios", value: indicators.beneficiarios },
    { label: "Beneficiarios Activos", value: indicators.beneficiarios_activos },
    { label: "Beneficiarios Inactivos", value: indicators.beneficiarios_inactivos },
  ];

  return (
    <>
      <LoadingOverlay isLoading={loading && indicators === EMPTY} />

      <div className="rounded-[10px] bg-white px-7.5 pb-7.5 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="mb-4 flex flex-col gap-4">
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
            Resumen de Afiliados
          </h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <DatePickerWithToday value={from} onChange={setFrom} placeholder="Desde" className="h-9 w-full sm:w-auto" />
            <DatePickerWithToday value={to} onChange={setTo} placeholder="Hasta" className="h-9 w-full sm:w-auto" />

            <select
              title="Filtrar por Departamento"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : "")}
              className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            >
              <option value="">Departamento (Todos)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              title="Filtrar por Ciudad"
              value={cityId}
              onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
              disabled={!departmentId || citiesLoading}
              className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            >
              <option value="">Ciudad (Todas)</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {isSuperAdmin && (
              <select
                title="Filtrar por Franquicia"
                value={franchiseId}
                onChange={(e) => setFranchiseId(e.target.value)}
                className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              >
                <option value="">Franquicia (Todas)</option>
                {franchises.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}

            <ExportReportButton
              path="/api/reports/affiliates-summary/export"
              params={filters as Record<string, string | undefined>}
              fallbackFilename="Reporte_Resumen_Afiliados.xlsx"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-neutral-200/60 bg-white p-5 text-center dark:border-dark-3 dark:bg-gray-dark"
            >
              <p className="text-3xl font-bold text-dark dark:text-white">{c.value}</p>
              <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">{c.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- reports/affiliates-summary`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/4dnn1n/reports/affiliates-summary tests/app/4dnn1n/reports/affiliates-summary
git commit -m "feat(reports): add Resumen de Afiliados report page (indicator cards, no table)"
```

---

### Task 8: Report 4 — Citas (`/4dnn1n/reports/appointments`)

**Files:**
- Create: `src/app/4dnn1n/reports/appointments/types.ts`, `fetch.ts`, `_components/columns.tsx`, `page.tsx`
- Test: `tests/app/4dnn1n/reports/appointments/fetch.test.ts`, `page.test.tsx`

**Interfaces:**
- Backend contract: `GET /api/reports/appointments?from&to&doctor_id&franchise_id&per_page` → `{message, data: AppointmentRow[], meta}` where each row is `{id, name, doctor, city, date}` (`name` already includes the "(Titular)"/"(Beneficiario)" suffix — the backend does this, not the frontend). Export at `.../appointments/export`.
- Doctor filter: reuses the existing `GET /api/doctors?state=1&per_page=100` (no dedicated reports catalog endpoint was built for doctors — the backend design intentionally reused this general endpoint, see backend spec §2/report-4). If a franchise's doctor catalog ever exceeds 100 active rows, this becomes the same kind of gap `CounselorSearchSelect` solves — extend similarly if that happens; not needed at this module's expected scale.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/appointments/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAppointmentsReport, getActiveDoctors } from "@/app/4dnn1n/reports/appointments/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("appointments (reports)/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAppointmentsReport construye el query string y retorna data/meta", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "ANA LOPEZ (Titular)" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    const result = await getAppointmentsReport({ doctor_id: "9" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/appointments?doctor_id=9");
    expect(result.data).toHaveLength(1);
  });

  it("getActiveDoctors llama /api/doctors?state=1&per_page=100", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ data: [{ id: 1, name: "CARLOS", lastname: "PEREZ" }] });

    // Act
    await getActiveDoctors();

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/doctors?state=1&per_page=100");
  });
});
```

```tsx
// tests/app/4dnn1n/reports/appointments/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AppointmentsReportPage from "@/app/4dnn1n/reports/appointments/page";
import { useAuth } from "@/context/AuthContext";
import { getAppointmentsReport } from "@/app/4dnn1n/reports/appointments/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/appointments",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/appointments/fetch", () => ({
  getAppointmentsReport: vi.fn(),
  getActiveDoctors: vi.fn().mockResolvedValue([]),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("AppointmentsReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getAppointmentsReport as any).mockResolvedValue({
      data: [
        { id: 1, name: "ANA LOPEZ (Titular)", doctor: "CARLOS PEREZ", city: "BOGOTA", date: "2026-09-20" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas del reporte con el color de fecha correspondiente", async () => {
    // Act
    render(<AppointmentsReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText(/ANA LOPEZ \(Titular\)/)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/appointments`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/app/4dnn1n/reports/appointments/types.ts
export type ApiAppointmentReportRow = {
  id: number;
  name: string;
  doctor: string | null;
  city: string | null;
  date: string;
};

export type AppointmentsMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type AppointmentsReportResponse = { data: ApiAppointmentReportRow[]; meta: AppointmentsMeta };
export type DoctorOption = { id: number; name: string; lastname: string };
```

- [ ] **Step 4: Implement `fetch.ts`**

```ts
// src/app/4dnn1n/reports/appointments/fetch.ts
import { apiFetch } from "@/lib/api";
import type { ApiAppointmentReportRow, AppointmentsReportResponse, DoctorOption } from "./types";

export type { ApiAppointmentReportRow, AppointmentsMeta, AppointmentsReportResponse, DoctorOption } from "./types";
export type FranchiseOption = { id: number; name: string };

export async function getAppointmentsReport(
  params: Record<string, string | number | undefined>,
): Promise<AppointmentsReportResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{
    message: string;
    data: ApiAppointmentReportRow[];
    meta: AppointmentsReportResponse["meta"];
  }>(`/api/reports/appointments${query}`);
  return { data: res.data ?? [], meta: res.meta };
}

export async function getActiveDoctors(): Promise<DoctorOption[]> {
  const res = await apiFetch<{ message: string; data: DoctorOption[] }>("/api/doctors?state=1&per_page=100");
  return res.data ?? [];
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `_components/columns.tsx`**

Date coloring per spec: red if `< hoy`, blue if `= hoy`, green if `> hoy`.

```tsx
// src/app/4dnn1n/reports/appointments/_components/columns.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiAppointmentReportRow } from "../fetch";

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function dateColorClass(ymd: string): string {
  const target = new Date(ymd + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (target.getTime() < today.getTime()) return "text-red-600 dark:text-red-400";
  if (target.getTime() === today.getTime()) return "text-blue-600 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}

export function buildAppointmentsReportColumns(): ColumnDef<ApiAppointmentReportRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      meta: { uppercase: true },
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "doctor",
      header: "Médico",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.doctor ?? "-",
    },
    {
      accessorKey: "city",
      header: "Ciudad",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.city ?? "-",
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => (
        <span className={`font-medium ${dateColorClass(row.original.date)}`}>
          {formatDate(row.original.date)}
        </span>
      ),
    },
  ];
}
```

- [ ] **Step 6: Implement `page.tsx`**

```tsx
// src/app/4dnn1n/reports/appointments/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import {
  getAppointmentsReport,
  getActiveDoctors,
  getActiveFranchises,
  type ApiAppointmentReportRow,
  type DoctorOption,
  type FranchiseOption,
} from "./fetch";
import { buildAppointmentsReportColumns } from "./_components/columns";

export default function AppointmentsReportPage() {
  usePageTitle("Reporte de Citas");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, meta, loading, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiAppointmentReportRow>(getAppointmentsReport, {
      filterKeys: ["from", "to", "doctor_id", "franchise_id"],
    });

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    getActiveDoctors().then(setDoctors);
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildAppointmentsReportColumns(), []);

  const extraFilters = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <DatePickerWithToday value={filters.from || ""} onChange={(v) => setFilter("from", v)} placeholder="Desde" className="h-9 w-full sm:w-auto" />
        <DatePickerWithToday value={filters.to || ""} onChange={(v) => setFilter("to", v)} placeholder="Hasta" className="h-9 w-full sm:w-auto" />
      </div>

      <select
        title="Filtrar por Médico"
        value={filters.doctor_id || ""}
        onChange={(e) => setFilter("doctor_id", e.target.value)}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        <option value="">Médico (Todos)</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>{d.name} {d.lastname}</option>
        ))}
      </select>

      {isSuperAdmin && (
        <select
          title="Filtrar por Franquicia"
          value={filters.franchise_id || ""}
          onChange={(e) => setFilter("franchise_id", e.target.value)}
          className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        >
          <option value="">Franquicia (Todas)</option>
          {franchises.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && data.length === 0} />

      <DataTable
        title="Reporte de Citas"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/appointments/export"
            params={exportParams}
            fallbackFilename="Reporte_Citas.xlsx"
          />
        }
      />
    </>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- reports/appointments`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/4dnn1n/reports/appointments tests/app/4dnn1n/reports/appointments
git commit -m "feat(reports): add Citas report page"
```

---

### Task 9: Report 5 — Sin Renovación (`/4dnn1n/reports/non-renewed-affiliates`)

**Files:**
- Create: `src/app/4dnn1n/reports/non-renewed-affiliates/types.ts`, `fetch.ts`, `_components/columns.tsx`, `page.tsx`
- Test: `tests/app/4dnn1n/reports/non-renewed-affiliates/fetch.test.ts`, `page.test.tsx`

**Interfaces:**
- Backend contract: `GET /api/reports/non-renewed-affiliates?from&franchise_id&per_page` (note: **only `from`, no `to`** — the backend always uses today as the implicit upper bound) → `{message, data: NonRenewedRow[], meta}` where each row is `{id, validity_end, name, phone, movil, franchise}`. Export at `.../non-renewed-affiliates/export`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/non-renewed-affiliates/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNonRenewedAffiliatesReport } from "@/app/4dnn1n/reports/non-renewed-affiliates/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("non-renewed-affiliates/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string solo con from (nunca to)", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "MARIA TORRES" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    await getNonRenewedAffiliatesReport({ from: "2026-01-01" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/non-renewed-affiliates?from=2026-01-01");
  });
});
```

```tsx
// tests/app/4dnn1n/reports/non-renewed-affiliates/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NonRenewedAffiliatesPage from "@/app/4dnn1n/reports/non-renewed-affiliates/page";
import { useAuth } from "@/context/AuthContext";
import { getNonRenewedAffiliatesReport } from "@/app/4dnn1n/reports/non-renewed-affiliates/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/non-renewed-affiliates",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/non-renewed-affiliates/fetch", () => ({
  getNonRenewedAffiliatesReport: vi.fn(),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("NonRenewedAffiliatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getNonRenewedAffiliatesReport as any).mockResolvedValue({
      data: [
        { id: 1, validity_end: "2026-01-10", name: "MARIA TORRES", phone: "6011234567", movil: "3001234567", franchise: "FRANQUICIA NORTE" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas del reporte", async () => {
    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/non-renewed-affiliates`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/app/4dnn1n/reports/non-renewed-affiliates/types.ts
export type ApiNonRenewedRow = {
  id: number;
  validity_end: string;
  name: string;
  phone: string | null;
  movil: string;
  franchise: string | null;
};

export type NonRenewedMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type NonRenewedReportResponse = { data: ApiNonRenewedRow[]; meta: NonRenewedMeta };
```

- [ ] **Step 4: Implement `fetch.ts`**

```ts
// src/app/4dnn1n/reports/non-renewed-affiliates/fetch.ts
import { apiFetch } from "@/lib/api";
import type { ApiNonRenewedRow, NonRenewedReportResponse } from "./types";

export type { ApiNonRenewedRow, NonRenewedMeta, NonRenewedReportResponse } from "./types";
export type FranchiseOption = { id: number; name: string };

export async function getNonRenewedAffiliatesReport(
  params: Record<string, string | number | undefined>,
): Promise<NonRenewedReportResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{
    message: string;
    data: ApiNonRenewedRow[];
    meta: NonRenewedReportResponse["meta"];
  }>(`/api/reports/non-renewed-affiliates${query}`);
  return { data: res.data ?? [], meta: res.meta };
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `_components/columns.tsx`**

```tsx
// src/app/4dnn1n/reports/non-renewed-affiliates/_components/columns.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiNonRenewedRow } from "../fetch";

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function buildNonRenewedColumns(): ColumnDef<ApiNonRenewedRow>[] {
  return [
    {
      accessorKey: "validity_end",
      header: "Hasta",
      cell: ({ row }) => formatDate(row.original.validity_end),
    },
    {
      accessorKey: "name",
      header: "Titular",
      meta: { uppercase: true },
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => row.original.phone ?? "-",
    },
    {
      accessorKey: "movil",
      header: "Celular",
      cell: ({ row }) => row.original.movil,
    },
    {
      accessorKey: "franchise",
      header: "Franquicia",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.franchise ?? "-",
    },
  ];
}
```

- [ ] **Step 6: Implement `page.tsx`**

Only a "Desde" date filter — no "Hasta" (matches the backend contract exactly, `to` doesn't exist for this report).

```tsx
// src/app/4dnn1n/reports/non-renewed-affiliates/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import {
  getNonRenewedAffiliatesReport,
  getActiveFranchises,
  type ApiNonRenewedRow,
  type FranchiseOption,
} from "./fetch";
import { buildNonRenewedColumns } from "./_components/columns";

export default function NonRenewedAffiliatesPage() {
  usePageTitle("Clientes Sin Renovación");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, meta, loading, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiNonRenewedRow>(getNonRenewedAffiliatesReport, {
      filterKeys: ["from", "franchise_id"],
    });

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildNonRenewedColumns(), []);

  const extraFilters = (
    <>
      <DatePickerWithToday
        value={filters.from || ""}
        onChange={(v) => setFilter("from", v)}
        placeholder="Vencidos desde"
        className="h-9 w-full sm:w-auto"
      />

      {isSuperAdmin && (
        <select
          title="Filtrar por Franquicia"
          value={filters.franchise_id || ""}
          onChange={(e) => setFilter("franchise_id", e.target.value)}
          className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
        >
          <option value="">Franquicia (Todas)</option>
          {franchises.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && data.length === 0} />

      <DataTable
        title="Clientes Sin Renovación"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/non-renewed-affiliates/export"
            params={exportParams}
            fallbackFilename="Reporte_Sin_Renovacion.xlsx"
          />
        }
      />
    </>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- reports/non-renewed-affiliates`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/4dnn1n/reports/non-renewed-affiliates tests/app/4dnn1n/reports/non-renewed-affiliates
git commit -m "feat(reports): add Sin Renovacion report page"
```

---

### Task 10: Report 6 — Carnets No Enviados (`/4dnn1n/reports/unsent-carnets`)

**Files:**
- Create: `src/app/4dnn1n/reports/unsent-carnets/types.ts`, `fetch.ts`, `_components/columns.tsx`, `page.tsx`
- Test: `tests/app/4dnn1n/reports/unsent-carnets/fetch.test.ts`, `page.test.tsx`

**Interfaces:**
- Backend contract: `GET /api/reports/unsent-carnets?franchise_id&per_page` (super-admin only; **no date filter at all** — the backend deliberately removed it, see `api-cm`'s `UnsentCarnetsReport::candidates()` docblock, commit `f674f27`: it's a live "still unresolved" list, not a historical log) → `{message, data: UnsentCarnetRow[], meta}` where each row is `{date, name, phone, movil, franchise}` (no `id` — this row comes from a `whatsapp_messages` join, not an affiliate; use `date` as part of the React key alongside array index if needed). Export at `.../unsent-carnets/export`.
- This is the ONE page in the module with a hard page-level guard, per this plan's Review Focus item — a franchise user hitting the URL directly must be redirected away, mirroring `content/page.tsx`'s existing pattern, not just shown an empty/403'd table.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/app/4dnn1n/reports/unsent-carnets/fetch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUnsentCarnetsReport } from "@/app/4dnn1n/reports/unsent-carnets/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("unsent-carnets/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string solo con franchise_id y per_page (sin fechas)", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ date: "2026-09-01", name: "PEDRO RUIZ" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    await getUnsentCarnetsReport({ franchise_id: "3", per_page: "50" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/unsent-carnets?franchise_id=3&per_page=50");
  });
});
```

```tsx
// tests/app/4dnn1n/reports/unsent-carnets/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UnsentCarnetsPage from "@/app/4dnn1n/reports/unsent-carnets/page";
import { useAuth } from "@/context/AuthContext";
import { getUnsentCarnetsReport } from "@/app/4dnn1n/reports/unsent-carnets/fetch";

const mockReplace = vi.fn();
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/unsent-carnets",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/unsent-carnets/fetch", () => ({
  getUnsentCarnetsReport: vi.fn(),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("UnsentCarnetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUnsentCarnetsReport as any).mockResolvedValue({
      data: [{ date: "2026-09-01", name: "PEDRO RUIZ", phone: null, movil: "3001112233", franchise: "FRANQUICIA SUR" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas para super admin", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("PEDRO RUIZ")).toBeInTheDocument());
  });

  it("redirige a /4dnn1n/home si el usuario es franquicia", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/4dnn1n/home"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- reports/unsent-carnets`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
// src/app/4dnn1n/reports/unsent-carnets/types.ts
export type ApiUnsentCarnetRow = {
  date: string;
  name: string;
  phone: string | null;
  movil: string;
  franchise: string | null;
};

export type UnsentCarnetsMeta = { current_page: number; last_page: number; per_page: number; total: number };
export type UnsentCarnetsReportResponse = { data: ApiUnsentCarnetRow[]; meta: UnsentCarnetsMeta };
```

- [ ] **Step 4: Implement `fetch.ts`**

```ts
// src/app/4dnn1n/reports/unsent-carnets/fetch.ts
import { apiFetch } from "@/lib/api";
import type { ApiUnsentCarnetRow, UnsentCarnetsReportResponse } from "./types";

export type { ApiUnsentCarnetRow, UnsentCarnetsMeta, UnsentCarnetsReportResponse } from "./types";
export type FranchiseOption = { id: number; name: string };

export async function getUnsentCarnetsReport(
  params: Record<string, string | number | undefined>,
): Promise<UnsentCarnetsReportResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString() ? `?${qs.toString()}` : "";
  const res = await apiFetch<{
    message: string;
    data: ApiUnsentCarnetRow[];
    meta: UnsentCarnetsReportResponse["meta"];
  }>(`/api/reports/unsent-carnets${query}`);
  return { data: res.data ?? [], meta: res.meta };
}

export async function getActiveFranchises(): Promise<FranchiseOption[]> {
  const res = await apiFetch<{ message: string; data: FranchiseOption[] }>("/api/users/active");
  return res.data ?? [];
}
```

- [ ] **Step 5: Implement `_components/columns.tsx`**

```tsx
// src/app/4dnn1n/reports/unsent-carnets/_components/columns.tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiUnsentCarnetRow } from "../fetch";

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

export function buildUnsentCarnetsColumns(): ColumnDef<ApiUnsentCarnetRow>[] {
  return [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "name",
      header: "Titular",
      meta: { uppercase: true },
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => row.original.phone ?? "-",
    },
    {
      accessorKey: "movil",
      header: "Celular",
      cell: ({ row }) => row.original.movil,
    },
    {
      accessorKey: "franchise",
      header: "Franquicia",
      meta: { uppercase: true },
      cell: ({ row }) => row.original.franchise ?? "-",
    },
  ];
}
```

- [ ] **Step 6: Implement `page.tsx`**

```tsx
// src/app/4dnn1n/reports/unsent-carnets/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useReportsTable } from "../_hooks/useReportsTable";
import { ReportPageSizeSelect } from "../_components/ReportPageSizeSelect";
import { ExportReportButton } from "../_components/ExportReportButton";
import { getUnsentCarnetsReport, getActiveFranchises, type ApiUnsentCarnetRow, type FranchiseOption } from "./fetch";
import { buildUnsentCarnetsColumns } from "./_components/columns";

export default function UnsentCarnetsPage() {
  usePageTitle("Carnets No Enviados");
  const { user } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.type === 1;

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/home");
  }, [user, router]);

  const { data, meta, loading, filters, setFilter, setPage, setPerPage, perPage, exportParams } =
    useReportsTable<ApiUnsentCarnetRow>(getUnsentCarnetsReport, { filterKeys: ["franchise_id"] });

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  useEffect(() => {
    if (isSuperAdmin) getActiveFranchises().then(setFranchises);
  }, [isSuperAdmin]);

  const columns = useMemo(() => buildUnsentCarnetsColumns(), []);

  if (!user || user.type !== 1) return null;

  const extraFilters = (
    <>
      <select
        title="Filtrar por Franquicia"
        value={filters.franchise_id || ""}
        onChange={(e) => setFilter("franchise_id", e.target.value)}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        <option value="">Franquicia (Todas)</option>
        {franchises.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>

      <ReportPageSizeSelect value={perPage} onChange={setPerPage} />
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={loading && data.length === 0} />

      <DataTable
        title="Carnets No Enviados"
        columns={columns}
        data={data}
        loading={loading}
        hideSearch
        defaultPageSize={Number.MAX_SAFE_INTEGER}
        serverSide
        serverPage={meta.current_page}
        serverLastPage={meta.last_page}
        serverTotal={meta.total}
        onPageChange={setPage}
        extraFilters={extraFilters}
        toolbarActions={
          <ExportReportButton
            path="/api/reports/unsent-carnets/export"
            params={exportParams}
            fallbackFilename="Reporte_Carnets_No_Enviados.xlsx"
          />
        }
      />
    </>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- reports/unsent-carnets`
Expected: PASS (including the franchise-redirect test).

- [ ] **Step 8: Manual check**

`npm run dev`. Confirm as a franchise user: the hub page hides this card, and typing `/4dnn1n/reports/unsent-carnets` directly redirects to `/4dnn1n/home` rather than flashing the report shell.

- [ ] **Step 9: Commit**

```bash
git add src/app/4dnn1n/reports/unsent-carnets tests/app/4dnn1n/reports/unsent-carnets
git commit -m "feat(reports): add Carnets No Enviados report page, super-admin only"
```

---

## Note on remaining backend follow-ups

Two Minor items were left parked on the backend side after its final review (see `api-cm`'s SDD ledger, since deleted, and the conversation history): a date-overflow test flake risk and a doc-comment inaccuracy — both already fixed in commit `f674f27`. Nothing outstanding blocks this frontend plan.

## Self-Review Notes (already applied before this plan was handed off)

- **Spec coverage:** all 6 reports from the design spec §4 have a task; the hub page, sidebar entry, download mechanism, and page-size control (spec-mandated but missing from the existing `DataTable`) are each their own task.
- **Placeholder scan:** no "TBD"/"add proper error handling"/"similar to Task N" — every task has complete, real code for every file it creates.
- **Type consistency:** `useReportsTable<T, E>`'s return shape, `ExportReportButton`'s props, and `CounselorSearchSelect`'s props are identical across every task that consumes them (verified while writing each per-report task against Task 1–3's exact signatures). Caught and fixed during this review: Sales and Balance originally issued a second, redundant fetch just to read `totals`/`total_balance` — both now come from the hook's `extra` field, taken from the same response the table already fetched, and the affiliates-summary page test's `./fetch` mock factory was missing two of the four functions the page actually imports from it (would have crashed on mount).
- **Review Focus:** all 5 items have an owning task/test — live export params (Task 1's dedicated test), franchise redirect (Task 10), empty-filter URL cleanup (Task 1's dedicated test), Report 3's non-table shape (Task 7 doesn't use `useReportsTable`), counselor debounce (Task 3's dedicated test).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-23-reports-module-frontend.md`. Please review the plan. Which execution approach would you prefer when you pick this up in a future session?**

- **Subagent-driven** — a fresh subagent implements each task and a fresh reviewer checks it before the next one starts, then a whole-branch review at the end. Recommended: this plan has 10 tasks with real cross-task interface dependencies (Tasks 1–3 are consumed identically by Tasks 5–10), and a shipped mistake in the shared `useReportsTable`/`downloadFile` would silently propagate into all 6 report pages.
- **Native** — implement every task in one session, then one fresh reviewer at the end. Cheaper and faster; no independent review until the end.
