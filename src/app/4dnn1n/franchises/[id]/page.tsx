"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import UserForm from "../_components/FranchiseForm";
import { getFranchise,  type ApiFranchise } from "../fetch";
import Link from "next/link";
import { Button } from "@/components/ui-elements/button";
import { ArrowLeft } from "lucide-react";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { usePageTitle } from "@/hooks/usePageTitle";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function ViewFranchisePage() {
  usePageTitle("Ver Franquicia");
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [user, setUser] = useState<ApiFranchise | null>(null);

  useEffect(() => {
    (async () => {
      const u = await getFranchise(id);
      setUser(u);
    })();
  }, [id]);

  if (!user) return <div className="p-6">Cargando...</div>;

  return (
    <>
      <ShowcaseSection
        title="Ver Franquicia"
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
        <UserForm mode="view" initial={user} />
      </ShowcaseSection>
    </>
  );
}
