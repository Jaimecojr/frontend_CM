"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createAffiliate, type CreateAffiliatePayload } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import AffiliateForm from "../_components/AffiliateForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";

export default function NewAffiliatePage() {
  usePageTitle("Crear Afiliado");
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) return null;
  // Permiso tipo 1 o 2
  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  const handleCreate = async (payload: CreateAffiliatePayload) => {
    try {
      const ok = await alert.confirm({
        title: "¿Crear afiliado?",
        text: "Se guardará la información del afiliado y sus beneficiarios.",
        confirmButtonText: "Sí, crear",
        cancelButtonText: "Cancelar",
        onConfirm: () => createAffiliate(payload),
      });
      if (ok) {
        await alert.success("Creado", "Afiliado registrado correctamente.");
        router.push("/4dnn1n/affiliates");
      }
    } catch (error) {
      await alert.error("Error", getApiErrorMessage(error));
    }
  };

  return (
    <>
      <ShowcaseSection
        title="Crear Afiliado / Usuario"
        description="Completa la información"
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
        <AffiliateForm mode="create" onSubmit={handleCreate} />
      </ShowcaseSection>
    </>
  );
}
