"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { FormPageSkeleton } from "@/components/FormPageSkeleton";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { getAppointment, updateAppointment, type ApiAppointment, type CreateAppointmentPayload } from "../../fetch";
import AppointmentEditForm from "../../_components/AppointmentEditForm";

export default function EditAppointmentPage() {
  usePageTitle("Modificar Cita");
  const params = useParams();
  const id = parseInt(params?.id as string, 10);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

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

  if (authLoading || loading) return <FormPageSkeleton fields={8} />;

  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
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

  const handleSubmit = async (payload: CreateAppointmentPayload) => {
    await updateAppointment(id, payload);
    await alert.success("Cita actualizada", "Los cambios fueron guardados correctamente.");
    router.push("/4dnn1n/appointments");
  };

  return (
    <ShowcaseSection
      title="Modificar Cita"
      description={`Editando cita #${data.id} — ${data.name}`}
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
      <div className="mx-auto max-w-4xl">
        <AppointmentEditForm initial={data} onSubmit={handleSubmit} />
      </div>
    </ShowcaseSection>
  );
}
