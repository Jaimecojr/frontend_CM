"use client";

import * as React from "react";
import { Input } from "@/components/ui-elements/input";

type Props = {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  hideSearch?: boolean;

  defaultPageSize: number;
  pageSizeOptions: number[];

  totalRows: number;
  filteredRows: number;

  pageSize: number;
  onPageSizeChange: (size: number) => void;
  actions?: React.ReactNode;

  stateFilterValue?: string;
  onStateFilterChange?: (v: string) => void;
  stateFilterOptions?: { label: string; value: string }[];
  isSearching?: boolean;
  extraFilters?: React.ReactNode;
};

export function DataTableToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  hideSearch = false,
  defaultPageSize,
  pageSizeOptions,
  totalRows,
  filteredRows,
  pageSize,
  onPageSizeChange,
  actions,
  stateFilterValue,
  onStateFilterChange,
  stateFilterOptions,
  isSearching,
  extraFilters,
}: Props) {
  // Only shows the selector if there are really more rows than the default (based on filtering)
  const showPageSize = filteredRows > defaultPageSize;

  const selectValue =
    pageSize >= filteredRows && filteredRows > 0 ? "all" : String(pageSize);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end w-full">
      <div className="flex w-full flex-col gap-2">
        {/* top row: search box + actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {extraFilters}
          {stateFilterValue !== undefined && onStateFilterChange && (
            <select
              title="Estado"
              className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              value={stateFilterValue}
              onChange={(e) => onStateFilterChange(e.target.value)}
            >
              {(stateFilterOptions || [
                { label: "Activos", value: "1" },
                { label: "Inactivos", value: "2" },
              ]).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              <option value="all">Todos</option>
            </select>
          )}

          {!hideSearch && (
            <div className="relative flex w-full flex-1 sm:max-w-[350px]">
              <Input
                value={searchValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onSearchChange(e.target.value)
                }
                placeholder={searchPlaceholder}
                className="h-9 w-full pr-8 px-3 py-2 text-sm"
              />
              {isSearching && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-neutral-400 dark:text-neutral-500">
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
          )}

          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        {/* row below: page size */}
        {showPageSize ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Ver
            </span>

            <select
              className="h-8 rounded-lg border-[1.5px] border-stroke bg-transparent px-2 text-xs text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              value={selectValue}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const v = e.target.value;
                const newSize = v === "all" ? filteredRows || 1 : Number(v);
                onPageSizeChange(newSize);
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
              <option value="all">Todos</option>
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
}
