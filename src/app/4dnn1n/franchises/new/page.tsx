"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createUser } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import FranchiseForm from "../_components/FranchiseForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

export default function NewUserPage() {
  usePageTitle("Crear Franquicia");
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user?.type !== 1) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  return (
    <>
      <ShowcaseSection
        title="Crear Franquicia"
        description="Completa la información"
        actions={
          <Link href="/4dnn1n/franchises">
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
        <FranchiseForm
          mode="create"
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Crear franquicia?",
                text: "Se guardará la información y quedará activa para su uso.",
                confirmButtonText: "Sí, crear",
                cancelButtonText: "Cancelar",
                onConfirm: () => createUser(payload),
              });
              if (ok) {
                await alert.success("Creado", "Franquicia creada exitosamente");
                router.push("/4dnn1n/franchises");
              }
            } catch (err) {
              await alert.error("Error", getApiErrorMessage(err));
            }
          }}
        />
      </ShowcaseSection>
    </>
  );
}
