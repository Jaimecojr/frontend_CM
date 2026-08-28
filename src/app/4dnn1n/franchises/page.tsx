"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { useAuth } from "@/context/AuthContext";

import { getFranchises, updateFranchiseState, type ApiFranchise } from "./fetch";
import { buildUserColumns } from "./_components/columns";

export default function FranchisePage() {
  usePageTitle("Franquicias");
  const { user } = useAuth();
  const isSuperAdmin = user?.type === 1;

  const { data, setData, loading } = useClientTable(getFranchises);

  const onToggleState = useOptimisticToggle<ApiFranchise, "state", 1 | 2>({
    field: "state",
    activeValue: 1,
    inactiveValue: 2,
    setData,
    setMeta: () => {},
    stadeFilter: "all",
    updateFn: updateFranchiseState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar franquicia?" : "¿Activar franquicia?"),
    confirmText: (isActive) =>
      isActive
        ? "La franquicia quedará inactiva y no podrá usarse hasta reactivarla."
        : "La franquicia quedará activa y podrá usarse nuevamente.",
    successMessage: (isActive) => (isActive ? "Franquicia inactivada." : "Franquicia activada."),
  });

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
