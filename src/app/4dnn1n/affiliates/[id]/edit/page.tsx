"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  getAffiliate,
  updateAffiliate,
  type ApiAffiliate,
  type CreateAffiliatePayload,
} from "../../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import AffiliateForm from "../../_components/AffiliateForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { AffiliateNotes } from "../../_components/AffiliateNotes";

export default function EditAffiliatePage() {
  usePageTitle("Modificar Afiliado");
  const router = useRouter();
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

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Permiso tipo 1 o 2 restrictivo
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

  const handleUpdate = async (payload: Partial<CreateAffiliatePayload> & { renovation?: any }) => {
    try {
      const ok = await alert.confirm({
        title: "¿Actualizar afiliado?",
        text: "Se guardarán permanentemente las modificaciones.",
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar",
      });

      if (!ok) return;

      const renovationData = payload.renovation;
      delete payload.renovation;

      delete payload.validity; // Nunca se sobreescribe la vigencia inicial para mantener histórico

      if (renovationData) {
        // Al renovar, actualizamos la nueva vigencia final y la fecha de la última venta
        payload.validity_end = renovationData.date_end;
        payload.sale_date = renovationData.date_payment;
        payload.value_sale = renovationData.value;
        payload.stade = 1; // reactivar si estaba inactivo por vencimiento
      }

      await updateAffiliate(affiliateId, payload);
      
      if (renovationData) {
        await import("../../fetch").then(m => m.createRenovation({
           ...renovationData,
           affiliate_id: affiliateId
        }));
      }

      await alert.success("Actualizado", "Se ha guardado correctamente.");
      router.push("/4dnn1n/affiliates");
    } catch (error) {
      await alert.error("Error", getApiErrorMessage(error));
    }
  };

  return (
    <>
      <ShowcaseSection
        title={`Editar Afiliado: ${data.name} ${data.lastname}`}
        description="Modifica la información y actualiza los campos"
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
        <AffiliateForm mode="edit" initial={data} onSubmit={handleUpdate} />

        {/* Sección de notas / bitácora del afiliado */}
        <AffiliateNotes
          affiliateId={affiliateId}
          affiliateName={`${data.name} ${data.lastname}`}
        />
      </ShowcaseSection>
    </>
  );
}
