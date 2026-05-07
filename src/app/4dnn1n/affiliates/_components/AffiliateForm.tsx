"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Eraser, Plus, Trash2 } from "lucide-react";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import type {
  ApiAffiliate,
  City,
  Department,
  FranchiseOption,
  CounselorOption,
  AgreementOption,
  ApiBeneficiary,
} from "../fetch";
import {
  getCitiesByDepartment,
  getDepartments,
  getActiveFranchises,
  getActiveCounselors,
  getActiveAgreements,
  checkAffiliateIdCard,
} from "../fetch";
import { Button } from "@/components/ui-elements/button";
import { alert } from "@/lib/alert";

type Mode = "create" | "edit" | "view";

type Props = {
  mode: Mode;
  initial?: Partial<ApiAffiliate>;
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

// Helpers globales para fechas
function getTodayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function addOneYear(dateString: string) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return ""; // in case of invalid date
  d.setFullYear(d.getFullYear() + 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export default function AffiliateForm({ mode, initial, onSubmit }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const affiliateId = Number(initial?.id ?? 0) || undefined;
  const initialIdCard = String(initial?.id_card ?? "");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [agreements, setAgreements] = useState<AgreementOption[]>([]);

  const [saving, setSaving] = useState(false);

  // estado de validación cédula
  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const lastCheckedRef = useRef<string>("");

  // Búsqueda inteligente de asesores
  const [searchCounselor, setSearchCounselor] = useState("");
  const [showCounselors, setShowCounselors] = useState(false);

  // Vigencias
  const defaultToday = getTodayString();

  // Estados para renovación
  const [wantsRenovation, setWantsRenovation] = useState("no");
  const [renovationType, setRenovationType] = useState("vencimiento");
  const [renovationDateIni, setRenovationDateIni] = useState("");
  const [renovationValue, setRenovationValue] = useState("");

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: initial?.lastname ?? "",
    id_card: String(initial?.id_card ?? ""),
    address: initial?.address ?? "",
    bithdate: initial?.bithdate ?? "",
    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",
    email: initial?.email ?? "",

    city_id: initial?.city_id ?? "",
    user_id: initial?.user_id ?? "",
    agreement_id: initial?.agreement_id ?? "",
    counselor_id: initial?.counselor_id ?? "",

    validity: initial?.validity ?? defaultToday,
    validity_end: initial?.validity_end ?? addOneYear(defaultToday),
    sale_date: initial?.sale_date ?? defaultToday,
    balance: initial?.balance ?? 0,
    value_sale: initial?.value_sale ?? 0,
    comission: FormNumber(initial?.comission, 0),
    payment_commission: (initial?.payment_commission as "si" | "no") ?? "no",
    company: initial?.company ?? "",

    carnet: (initial?.carnet as "si" | "no") ?? "no",
    state: Number(initial?.state ?? 1),
    stade: Number(initial?.stade ?? 1),
    contract_code: initial?.contract_code ?? "",

    beneficiaries: (initial?.beneficiaries?.length
      ? initial.beneficiaries
      : [{ name: "" }]) as ApiBeneficiary[],
  });

  // Safe number formatter
  function FormNumber(val: any, def: number) {
    if (val !== undefined && val !== null) return Number(val);
    return def;
  }

  // Set counselor auto-search text initially
  useEffect(() => {
    if (initial?.counselor && initial.counselor.name) {
      setSearchCounselor(
        `${initial.counselor.name} ${initial.counselor.lastname}`,
      );
    }
  }, [initial]);

  // Set renovation value based on agreement
  useEffect(() => {
    if (isEdit && wantsRenovation === "si" && agreements.length > 0 && form.agreement_id) {
       const selected = agreements.find(a => a.id === Number(form.agreement_id));
       if (selected?.amount) {
          setRenovationValue(selected.amount.toString());
       }
    }
  }, [form.agreement_id, wantsRenovation, agreements, isEdit]);

  // Set renovation dates
  useEffect(() => {
    if (isEdit && wantsRenovation === "si") {
      if (renovationType === "vencimiento") {
        setRenovationDateIni(initial?.validity_end || form.validity_end || "");
      } else {
        setRenovationDateIni(getTodayString());
      }
    }
  }, [renovationType, wantsRenovation, initial?.validity_end, form.validity_end, isEdit]);

  // Cargar info bases
  useEffect(() => {
    (async () => {
      try {
        const [listFranchises, listCounselors, listAgreements, deps] =
          await Promise.all([
            getActiveFranchises(),
            getActiveCounselors(),
            getActiveAgreements(),
            getDepartments(),
          ]);
        setFranchises(listFranchises);
        setCounselors(listCounselors);
        setAgreements(listAgreements);
        setDepartments(deps);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Preseleccionar departamento por city.department_id (edit/view)
  useEffect(() => {
    const depFromCity = initial?.city?.department_id;
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

  // Validador de Cédula
  const validateIdCard = async (raw: string) => {
    const value = onlyDigits(raw);

    if (!value) {
      setIdCardError("El documento es obligatorio.");
      return false;
    }

    if (isEdit && value === onlyDigits(initialIdCard)) {
      setIdCardError(null);
      return true;
    }

    if (lastCheckedRef.current === value && idCardError === null) return true;

    setCheckingIdCard(true);
    try {
      const res = await checkAffiliateIdCard(value, affiliateId);
      lastCheckedRef.current = value;

      if (res.exists) {
        setIdCardError("Este documento ya existe en la base de datos.");
        return false;
      }

      setIdCardError(null);
      return true;
    } catch (e) {
      setIdCardError("No se pudo validar el documento.");
      return false;
    } finally {
      setCheckingIdCard(false);
    }
  };

  // Manejador Beneficiarios
  const addBeneficiary = () => {
    if (form.beneficiaries.length >= 7) return;
    setForm((p) => ({
      ...p,
      beneficiaries: [...p.beneficiaries, { name: "" }],
    }));
  };

  const removeBeneficiary = (index: number) => {
    if (form.beneficiaries.length <= 1) return;
    setForm((p) => {
      const b = [...p.beneficiaries];
      b.splice(index, 1);
      return { ...p, beneficiaries: b };
    });
  };

  const updateBeneficiaryName = (index: number, name: string) => {
    setForm((p) => {
      const b = [...p.beneficiaries];
      b[index].name = name;
      return { ...p, beneficiaries: b };
    });
  };

  // Filtrado de Asesores (Autocomplete)
  const filteredCounselors = useMemo(() => {
    const s = searchCounselor.toLowerCase();
    if (!s) return counselors;
    return counselors.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.lastname.toLowerCase().includes(s),
    );
  }, [counselors, searchCounselor]);

  // Bloqueo envíos invalidos
  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.lastname || !form.id_card) return false;
    if (!!idCardError) return false;

    // Celular validación: 10 dígitos exactos si lo llenaron (Wait, user said solo numeros y 10 digitos. Si es requerido: form.movil.length === 10)
    if (!form.movil || form.movil.length !== 10) return false;

    if (!form.user_id) return false; // Franquicia requerida
    if (!form.counselor_id) return false; // Asesor requerido
    if (!form.agreement_id) return false; // Convenio
    if (!departmentId || !form.city_id) return false; // Ciudad
    if (!form.email || !form.company) return false; // Email y Empresa son obligatorios temporalmente en vista

    return true;
  }, [form, isView, departmentId, idCardError]);

  const submit = async () => {
    if (!onSubmit) return;

    const okId = await validateIdCard(form.id_card);
    if (!okId) {
      await alert.warn(
        "Identificación inválida",
        "Revisa el documento antes de guardar.",
      );
      return;
    }

    if (!canSubmit) {
      await alert.warn(
        "Faltan datos",
        "Revisa los campos obligatorios y asegúrate de que el celular tenga 10 dígitos elegidos.",
      );
      return;
    }

    // Prepare payload
    const payload: any = {
      ...form, // manda todo
      id_card: onlyDigits(form.id_card),
      movil: onlyDigits(form.movil),
      bithdate: form.bithdate || null,
      // Validaciones extras si hacen falta
      contract_code: form.contract_code || "",
      value_sale: form.value_sale || 0,
      balance: form.balance || 0,
      comission: form.comission || 0,
      city_id: Number(form.city_id),
      user_id: Number(form.user_id),
      counselor_id: Number(form.counselor_id),
      agreement_id: Number(form.agreement_id),
      // En creación siempre activo; en edición no se toca (el backend preserva el valor actual)
      ...(isCreate && { stade: 1 }),
    };

    if (isEdit && wantsRenovation === "si") {
       payload.renovation = {
          date_ini: renovationDateIni,
          date_end: addOneYear(renovationDateIni),
          date_payment: getTodayString(),
          value: Number(renovationValue) || 0
       };
    }

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
      bithdate: "",
      phone: "",
      movil: "",
      email: "",
      city_id: "",
      user_id: "",
      agreement_id: "",
      counselor_id: "",
      validity: defaultToday,
      validity_end: addOneYear(defaultToday),
      sale_date: defaultToday,
      balance: 0,
      value_sale: 0,
      comission: 0,
      payment_commission: "no",
      company: "",
      carnet: "no",
      state: 1,
      stade: 1,
      contract_code: "",
      beneficiaries: [{ name: "" }],
    });

    setDepartmentId("");
    setCities([]);
    setSearchCounselor("");
    setIdCardError(null);
    lastCheckedRef.current = "";
  };

  return (
    <div className="bg-background rounded-2xl border border-stroke p-5 shadow-sm dark:border-dark-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Documento */}
        <div>
          <Label required={!isView}>Documento de Identidad</Label>
          <input
            value={form.id_card}
            disabled={isView}
            onChange={(e) =>
              setForm({ ...form, id_card: onlyDigits(e.target.value) })
            }
            onBlur={() => {
              if (!isView) validateIdCard(form.id_card);
            }}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
            placeholder="Solo números"
          />
          {checkingIdCard ? (
            <p className="text-muted-foreground mt-1 text-xs">Validando...</p>
          ) : null}
          {idCardError ? (
            <p className="mt-1 text-xs text-red-600">{idCardError}</p>
          ) : null}
        </div>

        {/* Nombres y Apellidos */}
        <div>
          <Label required={!isView}>Nombre(s)</Label>
          <input
            value={form.name}
            disabled={isView}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>
        <div>
          <Label required={!isView}>Apellido(s)</Label>
          <input
            value={form.lastname}
            disabled={isView}
            onChange={(e) => setForm({ ...form, lastname: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        {/* Fecha de Nacimiento */}
        <div>
          <Label>Fecha de Nacimiento</Label>
          <input
            type="date"
            value={form.bithdate}
            disabled={isView}
            onChange={(e) => setForm({ ...form, bithdate: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        {/* Telefonos */}
        <div>
          <Label>Teléfono</Label>
          <input
            value={form.phone}
            disabled={isView}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value.replace(/[^0-9,\- ]/g, "") })
            }
            inputMode="text"
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        <div>
          <Label required={!isView}>Celular (10 dígitos)</Label>
          <input
            value={form.movil}
            disabled={isView}
            onChange={(e) =>
              setForm({
                ...form,
                movil: onlyDigits(e.target.value).slice(0, 10),
              })
            }
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
          {form.movil.length > 0 && form.movil.length < 10 && !isView && (
            <p className="mt-1 text-xs text-red-500">
              El celular debe tener 10 dígitos.
            </p>
          )}
        </div>

        {/* Email e info */}
        <div>
          <Label required={!isView}>Email</Label>
          <input
            type="email"
            value={form.email}
            disabled={isView}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        <div>
          <Label required={!isView}>Dirección</Label>
          <input
            value={form.address}
            disabled={isView}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        {/* Departamento y Ciudad */}
        <div>
          <Label required={!isView}>Departamento</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
            value={departmentId}
            onChange={(v) => setDepartmentId(v ? Number(v) : "")}
          />
        </div>

        <div>
          <Label required={!isView}>Ciudad</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView || !departmentId}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            value={form.city_id}
            onChange={(v) => setForm({ ...form, city_id: v })}
            placeholder={departmentId ? "Seleccionar…" : "Selecciona un departamento"}
          />
        </div>

        {/* Franquicia & Empresa & Convenio */}
        <div>
          <Label required={!isView}>Franquicia</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={franchises.map((f) => ({ value: f.id, label: f.name }))}
            value={form.user_id}
            onChange={(v) => setForm({ ...form, user_id: v })}
            placeholder="Seleccionar Franquicia…"
          />
        </div>

        <div>
          <Label required={!isView}>Convenio</Label>
          <SearchableSelect
            className="mt-1"
            disabled={isView}
            options={agreements.map((a) => ({ value: a.id, label: a.name }))}
            value={form.agreement_id}
            onChange={(v) => setForm({ ...form, agreement_id: v })}
            placeholder="Seleccionar Convenio…"
          />
        </div>

        <div>
          <Label required={!isView}>Empresa</Label>
          <input
            value={form.company}
            disabled={isView}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        <div className="relative">
          <Label required={!isView}>Asesor</Label>
          <input
            type="text"
            value={searchCounselor}
            onChange={(e) => {
              setSearchCounselor(e.target.value);
              setForm({ ...form, counselor_id: "" }); // reseteamos si cambia el input para forzar que seleccione uno
              if (!isView) setShowCounselors(true);
            }}
            disabled={isView}
            onFocus={() => {
              if (!isView) setShowCounselors(true);
            }}
            onBlur={() => setTimeout(() => setShowCounselors(false), 200)}
            placeholder="Buscar asesor..."
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
          {showCounselors && filteredCounselors.length > 0 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg dark:bg-dark-2">
              {filteredCounselors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-3"
                  onClick={() => {
                    setForm({ ...form, counselor_id: String(c.id) });
                    setSearchCounselor(`${c.name} ${c.lastname}`);
                    setShowCounselors(false);
                  }}
                >
                  {c.name} {c.lastname}
                </button>
              ))}
            </div>
          )}
          {!form.counselor_id &&
            searchCounselor &&
            !showCounselors &&
            !isView && (
              <p className="mt-1 text-xs text-red-500">
                Debes seleccionar un asesor de la lista
              </p>
            )}
        </div>

        {/* Fechas de Vigencia Combinadas */}
        <div className="md:col-span-2 lg:col-span-2">
          {isEdit || isView ? (
             <div className="mt-2">
               <Label>Vigencia:</Label>
               <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  Desde {form.validity} Hasta {form.validity_end}
               </div>

               {isEdit && (
                 <div className="mt-4">
                   <div className="flex items-center gap-4 mb-2">
                     <Label>Renovar:</Label>
                     <label className="flex items-center gap-1 text-sm cursor-pointer">
                       <input type="radio" value="si" checked={wantsRenovation === "si"} onChange={(e) => setWantsRenovation(e.target.value)} /> Sí
                     </label>
                     <label className="flex items-center gap-1 text-sm cursor-pointer">
                       <input type="radio" value="no" checked={wantsRenovation === "no"} onChange={(e) => setWantsRenovation(e.target.value)} /> No
                     </label>
                   </div>
                   
                   {wantsRenovation === "si" && (
                     <div className="mt-2 text-sm">
                        <Label>Renovación:</Label>
                        <div className="mt-2 ml-4 flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                             <span className="text-sm font-medium">Inicio:</span>
                             <label className="flex items-center gap-1 cursor-pointer">
                               <input type="radio" value="vencimiento" checked={renovationType === "vencimiento"} onChange={(e) => setRenovationType(e.target.value)} /> Fecha de vencimiento
                             </label>
                             <label className="flex items-center gap-1 cursor-pointer">
                               <input type="radio" value="hoy" checked={renovationType === "hoy"} onChange={(e) => setRenovationType(e.target.value)} /> Hoy
                             </label>
                          </div>

                          <div className="flex items-center gap-2">
                             <input type="date" value={renovationDateIni} onChange={(e) => setRenovationDateIni(e.target.value)} className="rounded border px-2 py-1 text-sm dark:bg-dark-3 dark:border-dark-4 w-[160px]"/>
                             <span>-</span>
                             <input type="date" value={addOneYear(renovationDateIni)} disabled className="rounded border px-2 py-1 text-sm cursor-not-allowed text-gray-600 dark:bg-dark-3 dark:border-dark-4 max-w-[160px]"/>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-sm w-[40px] font-medium">Valor:</span>
                             <input type="text" value={Number(renovationValue).toLocaleString("es-CO")} readOnly className="rounded border px-2 py-1 text-sm cursor-not-allowed text-gray-600 dark:bg-dark-3 dark:border-dark-4 w-[160px]"/>
                          </div>
                        </div>
                     </div>
                   )}
                 </div>
               )}
             </div>
          ) : (
            <>
              <Label required={true}>Vigencia</Label>
              <div className="mt-1 flex w-full flex-col items-start gap-3 rounded-lg border bg-gray-50 px-3 py-2 sm:flex-row sm:items-center dark:bg-dark-3">
                <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Inicial:</span>
                <input
                  type="date"
                  value={form.validity}
                  onChange={(e) => {
                    const start = e.target.value;
                    setForm({
                      ...form,
                      validity: start,
                      validity_end: addOneYear(start),
                    });
                  }}
                  className="rounded-md border bg-white px-2 py-1 text-sm dark:border-dark-4 dark:bg-dark-2"
                />

                <span className="hidden sm:inline text-gray-400">-</span>

                <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Final:</span>
                <input
                  type="date"
                  value={form.validity_end}
                  disabled={true}
                  readOnly
                  className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-800 cursor-not-allowed dark:text-gray-200"
                />
              </div>
            </>
          )}
        </div>

        <div>
          <Label required={!isView}>Fecha Venta</Label>
          <input
            type="date"
            value={form.sale_date}
            disabled={isView}
            onChange={(e) => setForm({ ...form, sale_date: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        {/* Saldos y Comisiones */}
        <div>
          <Label>Saldo</Label>
          <input
            type="number"
            value={form.balance}
            disabled={isView}
            onChange={(e) =>
              setForm({ ...form, balance: Number(e.target.value) })
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        <div>
          <Label>Comisión</Label>
          <input
            type="number"
            value={form.comission}
            disabled={isView}
            onChange={(e) =>
              setForm({ ...form, comission: Number(e.target.value) })
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        <div className="mt-[10px] flex flex-col justify-center">
          <Label>¿Pago de Comisión?</Label>
          <div className="mt-2 flex gap-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="payment_commission"
                value="si"
                disabled={isView}
                checked={form.payment_commission === "si"}
                onChange={() => setForm({ ...form, payment_commission: "si" })}
              />
              Sí
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="payment_commission"
                value="no"
                disabled={isView}
                checked={form.payment_commission === "no"}
                onChange={() => setForm({ ...form, payment_commission: "no" })}
              />
              No
            </label>
          </div>
        </div>

        {/* Carnet Entregado (Solo Editable/Visible en Modo Edición) */}
        {isEdit && (
          <div className="mt-[10px] flex flex-col justify-center">
            <Label>¿Carnet Entregado?</Label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="carnet_assigned"
                  value="si"
                  checked={form.carnet === "si"}
                  onChange={() => setForm({ ...form, carnet: "si" })}
                />
                Sí
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="carnet_assigned"
                  value="no"
                  checked={form.carnet === "no"}
                  onChange={() => setForm({ ...form, carnet: "no" })}
                />
                No
              </label>
            </div>
          </div>
        )}
      </div>

      {/* BENENFICIARIOS SECCION */}
      <div className="mt-8 border-t border-stroke pt-6 dark:border-dark-3">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Beneficiarios
          </h3>
          {!isView && form.beneficiaries.length < 7 && (
            <Button
              type="button"
              onClick={addBeneficiary}
              className="inline-flex items-center gap-2 rounded bg-blue-50 px-3 py-1.5 text-blue-600 drop-shadow-sm transition hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" /> Añadir beneficiario
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {form.beneficiaries.map((b, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 rounded border border-gray-200 p-3 dark:border-dark-3"
            >
              <Label>Nombre Beneficiario {index + 1}</Label>
              <div className="flex items-center gap-2">
                <input
                  value={b.name}
                  disabled={isView}
                  onChange={(e) => updateBeneficiaryName(index, e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
                />
                {!isView && form.beneficiaries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBeneficiary(index)}
                    className="rounded p-2 text-red-500 transition hover:bg-red-50"
                    title="Eliminar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {!isView && form.beneficiaries.length >= 7 && (
          <p className="mt-2 text-xs text-orange-500">
            Haz alcanzado el límite máximo de 7 beneficiarios.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
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
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
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
