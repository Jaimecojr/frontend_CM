"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiAlly } from "../fetch";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function buildAllyColumns({
  onDelete,
}: {
  onDelete: (ally: ApiAlly) => void;
}): ColumnDef<ApiAlly>[] {
  return [
    {
      accessorKey: "position",
      header: "Pos.",
      cell: ({ row }) => (
        <div className="text-center font-medium">{row.original.position}</div>
      ),
    },
    {
      id: "image",
      header: "Imagen",
      cell: ({ row }) => {
        const src = `${API_URL}/storage/${row.original.image}`;
        return (
          <div className="flex items-center">
            <img
              src={src}
              alt="banner aliado"
              className="h-12 w-24 rounded-md object-cover border border-stroke"
            />
          </div>
        );
      },
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => (
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline text-sm max-w-[200px] inline-block truncate"
          title={row.original.url}
        >
          {row.original.url}
        </a>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const ally = row.original;
        return (
          <div className="grid w-fit grid-cols-2 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/content/allies/${ally.id}/edit`}
              className="hover:bg-muted rounded-md p-2"
              title="Editar"
              aria-label="Editar aliado"
            >
              <Pencil className="h-4 w-4 text-primary" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(ally)}
              className="hover:bg-muted rounded-md p-2"
              title="Eliminar"
              aria-label="Eliminar aliado"
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
