"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import UserForm from "../../_components/FranchiseForm";
import { getFranchise,  updateFranchise, type ApiFranchise } from "../../fetch";
import Link from "next/link";
import { Button } from "@/components/ui-elements/button";
import { ArrowLeft } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";
import { FormPageSkeleton } from "@/components/FormPageSkeleton";

export default function EditFranchisePage() {
  usePageTitle("Editar Franquicia");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  const [user, setUser] = useState<ApiFranchise | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getFranchise(id);
      setUser(u);
    })();
  }, [id]);

  if (authLoading) return null;
  if (authUser?.type !== 1) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  if (!user) return <FormPageSkeleton fields={10} />;

  return (
    <>
      <ShowcaseSection
        title="Editar Franquicia"
        description={`Franquicia: ${user.name}`}
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
        <UserForm
          mode="edit"
          initial={user}
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Guardar cambios?",
                text: "Se actualizará la franquicia con la nueva información.",
                confirmButtonText: "Sí, guardar",
                cancelButtonText: "Cancelar",
                onConfirm: () => updateFranchise(id, payload),
              });
              if (ok) {
                await alert.success("Actualizado", "Franquicia editada exitosamente");
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
