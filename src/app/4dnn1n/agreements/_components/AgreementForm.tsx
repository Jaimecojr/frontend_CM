"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Eraser } from "lucide-react";
import type {
  ApiAgreement,
  City,
  Department,
} from "../fetch";
import {
  getCitiesByDepartment,
  getDepartments,
} from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initial?: Partial<ApiAgreement>;
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

export default function AgreementForm({ mode, initial, onSubmit }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    amount: String((initial as any)?.amount ?? ""),
    city_id: (initial as any)?.city_id ?? "",
    state: Number((initial as any)?.state ?? 1),
  });

  // Departamentos
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

  // Preseleccionar departamento por city.department_id (edit/view)
  useEffect(() => {
    const depFromCity = (initial as any)?.city?.department_id;
    if (depFromCity && departmentId === "") {
      setDepartmentId(Number(depFromCity));
    }
  }, [initial, departmentId]);

  // Cargar ciudades al cambiar departamento
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

  const amountError = useMemo(() => {
    if (!form.amount) return null;
    return Number(form.amount) < 10000 ? "El valor debe ser mayor o igual a 10.000" : null;
  }, [form.amount]);

  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.amount) return false;
    if (Number(form.amount) < 10000) return false;
    if (!departmentId) return false;
    if (!form.city_id) return false;

    return true;
  }, [form, isView, departmentId]);

  const submit = async () => {
    if (!onSubmit) return;

    if (!canSubmit) return;

    const payload: any = {
      name: form.name,
      amount: Number(form.amount),
      city_id: Number(form.city_id),
      state: Number(form.state) === 1 ? 1 : 0,
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
      amount: "",
      city_id: "",
      state: 1,
    });

    setDepartmentId("");
    setCities([]);
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(isView || isEdit) && (
          <div>
            <Label>Código</Label>
            <input
              disabled
              value={(initial as any)?.id || ""}
              className="mt-1 w-full rounded-lg border px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50"
            />
          </div>
        )}

        <div>
          <Label required={!isView}>Nombre del Convenio</Label>
          <input
            value={form.name}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Valor ($)</Label>
          <input
            value={form.amount}
            disabled={isView}
            onChange={(e) =>
              setForm((p) => ({ ...p, amount: onlyDigits(e.target.value) }))
            }
            inputMode="numeric"
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${amountError ? "border-red-500 focus:outline-red-500" : ""}`}
            placeholder="Ej: 150000"
          />
          {amountError && (
            <p className="mt-1 text-xs text-red-500">{amountError}</p>
          )}
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
              (initial as any)?.city?.name ||
              cities.find((c) => String(c.id) === String(form.city_id))?.name ||
              ""
            }
          />
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
