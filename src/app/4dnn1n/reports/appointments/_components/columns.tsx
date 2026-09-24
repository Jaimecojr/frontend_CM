"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "../../_lib/format";
import type { ApiAppointmentReportRow } from "../fetch";

/**
 * Picks the date's color by comparing only the first 10 characters
 * (yyyy-mm-dd) against today, built the same way from local date parts.
 * Kept as a plain string comparison instead of `Date` parsing: the backend
 * value may already carry a time component, and ISO-format date strings
 * compare correctly with `<`/`===`/`>` without any timezone conversion risk.
 */
function dateColorClass(value: string): string {
  const target = value.slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (target < today) return "text-red-600 dark:text-red-400";
  if (target === today) return "text-blue-600 dark:text-blue-400";
  return "text-green-600 dark:text-green-400";
}

/** Column definitions for the Citas report table. */
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
