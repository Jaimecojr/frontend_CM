"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AgreementForm from "../_components/AgreementForm";
import { getAgreement, type ApiAgreement } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ViewAgreementPage() {
  usePageTitle("Ver Convenio");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [agreement, setAgreement] = useState<ApiAgreement | null>(null);

  useEffect(() => {
    (async () => {
      const a = await getAgreement(id);
      setAgreement(a);
    })();
  }, [id]);

  if (!agreement) return <div className="p-6">Cargando...</div>;

  return (
    <>
      <ShowcaseSection
        title="Ver Convenio"
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
        <AgreementForm mode="view" initial={agreement} />
      </ShowcaseSection>
    </>
  );
}
