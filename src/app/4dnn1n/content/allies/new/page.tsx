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
import AllyForm from "../_components/AllyForm";
import { createAlly } from "../fetch";

export default function NewAllyPage() {
  usePageTitle("Agregar Aliado Estratégico");
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/content");
  }, [user, router]);

  if (!user || user.type !== 1) return null;

  return (
    <ShowcaseSection
      title="Agregar Aliado Estratégico"
      description="Sube el banner y la URL del nuevo aliado"
      actions={
        <Link href="/4dnn1n/content/allies">
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
      <AllyForm
        mode="create"
        onSubmit={async (formData) => {
          try {
            const ok = await alert.confirm({
              title: "¿Agregar aliado?",
              text: "Se guardará el banner en el sistema.",
              confirmButtonText: "Sí, agregar",
              cancelButtonText: "Cancelar",
              onConfirm: () => createAlly(formData),
            });
            if (ok) {
              await alert.success("Creado", "Aliado agregado exitosamente.");
              router.push("/4dnn1n/content/allies");
            }
          } catch (err) {
            await alert.error("Error", getApiErrorMessage(err));
          }
        }}
      />
    </ShowcaseSection>
  );
}
