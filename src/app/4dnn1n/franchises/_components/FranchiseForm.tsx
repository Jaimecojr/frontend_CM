"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Eraser } from "lucide-react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import type { ApiFranchise, City, Department } from "../fetch";
import { getCitiesByDepartment, getDepartments } from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import { alert } from "@/lib/alert";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initial?: Partial<ApiFranchise>;
  onSubmit?: (payload: any) => Promise<void>;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  return value.replace(/[^\d\s\-]/g, "");
}

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

export default function FranchiseForm({ mode, initial, onSubmit }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nit: initial?.nit ?? "",
    name: initial?.name ?? "",
    contact: (initial as any)?.contact ?? "",
    phone: (initial as any)?.phone ?? "",
    movil: (initial as any)?.movil ?? "",
    address: (initial as any)?.address ?? "",
    date_afi: (initial as any)?.date_afi ?? "",
    email: initial?.email ?? "",
    user: initial?.user ?? "",
    city_id: (initial as any)?.city_id ?? "",
    state: Number((initial as any)?.state ?? 1), // 1 activo, 2 inactivo
    password: "",
    password2: "",
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

  // Pre-seleccionar departamento cuando viene initial.city.department_id (edit/view)
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

          // ✅ si existe, mantener
          if (exists) return prev;

          // ✅ si no existe (o está vacío), poner primera ciudad por defecto
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

  const canSubmit = useMemo(() => {
    if (isView) return false;

    // obligatorios
    if (!form.nit || !form.name || !form.email || !form.user) return false;
    if (!departmentId) return false;
    if (!form.city_id) return false;
    if (form.movil && form.movil.length !== 10) return false;

    // create: password obligatorio
    if (isCreate) {
      if (!form.password || form.password.length < 6) return false;
      if (form.password !== form.password2) return false;
    }

    // edit: password opcional, pero si lo ponen, validar
    if (isEdit && form.password) {
      if (form.password.length < 6) return false;
      if (form.password !== form.password2) return false;
    }

    return true;
  }, [form, isView, isCreate, isEdit, departmentId]);

  const submit = async () => {
    if (!onSubmit) return;

    if (!canSubmit) {
      await alert.warn(
        "Faltan datos",
        "Revisa los campos obligatorios (y contraseñas).",
      );
      return;
    }

    const payload: any = {
      nit: form.nit,
      name: form.name,
      contact: form.contact || null,
      phone: form.phone || null,
      movil: form.movil || null,
      address: form.address || null,
      date_afi: form.date_afi || null,
      email: form.email,
      user: form.user,
      city_id: Number(form.city_id),
      state: isCreate ? 1 : Number(form.state),
    };

    if (isCreate) payload.password = form.password;
    if (isEdit && form.password) payload.password = form.password;

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
      nit: "",
      name: "",
      contact: "",
      phone: "",
      movil: "",
      address: "",
      date_afi: "",
      email: "",
      user: "",
      city_id: "",
      state: 1,
      password: "",
      password2: "",
    });

    setDepartmentId("");
    setCities([]);
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* NIT */}
        <div>
          <Label required={!isView}>NIT</Label>
          <input
            value={form.nit}
            disabled={isView}
            onChange={(e) =>
              setForm((p) => ({ ...p, nit: onlyDigits(e.target.value) }))
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Solo números"
          />
        </div>

        {/* Nombre franquicia */}
        <div>
          <Label required={!isView}>Nombre de franquicia</Label>
          <input
            value={form.name}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Ej: Franquicia Medellín"
          />
        </div>

        {/* Contacto */}
        <div>
          <Label>Nombre del contacto</Label>
          <input
            value={form.contact}
            disabled={isView}
            onChange={(e) =>
              setForm((p) => ({ ...p, contact: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Teléfonos */}
        <div>
          <Label>Teléfono(s)</Label>
          <input
            value={form.phone}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, phone: formatPhone(e.target.value) }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Ej: 6017654321 - 6017654322"
          />
        </div>

        {/* Celular */}
        <div>
          <Label>Celular</Label>
          <input
            value={form.movil}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, movil: onlyDigits(e.target.value).slice(0, 10) }))}
            inputMode="numeric"
            maxLength={10}
            className={`mt-1 w-full rounded-lg border px-3 py-2 ${form.movil && form.movil.length !== 10 ? "border-red-500 focus:outline-red-500" : ""}`}
            placeholder="Ej: 3001234567"
          />
          {form.movil && form.movil.length !== 10 && (
            <p className="mt-1 text-xs text-red-500">El celular debe tener exactamente 10 dígitos</p>
          )}
        </div>

        {/* Dirección */}
        <div>
          <Label>Dirección</Label>
          <input
            value={form.address}
            disabled={isView}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Departamento */}
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

        {/* Ciudad */}
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

        {/* Fecha creación */}
        <div>
          <Label>Fecha de creación</Label>
          <div className="mt-1">
            <DatePickerWithToday
              value={form.date_afi}
              disabled={isView}
              onChange={(date) => setForm((p) => ({ ...p, date_afi: date }))}
            />
          </div>
        </div>


        {/* Email */}
        <div>
          <Label required={!isView}>Email</Label>
          <input
            type="email"
            value={form.email}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Usuario */}
        <div>
          <Label required={!isView}>Usuario</Label>
          <input
            value={form.user}
            disabled={isView}
            onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Passwords: NO en view */}
        {!isView && (
          <div>
            <Label required={isCreate}>Contraseña</Label>
            <input
              type="password"
              value={form.password}
              disabled={isView}
              onChange={(e) =>
                setForm((p) => ({ ...p, password: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder={
                isCreate ? "Mínimo 6 caracteres" : "Dejar vacío para no cambiar"
              }
            />
          </div>
        )}

        {!isView && (
          <div>
            <Label required={isCreate}>Repetir contraseña</Label>
            <input
              type="password"
              value={form.password2}
              disabled={isView}
              onChange={(e) =>
                setForm((p) => ({ ...p, password2: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Repite la contraseña"
            />
          </div>
        )}
      </div>

      {/* Acciones */}
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
