"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { createAppointment, type CreateAppointmentPayload } from "../fetch";
import AppointmentForm from "../_components/AppointmentForm";

export default function NewAppointmentPage() {
  usePageTitle("Nueva Cita");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (authLoading) return null;

  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  const handleSubmit = async (payload: CreateAppointmentPayload) => {
    setLoading(true);
    try {
      await createAppointment(payload);
      await alert.success("Cita creada", "La cita fue registrada correctamente.");
      router.push("/4dnn1n/appointments");
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShowcaseSection
      title="Crear Nueva Cita"
      description="Registra una nueva cita médica para un afiliado o beneficiario."
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
        <AppointmentForm onSubmit={handleSubmit} userId={user.id} />
      </div>
    </ShowcaseSection>
  );
}
