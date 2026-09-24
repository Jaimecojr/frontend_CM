"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDate, formatMoney } from "../../_lib/format";
import type { ApiSaleRow } from "../fetch";

/**
 * Column definitions for the Ventas report table. Dates and money always go
 * through the shared `_lib/format` helpers so every report renders them the
 * same way, including money's number|string ambiguity from the backend.
 */
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
