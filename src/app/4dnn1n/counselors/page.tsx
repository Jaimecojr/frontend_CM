"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { useAuth } from "@/context/AuthContext";

import { getCounselors, updateCounselorState, type ApiCounselor } from "./fetch";
import { buildCounselorColumns } from "./_components/columns";

export default function CounselorsPage() {
  usePageTitle("Vendedores");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  const { data, setData, loading } = useClientTable(getCounselors);

  const onToggleState = useOptimisticToggle<ApiCounselor, "state", 1 | 2>({
    field: "state",
    activeValue: 1,
    inactiveValue: 2,
    setData,
    setMeta: () => {},
    stadeFilter: "all",
    updateFn: updateCounselorState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar asesor?" : "¿Activar asesor?"),
    confirmText: (isActive) =>
      isActive
        ? "El asesor quedará inactivo y no podrá usarse hasta reactivarlo."
        : "El asesor quedará activo y podrá usarse nuevamente.",
    successMessage: (isActive) => (isActive ? "Asesor inactivado." : "Asesor activado."),
  });

  const columns = useMemo(
    () => buildCounselorColumns({ onToggleState, hasAccess }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAccess],
  );

  return (
    <>
      <LoadingOverlay isLoading={loading} />

      <DataTable
        title="Lista Asesores"
        columns={columns}
        data={data}
        defaultPageSize={20}
        pageSizeOptions={[20, 25, 50, 100]}
        searchPlaceholder="Buscar por nombre o cédula..."
        getSearchText={(c) => `${c.name} ${c.lastname} ${c.id_card} ${c.email ?? ""}`}
        enableStateFilter={true}
        getStateValue={(c) => Number(c.state)}
        toolbarActions={
          hasAccess ? (
            <CreateToolbarButton href="/4dnn1n/counselors/new" label="Crear Asesor" />
          ) : null
        }
      />
    </>
  );
}