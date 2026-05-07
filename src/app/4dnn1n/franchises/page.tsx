"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

import { getFranchises, updateFranchiseState, type ApiFranchise } from "./fetch";
import { buildUserColumns } from "./_components/columns";

export default function FranchisePage() {
  usePageTitle("Franquicias");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, setData, loading } = useClientTable(getFranchises);

  const onToggleState = async (franchise: ApiFranchise) => {
    const isActive = Number(franchise.state) === 1;
    const nextState: 1 | 2 = isActive ? 2 : 1;

    const ok = await alert.confirm({
      title: isActive ? "¿Inactivar franquicia?" : "¿Activar franquicia?",
      text: isActive
        ? "La franquicia quedará inactiva y no podrá usarse hasta reactivarla."
        : "La franquicia quedará activa y podrá usarse nuevamente.",
      confirmButtonText: isActive ? "Sí, inactivar" : "Sí, activar",
      cancelButtonText: "Cancelar",
    });

    if (!ok) return;

    setData((prev) => prev.map((u) => (u.id === franchise.id ? { ...u, state: nextState } : u)));

    try {
      await updateFranchiseState(franchise.id, nextState);
      await alert.success("Actualizado", isActive ? "Franquicia inactivada." : "Franquicia activada.");
    } catch (err) {
      setData((prev) => prev.map((u) => (u.id === franchise.id ? { ...u, state: franchise.state } : u)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildUserColumns({ onToggleState, isSuperAdmin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSuperAdmin],
  );

  return (
    <>
      <LoadingOverlay isLoading={loading} />

      <DataTable
        title="Lista Franquicias"
        columns={columns}
        data={data}
        defaultPageSize={20}
        pageSizeOptions={[20, 25, 50, 100]}
        searchPlaceholder="Buscar por nombre o email..."
        getSearchText={(u) => `${u.name} ${u.email}`}
        enableStateFilter={true}
        getStateValue={(u) => Number(u.state)}
        toolbarActions={
          isSuperAdmin ? (
            <CreateToolbarButton href="/4dnn1n/franchises/new" label="Crear Franquicia" />
          ) : null
        }
      />
    </>
  );
}
