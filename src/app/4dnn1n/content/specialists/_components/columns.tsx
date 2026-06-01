"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiSpecialist } from "../fetch";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function buildSpecialistColumns({
  onDelete,
}: {
  onDelete: (specialist: ApiSpecialist) => void;
}): ColumnDef<ApiSpecialist>[] {
  return [
    {
      accessorKey: "position",
      header: "Pos.",
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.original.position}</div>
      ),
    },
    {
      id: "photo",
      header: "Foto",
      cell: ({ row }) => {
        const src = `${API_URL}/storage/${row.original.photo}`;
        return (
          <div className="flex items-center">
            <img
              src={src}
              alt={row.original.name}
              className="h-14 w-14 rounded-full object-cover border border-stroke"
            />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
    },
    {
      accessorKey: "specialty",
      header: "Especialidad",
      cell: ({ row }) => (
        <div className="text-sm text-dark-5 dark:text-dark-6">{row.original.specialty}</div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const specialist = row.original;
        return (
          <div className="grid w-fit grid-cols-2 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/content/specialists/${specialist.id}/edit`}
              className="hover:bg-muted rounded-md p-2"
              title="Editar"
              aria-label="Editar especialista"
            >
              <Pencil className="h-4 w-4 text-primary" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(specialist)}
              className="hover:bg-muted rounded-md p-2"
              title="Eliminar"
              aria-label="Eliminar especialista"
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
