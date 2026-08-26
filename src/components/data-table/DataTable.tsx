"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";
import { Button } from "@/components/ui-elements/button";

type ColumnMeta = { stickyRight?: boolean };

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
type DataTableProps<TData, TValue> = {
  title?: string;
  className?: string;

  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  defaultPageSize?: number;
  pageSizeOptions?: number[];

  // Search — can be controlled from the parent (server-side)
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  isSearching?: boolean;

  // State filter — always controlled from the parent when used
  enableStateFilter?: boolean;
  getStateValue?: (row: TData) => number;
  stateFilterOptions?: { label: string; value: string }[];
  stateFilterValue?: string;
  onStateFilterChange?: (v: string) => void;

  // For client-side search when the parent does NOT control it
  getSearchText?: (row: TData) => string;

  // Server-side pagination
  serverSide?: boolean;
  serverPage?: number;
  serverLastPage?: number;
  serverTotal?: number;
  onPageChange?: (page: number) => void;

  loading?: boolean;
  toolbarActions?: React.ReactNode;
  extraFilters?: React.ReactNode;
  hideSearch?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal debounce (only for client-side search)
// ─────────────────────────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delay = 300) {
  const [deb, setDeb] = React.useState(value);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDeb(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return deb;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function DataTable<TData, TValue>({
  title,
  className,
  columns,
  data,
  defaultPageSize = 20,
  pageSizeOptions = [20, 25, 50, 100],
  toolbarActions,
  // search
  searchPlaceholder = "Buscar...",
  searchValue: externalSearch,
  onSearchChange: externalOnSearchChange,
  isSearching: externalIsSearching,
  // state filter
  enableStateFilter,
  getStateValue,
  stateFilterOptions,
  stateFilterValue: controlledStateFilter,
  onStateFilterChange: controlledOnStateChange,
  // client-side search text
  getSearchText,
  // server-side pagination
  serverSide = false,
  serverPage = 1,
  serverLastPage = 1,
  serverTotal,
  onPageChange,
  loading = false,
  extraFilters,
  hideSearch = false,
}: DataTableProps<TData, TValue>) {
  const isControlledSearch = externalSearch !== undefined;
  const isControlledState  = controlledStateFilter !== undefined;

  // ── Search ──────────────────────────────────────────────────────────────
  const [internalSearch, setInternalSearch] = React.useState("");
  const debouncedInternalSearch = useDebouncedValue(internalSearch, 300);
  const searchInput    = isControlledSearch ? externalSearch    : internalSearch;
  const setSearchInput = isControlledSearch ? (externalOnSearchChange ?? (() => {})) : setInternalSearch;
  const effectiveSearch = isControlledSearch ? externalSearch : debouncedInternalSearch;
  const isSearchingNow  = isControlledSearch
    ? (externalIsSearching ?? false)
    : (internalSearch !== debouncedInternalSearch);

  // ── State filter ──────────────────────────────────────────────────────
  const [internalStateFilter, setInternalStateFilter] = React.useState(
    stateFilterOptions?.[0]?.value ?? "1",
  );
  const stateFilter    = isControlledState ? controlledStateFilter : internalStateFilter;
  const setStateFilter = isControlledState ? (controlledOnStateChange ?? (() => {})) : setInternalStateFilter;

  // ── Client-side filtering (only if NOT server-side) ─────────────────────
  const getSearchTextRef = React.useRef(getSearchText);
  getSearchTextRef.current = getSearchText;
  const getStateValueRef = React.useRef(getStateValue);
  getStateValueRef.current = getStateValue;

  const filteredData = React.useMemo(() => {
    if (serverSide) return data; // server already filtered

    let result = data;

    if (!isControlledState && enableStateFilter && getStateValue) {
      if (stateFilter !== "all") {
        result = result.filter((row) => String(getStateValueRef.current?.(row) ?? 0) === stateFilter);
      }
    }

    const q = effectiveSearch.toLowerCase().trim();
    if (q && getSearchText) {
      result = result.filter((row) =>
        (getSearchTextRef.current?.(row) ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [data, effectiveSearch, serverSide, isControlledState, enableStateFilter, getStateValue, stateFilter]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [clientPage, setClientPage] = React.useState(0);
  const [clientPageSize, setClientPageSize] = React.useState(defaultPageSize);

  React.useEffect(() => {
    setClientPage(0);
  }, [effectiveSearch, stateFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    state: serverSide
      ? {} // server-side: no internal pagination
      : { pagination: { pageIndex: clientPage, pageSize: clientPageSize } },
    onPaginationChange: serverSide
      ? undefined
      : (updater) => {
          const next =
            typeof updater === "function"
              ? updater({ pageIndex: clientPage, pageSize: clientPageSize })
              : updater;
          setClientPage(next.pageIndex);
          setClientPageSize(next.pageSize);
        },
    manualPagination: serverSide,
    pageCount: serverSide ? serverLastPage : undefined,
  });

  const isFit       = columns.length <= 6;
  const totalRows   = serverSide ? (serverTotal ?? data.length) : data.length;
  const filteredRows = serverSide ? (serverTotal ?? filteredData.length) : filteredData.length;

  return (
    <div
      className={cn(
        "grid min-w-0 rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-col gap-4">
        {title ? (
          <h2 className="text-body-2xlg font-bold text-dark dark:text-white">{title}</h2>
        ) : null}

        <DataTableToolbar
          searchPlaceholder={searchPlaceholder}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          defaultPageSize={defaultPageSize}
          pageSizeOptions={pageSizeOptions}
          totalRows={totalRows}
          filteredRows={filteredRows}
          pageSize={serverSide ? defaultPageSize : clientPageSize}
          onPageSizeChange={serverSide ? () => {} : (n) => { setClientPageSize(n); setClientPage(0); }}
          actions={toolbarActions}
          stateFilterValue={enableStateFilter ? stateFilter : undefined}
          onStateFilterChange={enableStateFilter ? setStateFilter : undefined}
          stateFilterOptions={stateFilterOptions}
          isSearching={isSearchingNow || loading}
          extraFilters={extraFilters}
          hideSearch={hideSearch}
        />
      </div>

      {/* ── Body ── */}
      <div
        className={cn(
          "min-w-0",
          isFit
            ? "flex justify-center"
            : "rounded-md border border-neutral-200/60 dark:border-dark-3",
        )}
      >
        <div className={cn(isFit && "inline-block max-w-full rounded-md border border-neutral-200/60 dark:border-dark-3")}>
          <Table className={isFit ? "w-max" : "min-w-full"}>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-none uppercase">
                  {hg.headers.map((h) => {
                    const meta = h.column.columnDef.meta as ColumnMeta | undefined;
                    return (
                      <TableHead
                        key={h.id}
                        className={cn(
                          "whitespace-nowrap",
                          h.index === 0 ? "!text-left" : "text-center",
                          meta?.stickyRight && "sticky right-0 z-10 bg-white dark:bg-gray-dark text-right",
                        )}
                      >
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {loading ? (
                // Skeleton while loading
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, ci) => (
                      <TableCell key={ci}>
                        <div className="h-4 animate-pulse rounded bg-neutral-100 dark:bg-dark-3" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="text-center text-base font-medium text-dark dark:text-white">
                    {row.getVisibleCells().map((cell, idx) => {
                      const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            "whitespace-nowrap",
                            idx === 0 ? "!text-left" : "text-center",
                            meta?.stickyRight && "sticky right-0 z-10 bg-white dark:bg-gray-dark text-right",
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-neutral-500 dark:text-neutral-400">
                    No hay resultados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination — same design for both modes */}
      {serverSide ? (
        serverLastPage > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Página{" "}
              <span className="font-medium text-dark dark:text-white">{serverPage}</span>
              {" "}de{" "}
              <span className="font-medium text-dark dark:text-white">{serverLastPage}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outlineDark"
                size="small"
                shape="rounded"
                className="h-9"
                onClick={() => onPageChange?.(serverPage - 1)}
                disabled={serverPage <= 1 || loading}
              >
                Anterior
              </Button>
              <Button
                variant="outlineDark"
                size="small"
                shape="rounded"
                className="h-9"
                onClick={() => onPageChange?.(serverPage + 1)}
                disabled={serverPage >= serverLastPage || loading}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null
      ) : (
        <DataTablePagination
          table={table}
          defaultPageSize={defaultPageSize}
          totalRows={filteredRows}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple server-side pagination
// ─────────────────────────────────────────────────────────────────────────────
function ServerPagination({
  page,
  lastPage,
  total,
  perPage,
  onPageChange,
  loading,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (p: number) => void;
  loading: boolean;
}) {
  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {total > 0 ? `${from}–${to} de ${total} registros` : "Sin resultados"}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || loading}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-dark-3"
          aria-label="Primera página"
        >«</button>

        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-dark-3"
          aria-label="Página anterior"
        >‹</button>

        <span className="px-3 py-1 text-sm font-medium">
          {page} / {lastPage}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= lastPage || loading}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-dark-3"
          aria-label="Página siguiente"
        >›</button>

        <button
          onClick={() => onPageChange(lastPage)}
          disabled={page >= lastPage || loading}
          className="rounded border px-2 py-1 text-sm disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-dark-3"
          aria-label="Última página"
        >»</button>
      </div>
    </div>
  );
}
