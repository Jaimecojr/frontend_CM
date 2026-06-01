"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiAgreement } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Power } from "lucide-react";

export function buildAgreementColumns({
  onToggleState,
  canView,
  canManage,
}: {
  onToggleState: (agreement: ApiAgreement) => void;
  canView: boolean;
  canManage: boolean;
}): ColumnDef<ApiAgreement>[] {
  const cols: ColumnDef<ApiAgreement>[] = [
    {
      accessorKey: "id",
      header: "Código",
      cell: ({ row }) => <div className="font-medium">{row.original.id}</div>,
    },
    {
      accessorKey: "name",
      header: "Nombre del Convenio",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "amount",
      header: "Valor ($)",
      cell: ({ row }) => (
        <div className="font-medium">
          ${Number(row.original.amount).toLocaleString("es-CO")}
        </div>
      ),
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => row.original.city?.name ?? "-",
    },
    {
      id: "state",
      header: () => <div className="text-center">Estado</div>,
      accessorFn: (row) => row.state,
      cell: ({ row }) => {
        const isActive = Number(row.original.state) === 1;
        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500"
              }`}
            >
              {isActive ? "Activo" : "Inactivo"}
            </span>
          </div>
        );
      },
    },
  ];

  if (canView) {
    cols.push({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const agreement = row.original;
        const isActive = Number(agreement.state) === 1;

        return (
          <div className="flex items-center justify-center gap-2">
            <Link
              href={`/4dnn1n/agreements/${agreement.id}`}
              className="rounded-md p-2 hover:bg-muted"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4" />
            </Link>

            {canManage && (
              <>
                <Link
                  href={`/4dnn1n/agreements/${agreement.id}/edit`}
                  className="rounded-md p-2 hover:bg-muted"
                  title="Modificar"
                  aria-label="Modificar"
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  className="rounded-md p-2 hover:bg-muted"
                  title={isActive ? "Inactivar" : "Activar"}
                  aria-label={isActive ? "Inactivar" : "Activar"}
                  onClick={() => onToggleState(agreement)}
                >
                  <Power className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-500"}`} />
                </button>
              </>
            )}
          </div>
        );
      },
      meta: { stickyRight: true },
    });
  }

  return cols;
}
