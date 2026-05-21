"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiAppointment } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

export function buildAppointmentColumns({
  onDelete,
  hasAccess,
}: {
  onDelete: (c: ApiAppointment) => void;
  hasAccess: boolean;
}): ColumnDef<ApiAppointment>[] {
  const cols: ColumnDef<ApiAppointment>[] = [
    {
      id: "tipo",
      header: "Tipo",
      accessorFn: (row) => (row.type === 1 ? "Titular" : "Beneficiario"),
      cell: ({ row }) => {
        const isTitular = row.original.type === 1;
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isTitular
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
            }`}
          >
            {isTitular ? "Titular" : "Beneficiario"}
          </span>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Nombre del Usuario",
      cell: ({ row }) => {
        const o = row.original.owner;
        const fullName = o
          ? [o.name, o.lastname].filter(Boolean).join(" ")
          : row.original.name;
        return <div className="font-medium">{fullName}</div>;
      },
    },
    {
      id: "doctor",
      header: "Médico",
      accessorFn: (row) =>
        row.doctor ? `${row.doctor.name} ${row.doctor.lastname}` : "-",
      cell: ({ row }) =>
        row.original.doctor
          ? `${row.original.doctor.name} ${row.original.doctor.lastname}`
          : "-",
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "-",
      cell: ({ row }) => row.original.city?.name ?? "-",
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => {
        const [year, month, day] = row.original.date.split("-");
        return `${day}/${month}/${year}`;
      },
    },
    {
      accessorKey: "hour",
      header: "Hora",
      cell: ({ row }) => row.original.hour,
    },
  ];

  cols.push({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const c = row.original;
      const apptDate = new Date(c.date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isPast = apptDate < today;

      return (
        <div className="flex items-center justify-center gap-1">
          <Link
            href={`/4dnn1n/appointments/${c.id}`}
            className="hover:bg-muted rounded-md p-2"
            title="Ver"
            aria-label="Ver"
          >
            <Eye className="h-4 w-4 text-blue-600" />
          </Link>

          {hasAccess && !isPast && (
            <Link
              href={`/4dnn1n/appointments/${c.id}/edit`}
              className="hover:bg-muted rounded-md p-2"
              title="Modificar"
              aria-label="Modificar"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}

          {hasAccess && !isPast && (
            <button
              type="button"
              className="hover:bg-muted rounded-md p-2"
              title="Eliminar"
              aria-label="Eliminar"
              onClick={() => onDelete(c)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </button>
          )}
        </div>
      );
    },
    meta: { stickyRight: true },
  });

  return cols;
}
