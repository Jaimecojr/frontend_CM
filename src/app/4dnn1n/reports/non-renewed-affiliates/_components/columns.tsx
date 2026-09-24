"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "../../_lib/format";
import type { ApiNonRenewedRow } from "../fetch";

/** Column definitions for the Sin Renovación report table. */
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
