"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { useAuth } from "@/context/AuthContext";
import { getDoctors, updateDoctorState, type ApiDoctor } from "./fetch";
import { buildDoctorColumns } from "./_components/columns";
import { getDepartments, getCitiesByDepartment, type Department, type City } from "../counselors/fetch";
import { getSpecialties, type ApiSpecialty } from "./specialties/fetch";

const STATE_OPTIONS = [
  { label: "Activos", value: "1" },
  { label: "Inactivos", value: "2" },
];

export default function DoctorsPage() {
  usePageTitle("Médicos");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  // Filtros Avanzados
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | "">("");
  const [filterCityId, setFilterCityId] = useState<number | "">("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<number | "">("");

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
    getSpecialties().then(list => setSpecialties(list.filter(s => s.state === 1))).catch(console.error);
  }, []);

  useEffect(() => {
    if (!filterDepartmentId) {
      setCities([]);
      setFilterCityId("");
      return;
    }
    getCitiesByDepartment(Number(filterDepartmentId)).then(setCities).catch(console.error);
  }, [filterDepartmentId]);

  const handleSpecialtyChange = (val: string) => {
    setSpecialtySearch(val);
    if (!val) {
      setFilterSpecialtyId("");
      return;
    }
    const spec = specialties.find((s) => s.name.toLowerCase() === val.toLowerCase());
    if (spec) setFilterSpecialtyId(spec.id);
    else setFilterSpecialtyId("");
  };

  const { data, setData, setMeta, stadeFilter, tableProps, isInitialLoad } = useServerTable<ApiDoctor>(
    getDoctors,
    { 
      defaultStade: "1",
      extraParams: {
        department_id: filterDepartmentId || undefined,
        city_id: filterCityId || undefined,
        specialty_id: filterSpecialtyId || undefined,
      }
    },
  );

  const onToggleState = async (item: ApiDoctor) => {
    const isActive = Number(item.state) === 1;
    const nextState: 1 | 2 = isActive ? 2 : 1;

    try {
      const ok = await alert.confirm({
        title: isActive ? "¿Inactivar médico?" : "¿Activar médico?",
        text: isActive
          ? "El médico no aparecerá activo en el sistema."
          : "El médico volverá a estar disponible.",
        confirmButtonText: "Sí, continuar",
        onConfirm: async () => {
          setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, state: nextState } : x)));
          await updateDoctorState(item.id, nextState);
        },
      });
      if (ok) {
        await alert.success("Actualizado", `El médico ha sido ${isActive ? "inactivado" : "activado"}.`);
        if (stadeFilter !== "all") {
          setData((prev) => prev.filter((x) => x.id !== item.id));
          setMeta((m) => ({ ...m, total: m.total - 1 }));
        }
      }
    } catch (err) {
      setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, state: item.state } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };

  const columns = useMemo(
    () => buildDoctorColumns({ onToggleState, hasAccess }),
    [hasAccess], // eslint-disable-line
  );

  const extraFilters = (
    <>
      <select
        title="Filtrar por Departamento"
        value={filterDepartmentId}
        onChange={(e) => setFilterDepartmentId(e.target.value ? Number(e.target.value) : "")}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        <option value="">Departamento (Todos)</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>

      <select
        title="Filtrar por Ciudad"
        value={filterCityId}
        onChange={(e) => setFilterCityId(e.target.value ? Number(e.target.value) : "")}
        disabled={!filterDepartmentId || cities.length === 0}
        className="h-9 w-full sm:w-auto shrink-0 rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary disabled:opacity-50 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
      >
        <option value="">Ciudad (Todas)</option>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="relative shrink-0 w-full sm:w-auto">
        <input
          list="specialties-filter-list"
          value={specialtySearch}
          onChange={(e) => handleSpecialtyChange(e.target.value)}
          className="h-9 w-full sm:w-[180px] rounded-lg border-[1.5px] border-stroke bg-transparent px-3 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
          placeholder="Especialidad (Todas)"
          autoComplete="off"
        />
        <datalist id="specialties-filter-list">
          {specialties.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>
      </div>
    </>
  );

  return (
    <>
      <LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />

      <div className="mb-4 flex justify-end">
        {hasAccess && (
          <Link href="/4dnn1n/doctors/specialties">
            <Button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
            >
              <Settings className="h-4 w-4" />
              Gestionar Especialidades
            </Button>
          </Link>
        )}
      </div>

      <DataTable
        title="Directorio de Médicos"
        columns={columns}
        {...tableProps}
        searchPlaceholder="Buscar por nombre o apellido..."
        enableStateFilter={true}
        stateFilterOptions={STATE_OPTIONS}
        extraFilters={extraFilters}
        toolbarActions={
          hasAccess ? <CreateToolbarButton href="/4dnn1n/doctors/new" label="Crear Médico" /> : null
        }
      />
    </>
  );
}
