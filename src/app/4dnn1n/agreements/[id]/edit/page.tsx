"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AgreementForm from "../../_components/AgreementForm";
import { getAgreement, updateAgreement, type ApiAgreement } from "../../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { FormPageSkeleton } from "@/components/FormPageSkeleton";

export default function EditAgreementPage() {
  usePageTitle("Editar Convenio");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user } = useAuth();

  const [agreement, setAgreement] = useState<ApiAgreement | null>(null);

  useEffect(() => {
    if (user && user.type !== 1) {
      router.replace("/4dnn1n/agreements");
    }
  }, [user, router]);

  useEffect(() => {
    (async () => {
      const a = await getAgreement(id);
      setAgreement(a);
    })();
  }, [id]);

  if (!user || user.type !== 1) return null;

  if (!agreement) return <FormPageSkeleton fields={6} />;

  return (
    <>
      <ShowcaseSection
        title="Editar Convenio"
        description={`Convenio: ${agreement.name}`}
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
          mode="edit"
          initial={agreement}
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Guardar cambios?",
                text: "Se actualizará el convenio con la nueva información.",
                confirmButtonText: "Sí, guardar",
                cancelButtonText: "Cancelar",
              });

              if (!ok) return;

              await updateAgreement(id, payload);
              await alert.success("Actualizado", "Convenio editado exitosamente");
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
