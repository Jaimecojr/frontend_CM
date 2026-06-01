"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { getAffiliate, type ApiAffiliate } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import AffiliateForm from "../_components/AffiliateForm";
import { AffiliateNotes } from "../_components/AffiliateNotes";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { FormPageSkeleton } from "@/components/FormPageSkeleton";

export default function ViewAffiliatePage() {
  usePageTitle("Ver Afiliado");
  const params = useParams();
  const idStr = params?.id as string;
  const affiliateId = parseInt(idStr, 10);

  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ApiAffiliate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(affiliateId)) return;

    let ignore = false;
    async function load() {
      try {
        const res = await getAffiliate(affiliateId);
        if (!ignore) {
          setData(res);
        }
      } catch (err) {
        if (!ignore) {
          alert.error("Error", getApiErrorMessage(err));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [affiliateId]);

  if (authLoading || loading) return <FormPageSkeleton fields={14} />;

  // Permiso tipo 1 o 2
  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-red-500">
        No se pudo cargar el afiliado o no existe.
      </div>
    );
  }

  return (
    <>
      <ShowcaseSection
        title={`Ver Afiliado: ${data.name} ${data.lastname}`}
        description="Consulta detallada de información"
        actions={
          <Link href="/4dnn1n/affiliates">
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
        <AffiliateForm mode="view" initial={data} />

        {/* Sección de notas / bitácora del afiliado */}
        <AffiliateNotes
          affiliateId={affiliateId}
          affiliateName={`${data.name} ${data.lastname}`}
        />
      </ShowcaseSection>
    </>
  );
}
