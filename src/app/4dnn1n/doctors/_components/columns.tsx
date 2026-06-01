"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiDoctor } from "../fetch";
import Link from "next/link";
import { Eye, Pencil, Power } from "lucide-react";

export function buildDoctorColumns({
  onToggleState,
  hasAccess,
}: {
  onToggleState: (d: ApiDoctor) => void;
  hasAccess: boolean;
}): ColumnDef<ApiDoctor>[] {
  const cols: ColumnDef<ApiDoctor>[] = [
    {
      id: "full_name",
      header: "Nombres",
      accessorFn: (row) => `${row.name} ${row.lastname}`,
      cell: ({ row }) => (
        <div className="font-medium text-left whitespace-normal max-w-[250px] break-words">
          {row.original.name} {row.original.lastname}
        </div>
      ),
    },
    {
      id: "specialty",
      header: "Especialidad",
      accessorFn: (row) => row.specialty?.name ?? "",
      cell: ({ row }) => <div className="font-medium text-left whitespace-normal max-w-[250px] break-words">{row.original.specialty?.name ?? "-"}</div>,
    },
    {
      id: "phones",
      header: "Contacto",
      accessorFn: (row) => `${row.phone} ${row.movil} ${row.email || ""}`,
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1 text-sm whitespace-normal break-words max-w-[250px]">
          {row.original.phone ? <span>Tel: {row.original.phone}</span> : null}
          {row.original.movil ? <span className="text-neutral-500">Cel: {row.original.movil}</span> : null}
          {row.original.email && (
            <span className="text-xs font-normal text-blue-600 dark:text-blue-400 mt-0.5">
              {row.original.email}
            </span>
          )}
          {!row.original.phone && !row.original.movil && !row.original.email && <span>-</span>}
        </div>
      ),
    },
    {
      accessorKey: "secretary_name",
      header: "Secretaria",
      cell: ({ row }) => <div>{row.original.secretary_name || "-"}</div>,
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => <div>{row.original.city?.name ?? "-"}</div>,
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
        const d = row.original;
        const isActive = Number(d.state) === 1;

        return (
          <div className="grid w-fit grid-cols-3 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/doctors/${d.id}`}
              className="hover:bg-muted rounded-md p-2"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Link>

            <Link
              href={`/4dnn1n/doctors/${d.id}/edit`}
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
              onClick={() => onToggleState(d)}
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

export function buildSpecialtyDoctorColumns(): ColumnDef<ApiDoctor>[] {
  return [
    {
      id: "full_name",
      header: "Nombres",
      accessorFn: (row) => `${row.name} ${row.lastname}`,
      cell: ({ row }) => (
        <div className="font-medium text-left whitespace-normal max-w-[250px] break-words">
          {row.original.name} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: "secretary_name",
      header: "Secretaria",
      cell: ({ row }) => <div>{row.original.secretary_name || "-"}</div>,
    },
    {
      id: "phones",
      header: "Contacto",
      accessorFn: (row) => `${row.phone} ${row.movil} ${row.email || ""}`,
      cell: ({ row }) => (
        <div className="flex flex-col space-y-1 text-sm whitespace-normal break-words max-w-[250px]">
          {row.original.phone ? <span>Tel: {row.original.phone}</span> : null}
          {row.original.movil ? <span className="text-neutral-500">Cel: {row.original.movil}</span> : null}
          {row.original.email && (
            <span className="text-xs font-normal text-blue-600 dark:text-blue-400 mt-0.5">
              {row.original.email}
            </span>
          )}
          {!row.original.phone && !row.original.movil && !row.original.email && <span>-</span>}
        </div>
      ),
    },
    {
      id: "city",
      header: "Ciudad",
      accessorFn: (row) => row.city?.name ?? "",
      cell: ({ row }) => <div>{row.original.city?.name ?? "-"}</div>,
    },
    {
      id: "tarifa",
      header: "Tarifa",
      accessorFn: (row) => row.value_agreement,
      cell: ({ row }) => <div>${Number(row.original.value_agreement || 0).toLocaleString("es-CO")}</div>,
    },
  ];
}
