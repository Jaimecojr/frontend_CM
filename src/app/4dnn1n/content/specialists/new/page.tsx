"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import SpecialistForm from "../_components/SpecialistForm";
import { createSpecialist } from "../fetch";

export default function NewSpecialistPage() {
  usePageTitle("Agregar Especialista");
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/content");
  }, [user, router]);

  if (!user || user.type !== 1) return null;

  return (
    <ShowcaseSection
      title="Agregar Especialista"
      description="Sube la foto y el nombre del nuevo especialista"
      actions={
        <Link href="/4dnn1n/content/specialists">
          <Button type="button" className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      }
    >
      <SpecialistForm
        mode="create"
        onSubmit={async (formData) => {
          try {
            const ok = await alert.confirm({
              title: "¿Agregar especialista?",
              text: "Se guardará en el sistema.",
              confirmButtonText: "Sí, agregar",
              cancelButtonText: "Cancelar",
              onConfirm: () => createSpecialist(formData),
            });
            if (ok) {
              await alert.success("Creado", "Especialista agregado exitosamente.");
              router.push("/4dnn1n/content/specialists");
            }
          } catch (err) {
            await alert.error("Error", getApiErrorMessage(err));
          }
        }}
      />
    </ShowcaseSection>
  );
}
