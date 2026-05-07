"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiCounselor } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Circle, Power } from "lucide-react";

export function buildCounselorColumns({
  onToggleState,
  hasAccess,
}: {
  onToggleState: (c: ApiCounselor) => void;
  hasAccess: boolean;
}): ColumnDef<ApiCounselor>[] {
  const cols: ColumnDef<ApiCounselor>[] = [
    {
      id: "full_name",
      header: "Nombre",
      accessorFn: (row) => `${row.name} ${row.lastname}`,
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.name} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: "id_card",
      header: "Cédula",
      cell: ({ row }) => <div className="font-medium">{row.original.id_card}</div>,
    },    
    {
      accessorKey: "movil",
      header: "Celular",
      cell: ({ row }) => row.original.movil ?? "-",
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

  if (hasAccess) {
    cols.push({
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const c = row.original;
        const isActive = Number(c.state) === 1;

        return (
          <div className="flex items-center justify-center gap-2">
            <Link
              href={`/4dnn1n/counselors/${c.id}`}
              className="rounded-md p-2 hover:bg-muted"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4" />
            </Link>

            <Link
              href={`/4dnn1n/counselors/${c.id}/edit`}
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
              onClick={() => onToggleState(c)}
            >
              <Power className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-500"}`} />
            </button>
          </div>
        );
      },
      meta: { stickyRight: true },
    });
  }

  return cols;
}