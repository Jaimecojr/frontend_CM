import { describe, it, expect, vi } from "vitest";
import type { ColumnDef } from "@tanstack/react-table";
import { buildAffiliateColumns } from "@/app/4dnn1n/affiliates/_components/columns";
import { buildDoctorColumns, buildSpecialtyDoctorColumns } from "@/app/4dnn1n/doctors/_components/columns";
import { buildAgreementColumns } from "@/app/4dnn1n/agreements/_components/columns";
import { buildAppointmentColumns } from "@/app/4dnn1n/appointments/_components/columns";
import { buildCounselorColumns } from "@/app/4dnn1n/counselors/_components/columns";
import { buildUserColumns } from "@/app/4dnn1n/franchises/_components/columns";
import { buildContactColumns } from "@/app/4dnn1n/contacts/_components/columns";
import { buildMembershipFormColumns } from "@/app/4dnn1n/membership-forms/_components/columns";

/**
 * Business rule: free-text data (names, addresses, cities, subjects...) is shown in capitals in
 * every module's table, while emails, phones, ids, amounts, dates, status badges and the actions
 * column keep their natural casing. Columns opt in through `meta.uppercase`.
 */
const fn = vi.fn();

const key = (c: ColumnDef<never>) =>
  (c as { id?: string; accessorKey?: string }).id ?? (c as { accessorKey?: string }).accessorKey ?? "";

const uppercased = (columns: ColumnDef<never>[]) =>
  columns
    .filter((c) => (c.meta as { uppercase?: boolean } | undefined)?.uppercase)
    .map(key)
    .sort();

const notUppercased = (columns: ColumnDef<never>[]) =>
  columns
    .filter((c) => !(c.meta as { uppercase?: boolean } | undefined)?.uppercase)
    .map(key)
    .sort();

const modules: {
  name: string;
  columns: ColumnDef<never>[];
  upper: string[];
  natural: string[];
}[] = [
  {
    name: "afiliados",
    columns: buildAffiliateColumns({ onToggleState: fn, onSendCarnet: fn, onAddNote: fn, hasAccess: true, canToggle: true }) as ColumnDef<never>[],
    upper: ["city", "full_name"],
    natural: ["actions", "id_card", "movil", "state"],
  },
  {
    name: "médicos",
    columns: buildDoctorColumns({ onToggleState: fn, hasAccess: true }) as ColumnDef<never>[],
    upper: ["city", "full_name", "secretary_name", "specialty"],
    natural: ["actions", "phones", "state"],
  },
  {
    name: "médicos (por especialidad)",
    columns: buildSpecialtyDoctorColumns() as ColumnDef<never>[],
    upper: ["city", "full_name", "secretary_name"],
    natural: ["phones", "tarifa"],
  },
  {
    name: "convenios",
    columns: buildAgreementColumns({ onToggleState: fn, canView: true, canManage: true }) as ColumnDef<never>[],
    upper: ["city", "name"],
    natural: ["actions", "amount", "id", "state"],
  },
  {
    name: "citas",
    columns: buildAppointmentColumns({ onDelete: fn, hasAccess: true }) as ColumnDef<never>[],
    upper: ["city", "doctor", "name"],
    natural: ["actions", "date", "hour", "tipo"],
  },
  {
    name: "asesores",
    columns: buildCounselorColumns({ onToggleState: fn, hasAccess: true }) as ColumnDef<never>[],
    upper: ["city", "full_name"],
    natural: ["actions", "id_card", "movil", "state"],
  },
  {
    name: "franquicias",
    columns: buildUserColumns({ onToggleState: fn, isSuperAdmin: true }) as ColumnDef<never>[],
    upper: ["address", "city", "name"],
    natural: ["actions", "movil", "nit", "state"],
  },
  {
    name: "contactos",
    columns: buildContactColumns({ onDelete: fn }) as ColumnDef<never>[],
    upper: ["city", "comment", "name", "subject"],
    natural: ["actions", "created_at", "email", "phone"],
  },
  {
    name: "solicitudes de afiliación",
    columns: buildMembershipFormColumns({ onDelete: fn }) as ColumnDef<never>[],
    upper: ["city", "full_name", "seller"],
    natural: ["actions", "date", "phone"],
  },
];

describe("columnas en mayúsculas por módulo", () => {
  it.each(modules)("$name: solo las columnas de texto libre se muestran en mayúsculas", ({ columns, upper, natural }) => {
    expect(uppercased(columns)).toEqual(upper);
    expect(notUppercased(columns)).toEqual(natural);
  });
});
