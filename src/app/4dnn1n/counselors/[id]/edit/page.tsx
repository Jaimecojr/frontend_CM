"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import CounselorForm from "../../_components/CounselorForm";
import { getCounselor, updateCounselor, type ApiCounselor } from "../../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function EditCounselorPage() {
  usePageTitle("Editar Asesor");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();

  const [counselor, setCounselor] = useState<ApiCounselor | null>(null);

  useEffect(() => {
    (async () => {
      const c = await getCounselor(id);
      setCounselor(c);
    })();
  }, [id]);

  if (!counselor) return <div className="p-6">Cargando...</div>;

  return (
    <>
      <ShowcaseSection
        title="Editar Asesor"
        description={`Asesor: ${counselor.name} ${counselor.lastname}`}
        actions={
          <Link href="/4dnn1n/counselors">
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
        <CounselorForm
          mode="edit"
          initial={counselor}
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Guardar cambios?",
                text: "Se actualizará el asesor con la nueva información.",
                confirmButtonText: "Sí, guardar",
                cancelButtonText: "Cancelar",
              });

              if (!ok) return;

              await updateCounselor(id, payload);
              await alert.success("Actualizado", "Asesor editado exitosamente");
              router.push("/4dnn1n/counselors");
            } catch (err) {
              await alert.error("Error", getApiErrorMessage(err));
            }
          }}
        />
      </ShowcaseSection>
    </>
  );
}