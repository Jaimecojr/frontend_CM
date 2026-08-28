"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { useAuth } from "@/context/AuthContext";
import { getSpecialties, updateSpecialtyState, type ApiSpecialty } from "./fetch";
import { buildSpecialtyColumns } from "./_components/columns";

const STATE_OPTIONS = [
  { label: "Activos", value: "1" },
  { label: "Inactivos", value: "0" }, // Ojo: Especialidades usa 0 para inactivo
];

export default function SpecialtiesPage() {
  usePageTitle("Especialidades");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  const { data, setData, loading } = useClientTable(getSpecialties);

  const onToggleState = useOptimisticToggle<ApiSpecialty, "state", 0 | 1>({
    field: "state",
    activeValue: 1,
    inactiveValue: 0,
    setData,
    setMeta: () => {},
    stadeFilter: "all",
    updateFn: updateSpecialtyState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar especialidad?" : "¿Activar especialidad?"),
    confirmText: (isActive) =>
      isActive ? "No aparecerá en los selectores al crear un médico." : "Estará disponible nuevamente.",
    confirmButtonText: () => "Sí, continuar",
    successMessage: (isActive) => `La especialidad ha sido ${isActive ? "inactivada" : "activada"}.`,
  });

  const columns = useMemo(
    () => buildSpecialtyColumns({ onToggleState, hasAccess }),
    [hasAccess], // eslint-disable-line
  );

  if (loading) return <div className="p-6">Cargando especialidades...</div>;

  return (
    <>
      <div className="mb-4">
        <Link href="/4dnn1n/doctors">
          <Button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Médicos
          </Button>
        </Link>
      </div>

      <DataTable
        title="Especialidades Médicas"
        columns={columns}
        data={data}
        defaultPageSize={20}
        pageSizeOptions={[20, 50, 100]}
        searchPlaceholder="Buscar por nombre..."
        getSearchText={(x) => `${x.name}`}
        enableStateFilter={true}
        getStateValue={(x) => Number(x.state)}
        stateFilterOptions={STATE_OPTIONS}
        toolbarActions={
          hasAccess ? <CreateToolbarButton href="/4dnn1n/doctors/specialties/new" label="Crear Especialidad" /> : null
        }
      />
    </>
  );
}
