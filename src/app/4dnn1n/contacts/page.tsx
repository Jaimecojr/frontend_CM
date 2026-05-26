"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/data-table/DataTable";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

import { getContacts, deleteContact, type ApiContact } from "./fetch";
import { buildContactColumns } from "./_components/columns";

export default function ContactsPage() {
  usePageTitle("Mensajes de Contacto");

  const { data, setData, setMeta, tableProps, isInitialLoad } = useServerTable<ApiContact>(
    getContacts,
  );

  const onDelete = async (contact: ApiContact) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar mensaje?",
        text: `Se eliminará el mensaje de ${contact.name}. Esta acción no se puede deshacer.`,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          setData((prev) => prev.filter((x) => x.id !== contact.id));
          setMeta((m) => ({ ...m, total: m.total - 1 }));
          await deleteContact(contact.id);
        },
      });
      if (ok) {
        await alert.success("Eliminado", "Mensaje eliminado correctamente.");
      }
    } catch (err) {
      setData((prev) => [...prev, contact]);
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildContactColumns({ onDelete }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />
      <DataTable
        title="Mensajes de Contacto"
        columns={columns}
        {...tableProps}
        enableStateFilter={false}
        hideSearch
      />
    </>
  );
}
