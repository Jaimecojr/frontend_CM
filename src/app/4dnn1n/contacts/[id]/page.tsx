"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, User, Mail, Phone, MapPin, MessageSquare, Tag, Calendar } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { getContact, deleteContact, type ApiContact } from "../fetch";

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
        <p className="mt-0.5 text-sm font-medium text-dark dark:text-white break-words">{value}</p>
      </div>
    </div>
  );
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export default function ViewContactPage() {
  usePageTitle("Detalle del Mensaje");
  const params = useParams();
  const router = useRouter();
  const id = parseInt(params?.id as string, 10);

  const [data, setData] = useState<ApiContact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    let ignore = false;
    getContact(id)
      .then((res) => { if (!ignore) setData(res); })
      .catch((err) => { if (!ignore) alert.error("Error", getApiErrorMessage(err)); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [id]);

  const handleDelete = async () => {
    if (!data) return;
    const ok = await alert.confirm({
      title: "¿Eliminar mensaje?",
      text: `Se eliminará el mensaje de ${data.name}. Esta acción no se puede deshacer.`,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      onConfirm: async () => {
        await deleteContact(data.id);
      },
    });
    if (ok) {
      await alert.success("Eliminado", "Mensaje eliminado correctamente.");
      router.push("/4dnn1n/contacts");
    }
  };

  if (loading) {
    return (
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex items-center justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-dark-3 sm:px-6 xl:px-7.5">
          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
            <div className="h-4 w-64 animate-pulse rounded bg-gray-200 dark:bg-dark-3" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-dark-3" />
        </div>
        <div className="p-4 sm:p-6 xl:p-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
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
        No se pudo cargar el mensaje o no existe.
      </div>
    );
  }

  return (
    <ShowcaseSection
      title="Detalle del Mensaje"
      description={`Mensaje de contacto #${data.id}`}
      actions={
        <Link href="/4dnn1n/contacts">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field icon={<User className="h-4 w-4" />} label="Nombre" value={data.name} />
          <Field icon={<Mail className="h-4 w-4" />} label="Correo" value={data.email} />
          <Field icon={<Phone className="h-4 w-4" />} label="Teléfono" value={data.phone} />
          <Field
            icon={<MapPin className="h-4 w-4" />}
            label="Ciudad"
            value={data.city?.name ?? "-"}
          />
          <Field icon={<Tag className="h-4 w-4" />} label="Asunto" value={data.subject} />
          <Field
            icon={<Calendar className="h-4 w-4" />}
            label="Fecha de envío"
            value={formatDate(data.created_at)}
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-stroke bg-background p-4 dark:border-dark-3">
          <span className="mt-0.5 shrink-0 text-primary">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-5 dark:text-dark-6">
              Mensaje
            </p>
            <p className="mt-1 text-sm text-dark dark:text-white whitespace-pre-wrap leading-relaxed">
              {data.comment}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            Eliminar mensaje
          </button>
        </div>
      </div>
    </ShowcaseSection>
  );
}
