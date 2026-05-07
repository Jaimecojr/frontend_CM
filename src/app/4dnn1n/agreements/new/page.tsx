"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createAgreement } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import AgreementForm from "../_components/AgreementForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

export default function NewAgreementPage() {
  usePageTitle("Crear Convenio");
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.type !== 1) {
      router.replace("/4dnn1n/agreements");
    }
  }, [user, router]);

  if (!user || user.type !== 1) return null;

  return (
    <>
      <ShowcaseSection
        title="Crear Convenio"
        description="Agrega un nuevo convenio al sistema"
        actions={
          <Link href="/4dnn1n/agreements">
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
        <AgreementForm
          mode="create"
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Crear convenio?",
                text: "Se guardará la información en el sistema.",
                confirmButtonText: "Sí, crear",
                cancelButtonText: "Cancelar",
              });

              if (!ok) return;

              await createAgreement(payload);
              await alert.success("Creado", "Convenio creado exitosamente");
              router.push("/4dnn1n/agreements");
            } catch (err) {
              await alert.error("Error", getApiErrorMessage(err));
            }
          }}
        />
      </ShowcaseSection>
    </>
  );
}
