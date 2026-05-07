"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ApiAffiliate } from "../fetch";
import Link from "next/link";
import {
  Eye,
  Pencil,
  Power,
  CalendarPlus,
  IdCard,
  MessageSquarePlus,
} from "lucide-react";

export function buildAffiliateColumns({
  onToggleState,
  onSendCarnet,
  onAddNote,
  hasAccess,
  canToggle,
}: {
  onToggleState: (c: ApiAffiliate) => void;
  onSendCarnet: (c: ApiAffiliate) => void;
  onAddNote: (c: ApiAffiliate) => void;
  hasAccess: boolean;
  canToggle: boolean;
}): ColumnDef<ApiAffiliate>[] {
  const cols: ColumnDef<ApiAffiliate>[] = [
    {
      accessorKey: "id_card",
      header: "Documento de Identidad",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.id_card}</div>
      ),
    },
    {
      id: "full_name",
      header: "Nombres",
      accessorFn: (row) => `${row.name} ${row.lastname}`,
      cell: ({ row }) => (
        <div className="font-medium text-left">
          {row.original.name} {row.original.lastname}
        </div>
      ),
    },
    {
      accessorKey: "movil",
      header: "Teléfono",
      accessorFn: (row) => row.movil || row.phone || "-",
      cell: ({ row }) => row.original.movil || row.original.phone || "-",
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
      accessorFn: (row) => row.stade,
      cell: ({ row }) => {
        const isActive = Number(row.original.stade) === 1;
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
        const isActive = Number(c.stade) === 1;

        return (
          <div className="grid w-fit grid-cols-4 place-items-center gap-1 mx-auto">
            <Link
              href={`/4dnn1n/affiliates/${c.id}`}
              className="hover:bg-muted rounded-md p-2"
              title="Ver"
              aria-label="Ver"
            >
              <Eye className="h-4 w-4 text-blue-600" />
            </Link>

            <Link
              href={`/4dnn1n/affiliates/${c.id}/edit`}
              className="hover:bg-muted rounded-md p-2"
              title="Modificar"
              aria-label="Modificar"
            >
              <Pencil className="h-4 w-4" />
            </Link>

            {/* 
            <button
              type="button"
              className="hover:bg-muted rounded-md p-2"
              title="Agregar nota"
              aria-label="Agregar nota"
              onClick={() => onAddNote(c)}
            >
              <MessageSquarePlus className="h-4 w-4 text-violet-500" />
            </button>
            */}

            {canToggle && (
              <button
                type="button"
                className="hover:bg-muted rounded-md p-2"
                title={isActive ? "Inactivar" : "Activar"}
                aria-label={isActive ? "Inactivar" : "Activar"}
                onClick={() => onToggleState(c)}
              >
                <Power className={`h-5 w-5 ${isActive ? "text-green-600" : "text-gray-500"}`} />
              </button>
            )}

            {c.carnet === "no" && /^\d{10}$/.test(c.movil ?? "") && (
              <button
                type="button"
                className="hover:bg-muted rounded-md p-2"
                title="Enviar carnet por WhatsApp"
                aria-label="Enviar carnet por WhatsApp"
                onClick={() => onSendCarnet(c)}
              >
                <IdCard className="h-4 w-4 text-teal-600" />
              </button>
            )}
          </div>
        );
      },
      meta: { stickyRight: true },
    });
  }

  return cols;
}
