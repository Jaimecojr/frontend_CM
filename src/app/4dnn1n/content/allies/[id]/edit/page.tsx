"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import AllyForm from "../../_components/AllyForm";
import { getAllies, updateAlly, type ApiAlly } from "../../fetch";

export default function EditAllyPage() {
  usePageTitle("Editar Aliado Estratégico");
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ally, setAlly] = useState<ApiAlly | null>(null);

  useEffect(() => {
    if (user && user.type !== 1) router.replace("/4dnn1n/content");
  }, [user, router]);

  useEffect(() => {
    getAllies().then((list) => {
      const found = list.find((a) => String(a.id) === String(id));
      if (!found) router.replace("/4dnn1n/content/allies");
      else setAlly(found);
    });
  }, [id, router]);

  if (!user || user.type !== 1 || !ally) return null;

  return (
    <ShowcaseSection
      title="Editar Aliado Estratégico"
      description="Modifica la información del aliado"
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
        mode="edit"
        initial={ally}
        onSubmit={async (formData) => {
          try {
            const ok = await alert.confirm({
              title: "¿Actualizar aliado?",
              text: "Se guardarán los cambios.",
              confirmButtonText: "Sí, actualizar",
              cancelButtonText: "Cancelar",
              onConfirm: () => updateAlly(ally.id, formData),
            });
            if (ok) {
              await alert.success("Actualizado", "Aliado actualizado correctamente.");
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
