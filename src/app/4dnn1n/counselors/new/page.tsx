"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createCounselor } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import CounselorForm from "../_components/CounselorForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function NewCounselorPage() {
  usePageTitle("Crear Asesor");
  const router = useRouter();

  return (
    <>
      <ShowcaseSection
        title="Crear Asesor"
        description="Completa la información"
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
          mode="create"
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Crear asesor?",
                text: "Se guardará la información y quedará activo para su uso.",
                confirmButtonText: "Sí, crear",
                cancelButtonText: "Cancelar",
              });

              if (!ok) return;

              await createCounselor(payload);
              await alert.success("Creado", "Asesor creado exitosamente");
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