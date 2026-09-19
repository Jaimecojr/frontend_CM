"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Eraser, Plus, Trash2 } from "lucide-react";
import { UppercaseInput } from "@/components/FormElements/UppercaseInput";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { MoneyInput } from "@/components/FormElements/MoneyInput";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import { Button } from "@/components/ui-elements/button";
import { addOneYear } from "@/lib/dates";
import type { ApiAffiliate, CounselorOption } from "../fetch";
import {
  useAffiliateFormState,
  onlyDigits,
  type AffiliateFormMode,
  type AffiliateSubmitPayload,
} from "../_hooks/useAffiliateFormState";

type Props = {
  mode: AffiliateFormMode;
  initial?: Partial<ApiAffiliate>;
  onSubmit?: (payload: AffiliateSubmitPayload) => Promise<void>;
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

export default function AffiliateForm({ mode, initial, onSubmit }: Props) {
  const {
    isView,
    isEdit,
    departments,
    cities,
    departmentId,
    setDepartmentId,
    franchises,
    agreements,
    saving,
    idCardError,
    checkingIdCard,
    searchCounselor,
    setSearchCounselor,
    showCounselors,
    setShowCounselors,
    wantsRenovation,
    setWantsRenovation,
    renovationType,
    setRenovationType,
    renovationDateIni,
    setRenovationDateIni,
    renovationValue,
    renovationDatePayment,
    setRenovationDatePayment,
    form,
    setForm,
    validateIdCard,
    addBeneficiary,
    removeBeneficiary,
    updateBeneficiaryName,
    filteredCounselors,
    canSubmit,
    submit,
    clear,
  } = useAffiliateFormState({ mode, initial, onSubmit });

  // Highlighted suggestion of the counselor autocomplete (-1 = none). Purely visual/keyboard
  // state, so it lives here rather than in the form-state hook.
  const [activeCounselorIndex, setActiveCounselorIndex] = useState(-1);
  const counselorListRef = useRef<HTMLDivElement>(null);

  // Keeps the highlighted suggestion visible inside the scrollable list
  useEffect(() => {
    if (showCounselors && activeCounselorIndex >= 0) {
      counselorListRef.current?.children[activeCounselorIndex]?.scrollIntoView?.({
        block: "nearest",
      });
    }
  }, [showCounselors, activeCounselorIndex]);

  const selectCounselor = (c: CounselorOption) => {
    setForm({ ...form, counselor_id: String(c.id) });
    setSearchCounselor(`${c.name} ${c.lastname}`);
    setShowCounselors(false);
    setActiveCounselorIndex(-1);
  };

  const handleCounselorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setShowCounselors(false);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); // keeps the caret from jumping to the start/end of the text
      // A closed list (e.g. after Escape or a selection) reopens instead of moving the highlight
      if (!showCounselors) {
        setActiveCounselorIndex(-1);
        setShowCounselors(true);
        return;
      }
      const count = filteredCounselors.length;
      if (count === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveCounselorIndex((i) =>
        i < 0 ? (step > 0 ? 0 : count - 1) : (i + step + count) % count,
      );
      return;
    }
    if (e.key === "Enter" && showCounselors) {
      e.preventDefault(); // avoid submitting a surrounding form while picking a suggestion
      // Only an explicitly highlighted suggestion is picked, never one chosen by default
      const target = filteredCounselors[activeCounselorIndex];
      if (target) selectCounselor(target);
    }
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
          <UppercaseInput
            value={form.name}
            disabled={isView}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>
        <div>
          <Label required={!isView}>Apellido(s)</Label>
          <UppercaseInput
            value={form.lastname}
            disabled={isView}
            onChange={(e) => setForm({ ...form, lastname: e.target.value })}
            className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
        </div>

        {/* Fecha de Nacimiento */}
        <div>
          <Label>Fecha de Nacimiento</Label>
          <div className="mt-1">
            <DatePickerWithToday
              value={form.bithdate}
              disabled={isView}
              onChange={(date) => setForm({ ...form, bithdate: date })}
            />
          </div>
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
          <UppercaseInput
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
          <UppercaseInput
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
              // Highlight the first match so Enter picks it; nothing highlighted for an empty search
              setActiveCounselorIndex(e.target.value.trim() ? 0 : -1);
              if (!isView) setShowCounselors(true);
            }}
            disabled={isView}
            onFocus={() => {
              if (isView) return;
              setActiveCounselorIndex(-1);
              setShowCounselors(true);
            }}
            onKeyDown={handleCounselorKeyDown}
            onBlur={() => setTimeout(() => setShowCounselors(false), 200)}
            placeholder="Buscar asesor..."
            className="mt-1 w-full rounded-lg border px-3 py-2 uppercase disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
          />
          {showCounselors && filteredCounselors.length > 0 && (
            <div
              ref={counselorListRef}
              className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white shadow-lg dark:bg-dark-2"
            >
              {filteredCounselors.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  // keyboard users pick with Enter from the input; a tabbable option would steal
                  // focus, blur the input and close the list before it could be used
                  tabIndex={-1}
                  // keeps the highlight in sync with the pointer so Enter picks what is visibly marked
                  onMouseMove={() => setActiveCounselorIndex(i)}
                  className={`w-full px-3 py-2 text-left text-sm uppercase hover:bg-gray-100 dark:hover:bg-dark-3 ${
                    i === activeCounselorIndex ? "bg-gray-100 dark:bg-dark-3" : ""
                  }`}
                  onClick={() => selectCounselor(c)}
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
        <div className={`md:col-span-2 ${isEdit ? "lg:col-span-3" : "lg:col-span-2"}`}>
          {isEdit || isView ? (
             <div className="mt-2">
               <Label>Vigencia</Label>
               <div className="mt-1 flex w-full flex-col items-start gap-3 rounded-lg border bg-gray-50 px-3 py-2 sm:flex-row sm:items-center dark:bg-dark-3">
                 <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Inicial:</span>
                 <input
                   type="date"
                   value={form.validity}
                   disabled
                   readOnly
                   className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-800 cursor-not-allowed dark:text-gray-200"
                 />
                 <span className="hidden sm:inline text-gray-400">-</span>
                 <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Final:</span>
                 <input
                   type="date"
                   value={form.validity_end}
                   disabled
                   readOnly
                   className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-800 cursor-not-allowed dark:text-gray-200"
                 />
               </div>

               {isEdit && (
                 <div className="mt-4">
                   <div className="flex items-center gap-4 mb-2">
                     <Label>Renovar:</Label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input type="radio" value="si" checked={wantsRenovation === "si"} onChange={(e) => setWantsRenovation(e.target.value)} /> Sí
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                       <input type="radio" value="no" checked={wantsRenovation === "no"} onChange={(e) => setWantsRenovation(e.target.value)} /> No
                     </label>
                   </div>

                   {wantsRenovation === "si" && (
                     <div className="mt-2">
                       <Label>Nueva vigencia</Label>
                       <div className="mt-1 flex w-full flex-col gap-3 rounded-lg border bg-gray-50 px-3 py-3 dark:bg-dark-3">
                         <div className="flex flex-wrap items-center gap-3">
                           <span className="text-sm italic text-gray-600 dark:text-gray-400">Inicio desde:</span>
                           <label className="flex items-center gap-2 text-sm cursor-pointer">
                             <input type="radio" value="vencimiento" checked={renovationType === "vencimiento"} onChange={(e) => setRenovationType(e.target.value)} />
                             Fecha de vencimiento
                           </label>
                           <label className="flex items-center gap-2 text-sm cursor-pointer">
                             <input type="radio" value="hoy" checked={renovationType === "hoy"} onChange={(e) => setRenovationType(e.target.value)} />
                             Hoy
                           </label>
                         </div>

                         <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center">
                           <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Inicial:</span>
                           <DatePickerWithToday
                             value={renovationDateIni}
                             onChange={setRenovationDateIni}
                             className="rounded-md border bg-white px-2 py-1 text-sm dark:border-dark-4 dark:bg-dark-2"
                           />
                           <span className="hidden sm:inline text-gray-400">-</span>
                           <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha Final:</span>
                           <input
                             type="date"
                             value={addOneYear(renovationDateIni)}
                             disabled
                             readOnly
                             className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-800 cursor-not-allowed dark:text-gray-200"
                           />
                         </div>

                         <div className="flex items-center gap-3">
                           <span className="text-sm italic text-gray-600 dark:text-gray-400">Valor:</span>
                           <input
                             type="text"
                             value={Number(renovationValue).toLocaleString("es-CO")}
                             readOnly
                             className="rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-gray-800 cursor-not-allowed dark:text-gray-200"
                           />
                         </div>

                         <div className="flex items-center gap-3">
                           <span className="text-sm italic text-gray-600 dark:text-gray-400">Fecha de Venta:</span>
                           <DatePickerWithToday
                             value={renovationDatePayment}
                             onChange={setRenovationDatePayment}
                             className="rounded-md border bg-white px-2 py-1 text-sm dark:border-dark-4 dark:bg-dark-2"
                           />
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
                <DatePickerWithToday
                  value={form.validity}
                  onChange={(date) =>
                    setForm({ ...form, validity: date, validity_end: addOneYear(date) })
                  }
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

        {/* Fecha de Venta: visible en creación/vista, oculta en edición (aparece en sección renovar) */}
        {!isEdit && (
          <div>
            <Label required={!isView}>Fecha de Venta</Label>
            <div className="mt-1">
              <DatePickerWithToday
                value={form.payment_date}
                disabled={isView}
                onChange={(date) => setForm({ ...form, payment_date: date })}
              />
            </div>
          </div>
        )}

        {/* Saldos y Comisiones */}
        <div>
          <Label>Saldo</Label>
          <MoneyInput
            value={form.balance}
            disabled={isView}
            onChange={(balance) => setForm({ ...form, balance })}
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

        {/*
          The amount only applies once the commission is marked as paid, so it comes after the
          "¿Pago de Comisión?" choice and is hidden otherwise. Hiding does not clear it: a stored
          value is kept as-is and is still sent on submit (the API requires `commission` on create).
        */}
        {form.payment_commission === "si" && (
          <div>
            <Label>Comisión</Label>
            <MoneyInput
              value={form.commission}
              disabled={isView}
              onChange={(commission) => setForm({ ...form, commission })}
              className="mt-1 w-full rounded-lg border px-3 py-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:dark:bg-dark-2"
            />
          </div>
        )}

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
                <UppercaseInput
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
