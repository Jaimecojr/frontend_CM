"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
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

  const onToggleState = async (item: ApiSpecialty) => {
    const isActive = Number(item.state) === 1;
    const nextState: 0 | 1 = isActive ? 0 : 1;

    try {
      const ok = await alert.confirm({
        title: isActive ? "¿Inactivar especialidad?" : "¿Activar especialidad?",
        text: isActive
          ? "No aparecerá en los selectores al crear un médico."
          : "Estará disponible nuevamente.",
        confirmButtonText: "Sí, continuar",
        onConfirm: async () => {
          setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, state: nextState } : x)));
          await updateSpecialtyState(item.id, nextState);
        },
      });
      if (ok) {
        await alert.success("Actualizado", `La especialidad ha sido ${isActive ? "inactivada" : "activada"}.`);
      }
    } catch (err) {
      setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, state: item.state } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

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
