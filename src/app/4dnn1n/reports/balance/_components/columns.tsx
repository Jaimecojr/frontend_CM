"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatMoney } from "../../_lib/format";
import type { ApiBalanceRow } from "../fetch";

/**
 * Column definitions for the Cartera report table. Dates and money always go
 * through the shared `_lib/format` helpers so every report renders them the
 * same way, including money's number|string ambiguity from the backend.
 */
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
      cell: ({ row }) => formatMoney(row.original.balance),
    },
    {
      accessorKey: "validity",
      header: "Fecha de Ingreso",
      cell: ({ row }) => formatDate(row.original.validity),
    },
  ];
}
