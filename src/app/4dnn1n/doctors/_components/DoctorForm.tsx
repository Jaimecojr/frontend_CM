"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Eraser } from "lucide-react";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import type { ApiDoctor } from "../fetch";
import { getDepartments, getCitiesByDepartment } from "../../counselors/fetch";
import type { Department, City } from "@/types/geo";
import { getSpecialties, type ApiSpecialty } from "../specialties/fetch";
import { Button } from "@/components/ui-elements/button";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initial?: Partial<ApiDoctor>;
  onSubmit?: (payload: any) => Promise<void>;
};

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  return value.replace(/[^\d\s\-]/g, "");
}

export default function DoctorForm({ mode, initial, onSubmit }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: initial?.lastname ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",
    address: initial?.address ?? "",
    secretary_name: initial?.secretary_name ?? "",
    value_agreement: initial?.value_agreement ? String(initial.value_agreement) : "",
    specialty_id: initial?.specialty_id ? String(initial.specialty_id) : "",
    city_id: initial?.city_id ? String(initial.city_id) : "",
    state: initial?.state ?? 1,
  });

  // Specialties (only active ones, or all if view mode)
  useEffect(() => {
    (async () => {
      try {
        const list = await getSpecialties();
        const currentSpecId = Number(initial?.specialty_id);
        const filtered = list.filter(s => s.state === 1 || (currentSpecId && s.id === currentSpecId));
        setSpecialties(filtered);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [initial?.specialty_id]);

  // Departments
  useEffect(() => {
    (async () => {
      try {
        const deps = await getDepartments();
        setDepartments(deps);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Preselect department from city.department_id (edit/view)
  useEffect(() => {
    const depFromCity = initial?.city?.department_id || (initial as any)?.department_id;
    if (depFromCity && departmentId === "") {
      setDepartmentId(Number(depFromCity));
    }
  }, [initial, departmentId]);

  // Load cities when department changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!departmentId) {
        setCities([]);
        setForm((p) => ({ ...p, city_id: "" }));
        return;
      }

      try {
        const list = await getCitiesByDepartment(Number(departmentId));
        if (cancelled) return;

        setCities(list);

        setForm((prev) => {
          const currentCity = prev.city_id ? Number(prev.city_id) : 0;
          const exists = currentCity && list.some((c) => c.id === currentCity);
          if (exists) return prev;

          const firstCityId = list[0]?.id ? String(list[0].id) : "";
          return { ...prev, city_id: firstCityId };
        });
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const valueAgreementError = useMemo(() => {
    if (!form.value_agreement) return null;
    return Number(form.value_agreement) < 10000 ? "El valor debe ser mayor o igual a 10.000" : null;
  }, [form.value_agreement]);

  const movilError = useMemo(() => {
    if (!form.movil) return null;
    return form.movil.length !== 10 ? "El celular debe tener exactamente 10 dígitos" : null;
  }, [form.movil]);

  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.lastname) return false;
    if (!form.specialty_id) return false;
    if (!departmentId) return false;
    if (!form.city_id) return false;
    if (!form.phone || !form.movil || !form.address || !form.secretary_name || !form.value_agreement) return false;
    if (Number(form.value_agreement) < 10000) return false;
    if (form.movil.length !== 10) return false;

    return true;
  }, [form, isView, departmentId]);

  const submit = async () => {
    if (!onSubmit || !canSubmit) return;

    const payload: Partial<ApiDoctor> = {
      name: form.name,
      lastname: form.lastname,
      email: form.email || null,
      phone: form.phone,
      movil: form.movil,
      address: form.address,
      secretary_name: form.secretary_name,
      value_agreement: Number(form.value_agreement) || 0,
      specialty_id: Number(form.specialty_id),
      city_id: Number(form.city_id),
      state: Number(form.state) === 2 ? 2 : 1,
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    if (isView) return;

    setForm({
      name: "",
      lastname: "",
      email: "",
      phone: "",
      movil: "",
      address: "",
      secretary_name: "",
      value_agreement: "",
      specialty_id: "",
      city_id: "",
      state: 1,
    });

    setDepartmentId("");
    setCities([]);
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label required={!isView}>Nombres</Label>
          <input
            value={form.name}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Apellidos</Label>
          <input
            value={form.lastname}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, lastname: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label>Correo Electrónico</Label>
          <input
            type="email"
            value={form.email}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Especialidad</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={specialties.map((s) => ({ value: s.id, label: s.name }))}
            value={form.specialty_id}
            onChange={(v) => setForm((p) => ({ ...p, specialty_id: v }))}
            disabledPlaceholder={
              specialties.find((s) => String(s.id) === String(form.specialty_id))?.name ||
              initial?.specialty?.name ||
              ""
            }
          />
        </div>

        <div>
          <Label required={!isView}>Departamento</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={departmentId}
            onChange={(v) => setDepartmentId(v ? Number(v) : "")}
            disabledPlaceholder={departments.find((d) => d.id === departmentId)?.name || ""}
          />
        </div>

        <div>
          <Label required={!isView}>Ciudad</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView || !departmentId}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            value={form.city_id}
            onChange={(v) => setForm((p) => ({ ...p, city_id: v }))}
            placeholder={departmentId ? "Seleccionar…" : "Selecciona un departamento"}
            disabledPlaceholder={
              initial?.city?.name ||
              cities.find((c) => String(c.id) === String(form.city_id))?.name ||
              ""
            }
          />
        </div>

        <div>
          <Label required={!isView}>Teléfono(s)</Label>
          <input
            value={form.phone}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Celular</Label>
          <input
            value={form.movil}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, movil: onlyDigits(e.target.value).slice(0, 10) }))}
            inputMode="numeric"
            maxLength={10}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${movilError ? "border-red-500 focus:outline-red-500" : ""}`}
            placeholder="Ej: 3001234567"
          />
          {movilError && (
            <p className="mt-1 text-xs text-red-500">{movilError}</p>
          )}
        </div>

        <div>
          <Label required={!isView}>Dirección</Label>
          <input
            value={form.address}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Nombre Secretaria</Label>
          <input
            value={form.secretary_name}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, secretary_name: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Valor Convenio</Label>
          <input
            value={form.value_agreement}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, value_agreement: onlyDigits(e.target.value) }))}
            inputMode="numeric"
            placeholder="Ej: 150000"
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${valueAgreementError ? "border-red-500 focus:outline-red-500" : ""}`}
          />
          {valueAgreementError && (
            <p className="mt-1 text-xs text-red-500">{valueAgreementError}</p>
          )}
        </div>

      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        {!isView && (
          <Button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
            disabled={saving}
          >
            <Eraser className="h-4 w-4" />
            Limpiar
          </Button>
        )}

        {!isView && (
          <Button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-gray-2 hover:bg-opacity-90 disabled:opacity-50"
            disabled={!canSubmit || saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        )}
      </div>
    </div>
  );
}
