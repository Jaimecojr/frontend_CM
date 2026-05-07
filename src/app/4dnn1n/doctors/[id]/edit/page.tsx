"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import DoctorForm from "../../_components/DoctorForm";
import { getDoctor, updateDoctor, type ApiDoctor } from "../../fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

export default function EditDoctorPage() {
  usePageTitle("Modificar Médico");
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params?.id as string, 10);

  const [initialData, setInitialData] = useState<ApiDoctor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;
    let ignore = false;

    async function load() {
      try {
        const res = await getDoctor(id);
        if (!ignore) setInitialData(res);
      } catch (err) {
        if (!ignore) alert.error("Error", getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  const handleSubmit = async (data: any) => {
    try {
      await updateDoctor(id, data);
      await alert.success("Médico actualizado", "Los cambios se han guardado correctamente.");
      router.push("/4dnn1n/doctors");
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="p-6 text-center text-red-500">
        No se pudo cargar el médico.
      </div>
    );
  }

  if (authLoading) return null;
  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  return (
    <ShowcaseSection
      title={`Editar Médico: ${initialData.name} ${initialData.lastname}`}
      description="Modifica la información del médico."
      actions={
        <Link href="/4dnn1n/doctors">
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
        <DoctorForm
          mode="edit"
          initial={initialData}
          onSubmit={handleSubmit}
        />
      </div>
    </ShowcaseSection>
  );
}
