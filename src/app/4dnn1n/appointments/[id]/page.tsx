"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, User, Stethoscope, Calendar, Clock, MapPin, DollarSign, Phone } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { getAppointment, type ApiAppointment } from "../fetch";

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-stroke bg-background p-4 dark:border-dark-3">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-dark-5 dark:text-dark-6">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function ViewAppointmentPage() {
  usePageTitle("Ver Cita");
  const params = useParams();
  const id = parseInt(params?.id as string, 10);

  const [data, setData] = useState<ApiAppointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    let ignore = false;
    getAppointment(id)
      .then((res) => { if (!ignore) setData(res); })
      .catch((err) => { if (!ignore) alert.error("Error", getApiErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:px-6 xl:px-7.5">
          <div className="space-y-2">
            <div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
            <div className="h-4 w-52 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-dark-3" />
        </div>
        <div className="p-4 sm:p-6 xl:p-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-stroke p-4 dark:border-dark-3">
                <div className="mt-0.5 h-5 w-5 shrink-0 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500">
        No se pudo cargar la cita o no existe.
      </div>
    );
  }

  const ownerName = data.owner
    ? [data.owner.name, data.owner.lastname].filter(Boolean).join(" ")
    : data.name;

  const doctorName = data.doctor
    ? `${data.doctor.name} ${data.doctor.lastname}`
    : "-";

  const typeBadge = data.type === 1
    ? <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Titular</span>
    : <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">Beneficiario</span>;

  return (
    <ShowcaseSection
      title="Detalle de Cita"
      description={`Información registrada para la cita #${data.id}`}
      actions={
        <Link href="/4dnn1n/appointments">
          <Button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Tipo badge */}
        <div className="flex items-center gap-2">
          {typeBadge}
          {data.city && (
            <span className="text-sm text-dark-5 dark:text-dark-6">{data.city.name}</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            icon={<User className="h-4 w-4" />}
            label="Paciente"
            value={ownerName}
          />
          <Field
            icon={<Stethoscope className="h-4 w-4" />}
            label="Médico"
            value={doctorName}
          />
          <Field
            icon={<Calendar className="h-4 w-4" />}
            label="Fecha"
            value={formatDate(data.date)}
          />
          <Field
            icon={<Clock className="h-4 w-4" />}
            label="Hora"
            value={data.hour}
          />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Dirección"
            value={data.address}
          />
          <Field
            icon={<DollarSign className="h-4 w-4" />}
            label="Valor de la consulta"
            value={formatCurrency(data.value)}
          />
          <Field
            icon={<Phone className="h-4 w-4" />}
            label="Teléfono del paciente"
            value={data.phone || "—"}
          />
        </div>
      </div>
    </ShowcaseSection>
  );
}
