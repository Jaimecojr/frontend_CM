"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiSpecialty } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Power } from "lucide-react";

export function buildSpecialtyColumns({
  onToggleState,
  hasAccess,
}: {
  onToggleState: (s: ApiSpecialty) => void;
  hasAccess: boolean;
}): ColumnDef<ApiSpecialty>[] {
  const cols: ColumnDef<ApiSpecialty>[] = [
    {
      accessorKey: "name",
      header: "Nombre de la Especialidad",
      cell: ({ row }) => <div className="font-medium text-left">{row.original.name}</div>,
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
        const s = row.original;
        const isActive = Number(s.state) === 1;

        return (
          <div className="grid w-fit grid-cols-3 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/doctors/specialties/${s.id}`}
              className="hover:bg-muted rounded-md p-2"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Link>

            <Link
              href={`/4dnn1n/doctors/specialties/${s.id}/edit`}
              className="hover:bg-muted rounded-md p-2"
              title="Modificar"
              aria-label="Modificar"
            >
              <Pencil className="h-4 w-4" />
            </Link>

            <button
              type="button"
              className="hover:bg-muted rounded-md p-2"
              title={isActive ? "Inactivar" : "Activar"}
              aria-label={isActive ? "Inactivar" : "Activar"}
              onClick={() => onToggleState(s)}
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
