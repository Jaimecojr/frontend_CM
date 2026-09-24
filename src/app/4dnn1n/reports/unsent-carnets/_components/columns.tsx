"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate } from "../../_lib/format";
import type { ApiUnsentCarnetRow } from "../fetch";

/** Column definitions for the Carnets No Enviados report table. */
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
