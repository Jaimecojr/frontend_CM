"use client";

import { useEffect, useMemo, useRef } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
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

  // `columns` only memoizes on [canView, canManage] (both stable after the first render,
  // since this page only mounts once auth is already resolved), so the `onToggleState`
  // closed over inside `columns` is always the one from the first invocation. For
  // `updateFn` to resolve the full agreement by id without depending on that stale
  // closure, it always reads the latest `data` from a ref instead of the closed-over variable.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const onToggleState = useOptimisticToggle<ApiAgreement, "state", 1 | 0>({
    field: "state",
    activeValue: 1,
    inactiveValue: 0,
    setData,
    setMeta: () => {},
    stadeFilter: "all",
    updateFn: (id, nextState) => {
      const agreement = dataRef.current.find((a) => a.id === id);
      if (!agreement) return Promise.reject(new Error("Convenio no encontrado en la lista actual"));
      return updateAgreementState(id, agreement, nextState);
    },
    confirmTitle: (isActive) => (isActive ? "¿Inactivar convenio?" : "¿Activar convenio?"),
    confirmText: (isActive) =>
      isActive ? "El convenio quedará inactivo." : "El convenio quedará activo nuevamente.",
    successMessage: (isActive) => (isActive ? "Convenio inactivado." : "Convenio activado."),
  });

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
