"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiFranchise } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Circle, Power } from "lucide-react";

export function buildUserColumns({
  onToggleState,
  isSuperAdmin,
}: {
  onToggleState: (user: ApiFranchise) => void;
  isSuperAdmin: boolean;
}): ColumnDef<ApiFranchise>[] {
  return [
    {
      accessorKey: "nit",
      header: "NIT",
      cell: ({ row }) => <div className="font-medium">{row.original.nit}</div>,
    },
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "movil",
      header: "Celular",
      cell: ({ row }) => row.original.movil ?? "-",
    },
    {
      accessorKey: "address",
      header: "Dirección",
      cell: ({ row }) => row.original.address ?? "-",
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => row.original.city?.name ?? "-",
    },

    // Estado visual mejorado (Badge/Pill)
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

    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const u = row.original;
        const isActive = Number(u.state) === 1;

        return (
          <div className="flex items-center gap-2">
            {/* Ver */}
            <Link
              href={`/4dnn1n/franchises/${u.id}`}
              className="rounded-md p-2 hover:bg-muted"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4" />
            </Link>

            {isSuperAdmin && (
              <>
                {/* Editar */}
                <Link
                  href={`/4dnn1n/franchises/${u.id}/edit`}
                  className="rounded-md p-2 hover:bg-muted"
                  title="Modificar"
                  aria-label="Modificar"
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                {/* Activar / Inactivar */}
                <button
                  type="button"
                  className="rounded-md p-2 hover:bg-muted"
                  title={isActive ? "Inactivar" : "Activar"}
                  aria-label={isActive ? "Inactivar" : "Activar"}
                  onClick={() => onToggleState(u)}
                >
                  <Power className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-500"}`} />
                </button>
              </>
            )}
          </div>
        );
      },
      meta: { stickyRight: true },
    },
  ];
}
