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

import { getCounselors, updateCounselorState, type ApiCounselor } from "./fetch";
import { buildCounselorColumns } from "./_components/columns";

export default function CounselorsPage() {
  usePageTitle("Vendedores");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  const { data, setData, loading } = useClientTable(getCounselors);

  const onToggleState = async (c: ApiCounselor) => {
    const isActive = Number(c.state) === 1;
    const nextState: 1 | 2 = isActive ? 2 : 1;

    try {
      const ok = await alert.confirm({
        title: isActive ? "¿Inactivar asesor?" : "¿Activar asesor?",
        text: isActive
          ? "El asesor quedará inactivo y no podrá usarse hasta reactivarlo."
          : "El asesor quedará activo y podrá usarse nuevamente.",
        confirmButtonText: isActive ? "Sí, inactivar" : "Sí, activar",
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, state: nextState } : x)));
          await updateCounselorState(c.id, nextState);
        },
      });
      if (ok) {
        await alert.success("Actualizado", isActive ? "Asesor inactivado." : "Asesor activado.");
      }
    } catch (err) {
      setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, state: c.state } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

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