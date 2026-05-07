"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DataTable } from "@/components/data-table/DataTable";
import { Button } from "@/components/ui-elements/button";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { useAuth } from "@/context/AuthContext";
import { getSpecialty, type ApiSpecialty } from "../fetch";
import { getDoctors, type ApiDoctor } from "../../../doctors/fetch";
import { buildSpecialtyDoctorColumns } from "../../../doctors/_components/columns";
import { ArrowLeft } from "lucide-react";

export default function SpecialtyViewPage() {
  usePageTitle("Ver Especialidad");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;
  const params = useParams();
  const specialtyId = parseInt(params?.id as string, 10);

  const [specialty, setSpecialty] = useState<ApiSpecialty | null>(null);

  useEffect(() => {
    if (isNaN(specialtyId)) return;
    getSpecialty(specialtyId)
      .then(setSpecialty)
      .catch((err) => {
        console.error(err);
      });
  }, [specialtyId]);

  // Hook para cargar los médicos de esta especialidad
  const { data, setData, setMeta, stadeFilter, tableProps } = useServerTable<ApiDoctor>(
    getDoctors,
    {
      defaultStade: "1", // Mostrar solo activos por defecto como se solicitó
      extraParams: { specialty_id: specialtyId },
    }
  );

  const columns = useMemo(() => buildSpecialtyDoctorColumns(), []);

  if (!specialty) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return <div className="p-6 text-red-500">No tienes permisos para acceder a esta página.</div>;
  }

  return (
    <ShowcaseSection
      title="DATOS DE LA ESPECIALIZACIÓN"
      description={`Especialidad: ${specialty.name}`}
      actions={
        <Link href="/4dnn1n/doctors/specialties">
          <Button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </Link>
      }
      childrenClassName="p-4 pt-4 sm:p-6 sm:pt-4 xl:p-7.5 xl:pt-4"
    >
      <DataTable
        className="shadow-none rounded-none px-0 pt-0 pb-0"
        columns={columns}
        {...tableProps}
        searchPlaceholder="Buscar médico..."
        enableStateFilter={false}
      />
    </ShowcaseSection>
  );
}
