"use client";

import * as React from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui-elements/button";

type Props<TData> = {
  className?: string;
  table: TanstackTable<TData>;
  defaultPageSize: number;
  totalRows: number;
};

export function DataTablePagination<TData>({
  className,
  table,
  defaultPageSize,
  totalRows,
}: Props<TData>) {
  if (totalRows <= defaultPageSize) return null;

  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div
      className={cn("mt-4 flex items-center justify-between gap-3", className)}
    >
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        Página{" "}
        <span className="font-medium text-dark dark:text-white">
          {pageIndex + 1}
        </span>{" "}
        de{" "}
        <span className="font-medium text-dark dark:text-white">
          {table.getPageCount()}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outlineDark"
          size="small"
          shape="rounded"
          className="h-9"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>

        <Button
          variant="outlineDark"
          size="small"
          shape="rounded"
          className="h-9"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
