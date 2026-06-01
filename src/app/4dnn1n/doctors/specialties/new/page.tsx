"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import SpecialtyForm from "../_components/SpecialtyForm";
import { createSpecialty } from "../fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

export default function NewSpecialtyPage() {
  usePageTitle("Nueva Especialidad");
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

  const handleSubmit = async (data: any) => {
    setLoading(true);
    try {
      await createSpecialty(data);
      await alert.success("Especialidad creada", "La especialidad se ha guardado correctamente.");
      router.push("/4dnn1n/doctors/specialties");
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ShowcaseSection
      title="Crear Nueva Especialidad"
      description="Agrega una nueva especialidad al catálogo médico."
      actions={
        <Link href="/4dnn1n/doctors/specialties">
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
      <div className="mx-auto max-w-2xl rounded-2xl border border-stroke bg-white p-6 shadow-sm dark:border-dark-3 dark:bg-gray-dark">
        <SpecialtyForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </ShowcaseSection>
  );
}
