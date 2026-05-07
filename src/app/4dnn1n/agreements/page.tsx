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

import { getAgreements, updateAgreementState, type ApiAgreement } from "./fetch";
import { buildAgreementColumns } from "./_components/columns";

const STATE_OPTIONS = [
  { label: "Activos", value: "1" },
  { label: "Inactivos", value: "0" },
];

export default function AgreementsPage() {
  usePageTitle("Convenios");
  const { user } = useAuth();
  const canView = user?.type === 1 || user?.type === 2;
  const canManage = user?.type === 1;

  const { data, setData, loading } = useClientTable(getAgreements);

  const onToggleState = async (agreement: ApiAgreement) => {
    const isActive = Number(agreement.state) === 1;
    const nextState: 1 | 0 = isActive ? 0 : 1;

    const ok = await alert.confirm({
      title: isActive ? "¿Inactivar convenio?" : "¿Activar convenio?",
      text: isActive ? "El convenio quedará inactivo." : "El convenio quedará activo nuevamente.",
      confirmButtonText: isActive ? "Sí, inactivar" : "Sí, activar",
      cancelButtonText: "Cancelar",
    });

    if (!ok) return;

    setData((prev) => prev.map((x) => (x.id === agreement.id ? { ...x, state: nextState } : x)));

    try {
      await updateAgreementState(agreement, nextState);
      await alert.success("Actualizado", isActive ? "Convenio inactivado." : "Convenio activado.");
    } catch (err) {
      setData((prev) => prev.map((x) => (x.id === agreement.id ? { ...x, state: agreement.state } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildAgreementColumns({ onToggleState, canView, canManage }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canView, canManage],
  );

  return (
    <>
      <LoadingOverlay isLoading={loading} />

      <DataTable
        title="Lista de Convenios"
        columns={columns}
        data={data}
        defaultPageSize={20}
        pageSizeOptions={[20, 25, 50, 100]}
        searchPlaceholder="Buscar por nombre o ciudad..."
        getSearchText={(c) => `${c.name} ${c.city?.name ?? ""}`}
        enableStateFilter={true}
        getStateValue={(c) => Number(c.state)}
        stateFilterOptions={STATE_OPTIONS}
        toolbarActions={
          canManage ? (
            <CreateToolbarButton href="/4dnn1n/agreements/new" label="Crear Convenio" />
          ) : null
        }
      />
    </>
  );
}
