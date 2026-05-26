"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiContact } from "../fetch";
import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";

export function buildContactColumns({
  onDelete,
}: {
  onDelete: (contact: ApiContact) => void;
}): ColumnDef<ApiContact>[] {
  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => (
        <div className="font-medium text-left whitespace-normal max-w-[180px] break-words">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Correo",
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-sm">{row.original.email}</div>
      ),
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => <div>{row.original.city?.name ?? "-"}</div>,
    },
    {
      accessorKey: "phone",
      header: "Teléfono",
      cell: ({ row }) => <div className="whitespace-nowrap">{row.original.phone}</div>,
    },
    {
      accessorKey: "subject",
      header: "Asunto",
      cell: ({ row }) => (
        <div className="whitespace-normal max-w-[160px] break-words text-sm">
          {row.original.subject}
        </div>
      ),
    },
    {
      accessorKey: "comment",
      header: "Mensaje",
      cell: ({ row }) => {
        const text = row.original.comment;
        const truncated = text.length > 80 ? `${text.slice(0, 80)}…` : text;
        return (
          <div className="whitespace-normal max-w-[200px] break-words text-sm text-dark-5 dark:text-dark-6">
            {truncated}
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Fecha",
      cell: ({ row }) => {
        const raw = row.original.created_at;
        if (!raw) return <div>-</div>;
        const date = new Date(raw);
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const y = date.getFullYear();
        return <div className="whitespace-nowrap">{`${d}/${m}/${y}`}</div>;
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => {
        const contact = row.original;
        return (
          <div className="grid w-fit grid-cols-2 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/contacts/${contact.id}`}
              className="hover:bg-muted rounded-md p-2"
              title="Ver detalle"
              aria-label="Ver detalle"
            >
              <Eye className="h-4 w-4 text-primary" />
            </Link>
            <button
              type="button"
              onClick={() => onDelete(contact)}
              className="hover:bg-muted rounded-md p-2"
              title="Eliminar mensaje"
              aria-label="Eliminar mensaje"
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
