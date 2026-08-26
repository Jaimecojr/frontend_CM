"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  createAffiliate,
  markMembershipFormConverted,
  type CreateAffiliatePayload,
  type ApiAffiliate,
} from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import AffiliateForm from "../_components/AffiliateForm";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

type MembershipFormData = {
  id: number;
  name: string;
  lastname: string;
  id_card: string;
  phone: string;
  email: string;
  bithdate?: string | null;
  address: string;
  city_id: number;
  city?: { id: number; name: string; department_id?: number } | null;
  membership_form_beneficiaries?: { name: string }[];
};

export default function NewAffiliatePage() {
  usePageTitle("Crear Afiliado");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");
  const { user, loading } = useAuth();

  const [prefill, setPrefill] = useState<Partial<ApiAffiliate> | undefined>(undefined);
  const [loadingPrefill, setLoadingPrefill] = useState(!!fromId);

  useEffect(() => {
    if (!fromId) return;
    apiFetch<{ data: MembershipFormData }>(`/api/membership-forms/${fromId}`)
      .then(({ data }) => {
        setPrefill({
          name:      data.name,
          lastname:  data.lastname,
          id_card:   data.id_card,
          movil:     data.phone,
          email:     data.email,
          bithdate:  data.bithdate ?? undefined,
          address:   data.address,
          city_id:   data.city_id,
          city:      data.city ?? undefined,
          beneficiaries: data.membership_form_beneficiaries?.map((b) => ({ name: b.name })) ?? [],
        });
      })
      .catch(() => {
        // If prefill fails, continue with the empty form
      })
      .finally(() => setLoadingPrefill(false));
  }, [fromId]);

  if (loading || loadingPrefill) return null;

  if (user?.type !== 1 && user?.type !== 2) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
        No tienes permisos suficientes para acceder a esta vista.
      </div>
    );
  }

  const backHref = fromId ? "/4dnn1n/membership-forms" : "/4dnn1n/affiliates";

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
        if (fromId) {
          await markMembershipFormConverted(Number(fromId)).catch(() => {});
        }
        await alert.success("Creado", "Afiliado registrado correctamente.");
        router.push(fromId ? "/4dnn1n/membership-forms" : "/4dnn1n/affiliates");
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
          <Link href={backHref}>
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
        <AffiliateForm mode="create" initial={prefill} onSubmit={handleCreate} />
      </ShowcaseSection>
    </>
  );
}
