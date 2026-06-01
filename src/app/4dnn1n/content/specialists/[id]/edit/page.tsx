"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import SpecialistForm from "../../_components/SpecialistForm";
import { getSpecialists, updateSpecialist, type ApiSpecialist } from "../../fetch";

export default function EditSpecialistPage() {
  usePageTitle("Editar Especialista");
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [specialist, setSpecialist] = useState<ApiSpecialist | null>(null);

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/content");
  }, [user, router]);

  useEffect(() => {
    getSpecialists().then((list) => {
      const found = list.find((s) => String(s.id) === String(id));
      if (!found) router.replace("/4dnn1n/content/specialists");
      else setSpecialist(found);
    });
  }, [id, router]);

  if (!user || user.type !== 1 || !specialist) return null;

  return (
    <ShowcaseSection
      title="Editar Especialista"
      description="Modifica la información del especialista"
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
        mode="edit"
        initial={specialist}
        onSubmit={async (formData) => {
          try {
            const ok = await alert.confirm({
              title: "¿Actualizar especialista?",
              text: "Se guardarán los cambios.",
              confirmButtonText: "Sí, actualizar",
              cancelButtonText: "Cancelar",
              onConfirm: () => updateSpecialist(specialist.id, formData),
            });
            if (ok) {
              await alert.success("Actualizado", "Especialista actualizado correctamente.");
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
