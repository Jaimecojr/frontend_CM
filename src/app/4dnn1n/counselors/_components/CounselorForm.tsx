"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Eraser } from "lucide-react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import type {
  ApiCounselor,
  City,
  Department,
  CounselorTypeContra,
  FranchiseOption,
} from "../fetch";
import {
  getCitiesByDepartment,
  getDepartments,
  checkCounselorIdCard,
  getActiveFranchises,
} from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initial?: Partial<ApiCounselor>;
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

const TYPE_CONTRA: CounselorTypeContra[] = [
  "Término Fijo",
  "Término Indefinido",
  "Corretaje",
  "Con Garantizado",
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  return value.replace(/[^\d\s\-]/g, "");
}

export default function CounselorForm({ mode, initial, onSubmit }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const counselorId = Number((initial as any)?.id ?? 0) || undefined;
  const initialIdCard = String((initial as any)?.id_card ?? "");
  const initialRoleNum = Number((initial as any)?.rol ?? 0);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);

  const [saving, setSaving] = useState(false);

  // id card validation state
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const lastCheckedRef = useRef<string>("");

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: (initial as any)?.lastname ?? "",
    id_card: String((initial as any)?.id_card ?? ""),
    address: (initial as any)?.address ?? "",
    date_admission: (initial as any)?.date_admission ?? "",
    type_contra: (initial as any)?.type_contra ?? TYPE_CONTRA[0],

    // rol always 0
    rol: 0,

    phone: (initial as any)?.phone ?? "",
    movil: (initial as any)?.movil ?? "",

    city_id: (initial as any)?.city_id ?? "",
    user_id: (initial as any)?.user_id ?? "",

    state: Number((initial as any)?.state ?? 1),
  });

  //Franchises
  useEffect(() => {
    (async () => {
      try {
        const list = await getActiveFranchises();
        setFranchises(list);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

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
    const depFromCity = (initial as any)?.city?.department_id;
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

  // validates id card against backend (no unique constraint in DB)
  const validateIdCard = async (raw: string) => {
    const value = onlyDigits(raw);

    // if empty, error
    if (!value) {
      setIdCardError("La cédula es obligatoria.");
      return false;
    }

    // if editing and it hasn't changed, skip validation
    if (isEdit && value === onlyDigits(initialIdCard)) {
      setIdCardError(null);
      return true;
    }

    // avoid querying the same value repeatedly
    if (lastCheckedRef.current === value && idCardError === null) return true;

    setCheckingIdCard(true);
    try {
      const res = await checkCounselorIdCard(value, counselorId);
      lastCheckedRef.current = value;

      if (res.exists) {
        setIdCardError("Esta cédula ya existe en el sistema.");
        return false;
      }

      setIdCardError(null);
      return true;
    } catch (e) {
      // if the query fails, don't block completely, but do warn
      setIdCardError("No se pudo validar la cédula (intenta de nuevo).");
      return false;
    } finally {
      setCheckingIdCard(false);
    }
  };



  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.lastname || !form.id_card) return false;
    if (!!idCardError) return false; // if it's invalid

    if (!form.type_contra) return false;
    if (!departmentId) return false;
    if (!form.city_id) return false;
    if (!form.user_id) return false;
    if (form.movil && form.movil.length !== 10) return false;

    return true;
  }, [form, isView, departmentId, idCardError]);

  const submit = async () => {
    if (!onSubmit) return;

    // force validation before submitting
    const okId = await validateIdCard(form.id_card);
    if (!okId) {
      await alert.warn("Cédula inválida", "Revisa la cédula antes de guardar.");
      return;
    }

    if (!canSubmit) {
      await alert.warn("Faltan datos", "Revisa los campos obligatorios.");
      return;
    }

    const payload: any = {
      name: form.name,
      lastname: form.lastname,
      id_card: onlyDigits(form.id_card), // always numeric
      address: form.address || null,
      date_admission: form.date_admission || null,
      type_contra: form.type_contra,

      rol: 0,
      phone: form.phone || null,
      movil: form.movil || null,

      city_id: Number(form.city_id),
      user_id: Number(form.user_id),

      state: Number(form.state) === 2 ? 2 : 1,
      email: null,
      password: null,
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
      id_card: "",
      address: "",
      date_admission: "",
      type_contra: TYPE_CONTRA[0],
      rol: 0,
      phone: "",
      movil: "",
      city_id: "",
      user_id: "",
      state: 1,
    });

    setDepartmentId("");
    setCities([]);
    setIdCardError(null);
    lastCheckedRef.current = "";
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
            onChange={(e) =>
              setForm((p) => ({ ...p, lastname: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <Label required={!isView}>Cédula</Label>
          <input
            value={form.id_card}
            disabled={isView}
            onChange={(e) =>
              setForm((p) => ({ ...p, id_card: onlyDigits(e.target.value) }))
            }
            onBlur={() => {
              if (!isView) validateIdCard(form.id_card);
            }}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="Solo números"
          />
          {checkingIdCard ? (
            <p className="text-muted-foreground mt-1 text-xs">
              Validando cédula...
            </p>
          ) : null}
          {idCardError ? (
            <p className="mt-1 text-xs text-red-600">{idCardError}</p>
          ) : null}
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

        <div>
          <Label>Fecha de ingreso</Label>
          <div className="mt-1">
            <DatePickerWithToday
              value={form.date_admission}
              disabled={isView}
              onChange={(date) => setForm((p) => ({ ...p, date_admission: date }))}
            />
          </div>
        </div>

        <div>
          <Label required={!isView}>Franquicia</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={franchises.map((f) => ({ value: f.id, label: f.name }))}
            value={form.user_id}
            onChange={(v) => setForm((p) => ({ ...p, user_id: v }))}
            disabledPlaceholder={franchises.find((f) => String(f.id) === String(form.user_id))?.name || ""}
          />
        </div>

        <div>
          <Label required>Tipo de contrato</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={TYPE_CONTRA.map((t) => ({ value: t, label: t }))}
            value={form.type_contra}
            onChange={(v) => setForm((p) => ({ ...p, type_contra: v }))}
            disabledPlaceholder={form.type_contra}
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
