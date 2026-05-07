"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import SpecialtyForm from "../../_components/SpecialtyForm";
import { getSpecialty, updateSpecialty, type ApiSpecialty } from "../../fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

export default function EditSpecialtyPage() {
  usePageTitle("Modificar Especialidad");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params?.id as string, 10);

  const [initialData, setInitialData] = useState<ApiSpecialty | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNaN(id)) return;
    let ignore = false;

    async function load() {
      try {
        const res = await getSpecialty(id);
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
    setSaving(true);
    try {
      await updateSpecialty(id, data);
      await alert.success("Especialidad actualizada", "Los cambios se han guardado correctamente.");
      router.push("/4dnn1n/doctors/specialties");
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    } finally {
      setSaving(false);
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
        No se pudo cargar la especialidad.
      </div>
    );
  }

  if (!hasAccess) {
    return <div className="p-6 text-red-500">No tienes permisos para acceder a esta página.</div>;
  }

  return (
    <ShowcaseSection
      title={`Editar Especialidad: ${initialData.name}`}
      description="Modifica el nombre o estado de la especialidad."
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
        <SpecialtyForm
          initial={initialData}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </div>
    </ShowcaseSection>
  );
}
