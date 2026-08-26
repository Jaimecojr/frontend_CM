"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

import { getAffiliates, updateAffiliateState, sendCarnet, type ApiAffiliate } from "./fetch";
import { buildAffiliateColumns } from "./_components/columns";
import { NoteModal } from "./_components/NoteModal";

const STATE_OPTIONS = [
  { label: "Activos", value: "1" },
  { label: "Inactivos", value: "2" },
];

export default function AffiliatesPage() {
  usePageTitle("Usuarios");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;
  const canToggle = user?.type === 1;

  const { data, setData, setMeta, stadeFilter, tableProps, isInitialLoad } = useServerTable<ApiAffiliate>(
    getAffiliates,
    { defaultStade: "1" },
  );

  // Quick-note modal state
  const [noteTarget, setNoteTarget] = useState<ApiAffiliate | null>(null);

  const onToggleState = useOptimisticToggle<ApiAffiliate, "stade", 1 | 2>({
    field: "stade",
    activeValue: 1,
    inactiveValue: 2,
    setData,
    setMeta,
    stadeFilter,
    updateFn: updateAffiliateState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar afiliado?" : "¿Activar afiliado?"),
    confirmText: (isActive) => (isActive ? "El afiliado quedará inactivo." : "El afiliado quedará activo."),
    successMessage: (isActive) => (isActive ? "Afiliado inactivado." : "Afiliado activado."),
  });

  const onSendCarnet = async (c: ApiAffiliate) => {
    try {
      const ok = await alert.confirm({
        title: "¿Enviar carnet?",
        text: `Se enviará el carnet de ${c.name} ${c.lastname} por WhatsApp al número ${c.movil}.`,
        confirmButtonText: "Sí, enviar",
        cancelButtonText: "Cancelar",
        icon: "question",
        onConfirm: () => sendCarnet(c.id),
      });
      if (ok) {
        setData((prev) => prev.map((x) => (x.id === c.id ? { ...x, carnet: "si" as const } : x)));
        await alert.success("Carnet enviado", "El carnet fue enviado exitosamente por WhatsApp.");
      }
    } catch (err) {
      await alert.error("Envío fallido", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildAffiliateColumns({
      onToggleState,
      onSendCarnet,
      onAddNote: (c) => setNoteTarget(c),
      hasAccess,
      canToggle,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAccess, canToggle, stadeFilter],
  );

  return (
    <>
      <LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />

      <DataTable
        title="Lista de Usuarios"
        columns={columns}
        {...tableProps}
        searchPlaceholder="Buscar por nombre o documento..."
        stateFilterOptions={STATE_OPTIONS}
        toolbarActions={
          hasAccess ? (
            <CreateToolbarButton href="/4dnn1n/affiliates/new" label="Crear Afiliado" />
          ) : null
        }
      />

      {/* Quick-note modal from the list */}
      {noteTarget && (
        <NoteModal
          affiliateId={noteTarget.id}
          affiliateName={`${noteTarget.name} ${noteTarget.lastname}`}
          onClose={() => setNoteTarget(null)}
        />
      )}
    </>
  );
}
