"use client";

import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  Users,
  CalendarDays,
  UserX,
  MessageSquareWarning,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

type ReportCard = {
  href: string;
  icon: typeof TrendingUp;
  title: string;
  description: string;
  superAdminOnly?: boolean;
};

const CARDS: ReportCard[] = [
  {
    href: "/4dnn1n/reports/sales",
    icon: TrendingUp,
    title: "Ventas",
    description: "Ventas nuevas y renovaciones en un rango de fechas, con totales.",
  },
  {
    href: "/4dnn1n/reports/balance",
    icon: Wallet,
    title: "Cartera",
    description: "Afiliados con saldo pendiente por asesor.",
  },
  {
    href: "/4dnn1n/reports/affiliates-summary",
    icon: Users,
    title: "Resumen de Afiliados",
    description: "Indicadores de titulares y beneficiarios, activos e inactivos.",
  },
  {
    href: "/4dnn1n/reports/appointments",
    icon: CalendarDays,
    title: "Citas",
    description: "Citas médicas por médico y rango de fechas.",
  },
  {
    href: "/4dnn1n/reports/non-renewed-affiliates",
    icon: UserX,
    title: "Sin Renovación",
    description: "Titulares con contrato vencido que aún no han renovado.",
  },
  {
    href: "/4dnn1n/reports/unsent-carnets",
    icon: MessageSquareWarning,
    title: "Carnets No Enviados",
    description: "Carnets que aún no se han confirmado como enviados por WhatsApp.",
    superAdminOnly: true,
  },
];

/**
 * Entry hub for the Reportes module — a plain card grid, no data fetching.
 * Unlike the content-admin hub it's modeled on, both roles reach this page;
 * only the super-admin-only report (Carnets No Enviados) is gated per card.
 */
export default function ReportsPage() {
  usePageTitle("Reportes");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const visibleCards = CARDS.filter((c) => !c.superAdminOnly || isSuperAdmin);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">Reportes</h1>
        <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">
          Consulta y exporta los reportes operativos del panel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visibleCards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col gap-4 rounded-2xl border border-stroke bg-white p-6 shadow-sm transition hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <c.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark dark:text-white">{c.title}</h2>
              <p className="mt-1 text-sm text-dark-5 dark:text-dark-6">{c.description}</p>
            </div>
            <span className="mt-auto inline-flex items-center text-sm font-medium text-primary">
              Ver reporte →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
