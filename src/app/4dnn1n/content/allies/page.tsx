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

import { getAllies, deleteAlly, type ApiAlly } from "./fetch";
import { buildAllyColumns } from "./_components/columns";

export default function AlliesPage() {
  usePageTitle("Aliados Estratégicos");

  const { data, setData, loading } = useClientTable(getAllies);

  const onDelete = async (ally: ApiAlly) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar aliado?",
        text: "Se eliminará el banner y no se puede deshacer.",
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          setData((prev) => prev.filter((x) => x.id !== ally.id));
          await deleteAlly(ally.id);
        },
      });
      if (ok) {
        await alert.success("Eliminado", "Aliado eliminado correctamente.");
      }
    } catch (err) {
      setData((prev) => [...prev, ally]);
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildAllyColumns({ onDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const atLimit = data.length >= 6;

  return (
    <>
      <LoadingOverlay isLoading={loading} />
      <DataTable
        title="Aliados Estratégicos"
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
              title="Límite de 6 aliados alcanzado"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              Agregar aliado
            </Button>
          ) : (
            <Link href="/4dnn1n/content/allies/new">
              <Button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90"
              >
                <Plus className="h-4 w-4" />
                Agregar aliado
              </Button>
            </Link>
          )
        }
      />
    </>
  );
}
