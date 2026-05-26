"use client";

import { useMemo } from "react";
import Link from "next/link";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { Button } from "@/components/ui-elements/button";
import { Plus } from "lucide-react";

import { getSpecialists, deleteSpecialist, type ApiSpecialist } from "./fetch";
import { buildSpecialistColumns } from "./_components/columns";

export default function SpecialistsPage() {
  usePageTitle("Especialistas de la Salud");

  const { data, setData, loading } = useClientTable(getSpecialists);

  const onDelete = async (specialist: ApiSpecialist) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar especialista?",
        text: `Se eliminará a ${specialist.name}. Esta acción no se puede deshacer.`,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          setData((prev) => prev.filter((x) => x.id !== specialist.id));
          await deleteSpecialist(specialist.id);
        },
      });
      if (ok) {
        await alert.success("Eliminado", "Especialista eliminado correctamente.");
      }
    } catch (err) {
      setData((prev) => [...prev, specialist]);
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildSpecialistColumns({ onDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const atLimit = data.length >= 4;

  return (
    <>
      <LoadingOverlay isLoading={loading} />
      <DataTable
        title="Especialistas de la Salud"
        columns={columns}
        data={data}
        defaultPageSize={10}
        enableStateFilter={false}
        hideSearch
        toolbarActions={
          atLimit ? (
            <Button
              type="button"
              disabled
              title="Límite de 4 especialistas alcanzado"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Agregar especialista
            </Button>
          ) : (
            <Link href="/4dnn1n/content/specialists/new">
              <Button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90"
              >
                <Plus className="h-4 w-4" />
                Agregar especialista
              </Button>
            </Link>
          )
        }
      />
    </>
  );
}
