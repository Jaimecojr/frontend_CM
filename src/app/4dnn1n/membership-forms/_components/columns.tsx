"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiMembershipForm } from "../fetch";
import { UserPlus, Trash2 } from "lucide-react";
import Link from "next/link";

export function buildMembershipFormColumns({
  onDelete,
}: {
  onDelete: (form: ApiMembershipForm) => void;
}): ColumnDef<ApiMembershipForm>[] {
  return [
    {
      id: "full_name",
      header: "Nombre",
      accessorFn: (row) => `${row.name} ${row.lastname}`,
      cell: ({ row }) => (
        <div className="font-medium text-left whitespace-normal max-w-[200px] break-words">
          {row.original.name} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: "Celular",
      cell: ({ row }) => <div className="whitespace-nowrap">{row.original.phone}</div>,
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => <div>{row.original.city?.name ?? "-"}</div>,
    },
    {
      accessorKey: "seller",
      header: "Asesor",
      cell: ({ row }) => (
        <div className="whitespace-normal max-w-[150px] break-words">{row.original.seller}</div>
      ),
    },
    {
      accessorKey: "date",
      header: "Fecha solicitud",
      cell: ({ row }) => {
        if (!row.original.date) return <div>-</div>;
        const [y, m, d] = row.original.date.split("-");
        return <div className="whitespace-nowrap">{`${d}/${m}/${y}`}</div>;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const form = row.original;
        return (
          <div className="grid w-fit grid-cols-2 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/affiliates/new?from=${form.id}`}
              className="hover:bg-muted rounded-md p-2"
              title="Crear afiliado"
              aria-label="Crear afiliado"
            >
              <UserPlus className="h-4 w-4 text-primary" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(form)}
              className="hover:bg-muted rounded-md p-2"
              title="Eliminar solicitud"
              aria-label="Eliminar solicitud"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          </div>
        );
      },
      meta: { stickyRight: true },
    },
  ];
}
