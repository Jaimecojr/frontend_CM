"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

import { getMembershipForms, deleteMembershipForm, type ApiMembershipForm } from "./fetch";
import { buildMembershipFormColumns } from "./_components/columns";

export default function MembershipFormsPage() {
  usePageTitle("Solicitudes de Afiliación");

  const { data, setData, setMeta, tableProps, isInitialLoad } = useServerTable<ApiMembershipForm>(
    getMembershipForms,
    { defaultStade: "all" },
  );

  const onDelete = async (form: ApiMembershipForm) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar solicitud?",
        text: `Se eliminará la solicitud de ${form.name} ${form.lastname}. Esta acción no se puede deshacer.`,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          setData((prev) => prev.filter((x) => x.id !== form.id));
          setMeta((m) => ({ ...m, total: m.total - 1 }));
          await deleteMembershipForm(form.id);
        },
      });
      if (ok) {
        await alert.success("Eliminado", "Solicitud eliminada correctamente.");
      }
    } catch (err) {
      setData((prev) => [...prev, form]);
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildMembershipFormColumns({ onDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />
      <DataTable
        title="Solicitudes de Afiliación"
        columns={columns}
        {...tableProps}
        enableStateFilter={false}
        hideSearch
      />
    </>
  );
}
