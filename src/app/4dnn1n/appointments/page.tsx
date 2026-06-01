"use client";

import { useMemo, useState } from "react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";

import { getAppointments, deleteAppointment, type ApiAppointment } from "./fetch";
import { buildAppointmentColumns } from "./_components/columns";

const PERIOD_OPTIONS = [
  { label: "Pendientes", value: "pending" },
  { label: "Pasadas", value: "past" },
  { label: "Todas", value: "all" },
];

export default function AppointmentsPage() {
  usePageTitle("Citas");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  const [filterDate, setFilterDate] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("pending");

  const { setData, setMeta, tableProps, isInitialLoad } = useServerTable<ApiAppointment>(
    getAppointments,
    {
      defaultStade: "all",
      extraParams: {
        date: filterDate || undefined,
        period: filterDate ? undefined : filterPeriod,
      },
    },
  );

  const onDelete = async (c: ApiAppointment) => {
    try {
      const ok = await alert.confirm({
        title: "¿Eliminar cita?",
        text: `Se eliminará la cita de ${c.name}. Esta acción no se puede deshacer.`,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        icon: "warning",
        onConfirm: () => deleteAppointment(c.id),
      });
      if (ok) {
        setData((prev) => prev.filter((x) => x.id !== c.id));
        setMeta((m) => ({ ...m, total: m.total - 1 }));
        await alert.success("Eliminada", "La cita fue eliminada correctamente.");
      }
    } catch (err) {
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildAppointmentColumns({ onDelete, hasAccess }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAccess],
  );

  const extraFilters = (
    <>
      <select
        title="Filtrar por período"
        value={filterDate ? "" : filterPeriod}
        onChange={(e) => {
          setFilterDate("");
          setFilterPeriod(e.target.value);
        }}
        disabled={!!filterDate}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        {PERIOD_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <div className="relative shrink-0 flex items-center gap-1">
        <DatePickerWithToday
          value={filterDate}
          onChange={setFilterDate}
          placeholder="Filtrar por fecha"
          className="h-9 w-full sm:w-auto border-[1.5px] border-stroke bg-transparent outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
        />
        {filterDate && (
          <button
            type="button"
            onClick={() => setFilterDate("")}
            title="Limpiar fecha"
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-stroke text-dark-5 hover:text-red-500 dark:border-dark-3 dark:text-dark-6"
          >
            ×
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />

      <DataTable
        title="Lista de Citas"
        columns={columns}
        {...tableProps}
        enableStateFilter={false}
        searchPlaceholder="Buscar por nombre o médico..."
        extraFilters={extraFilters}
        toolbarActions={
          hasAccess ? (
            <CreateToolbarButton href="/4dnn1n/appointments/new" label="Crear Cita" />
          ) : null
        }
      />
    </>
  );
}
