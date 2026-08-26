"use client";

import { useEffect, useMemo, useState } from "react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { Search, Save, Eraser, CheckCircle2, User, Users } from "lucide-react";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import { Button } from "@/components/ui-elements/button";
import {
  searchAffiliateByIdCard,
  getActiveSpecialties,
  getDoctorsBySpecialty,
  type AffiliateForAppointment,
  type SpecialtyOption,
  type DoctorForAppointment,
  type CreateAppointmentPayload,
} from "../fetch";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type Props = {
  onSubmit: (payload: CreateAppointmentPayload) => Promise<void>;
  userId: number;
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-dark dark:text-white">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

type PatientSelection = {
  afiCode: number;
  type: 1 | 2;
  name: string;
};

export default function AppointmentForm({ onSubmit, userId }: Props) {
  // ── Affiliate search ─────────────────────────────────────────────────
  const [idCardInput, setIdCardInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [affiliate, setAffiliate] = useState<AffiliateForAppointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<PatientSelection | null>(null);

  // ── Specialty + Doctor ────────────────────────────────────────────────
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [doctors, setDoctors] = useState<DoctorForAppointment[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorForAppointment | null>(null);

  // ── Form fields ────────────────────────────────────────────────
  const [form, setForm] = useState({
    date: "",
    hour: "",
    address: "",
    city_id: "",
    phone: "",
    value: "",
  });

  const [saving, setSaving] = useState(false);

  // Load specialties on mount
  useEffect(() => {
    getActiveSpecialties().then(setSpecialties).catch(console.error);
  }, []);

  // Load doctors when specialty changes
  useEffect(() => {
    if (!specialtyId) {
      setDoctors([]);
      setSelectedDoctor(null);
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    getDoctorsBySpecialty(Number(specialtyId))
      .then((list) => { if (!cancelled) setDoctors(list); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    return () => { cancelled = true; };
  }, [specialtyId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const trimmed = idCardInput.trim();
    if (!trimmed) return;
    setSearchLoading(true);
    setSearchError(null);
    setAffiliate(null);
    setSelectedPatient(null);
    resetFromPatient();
    try {
      const found = await searchAffiliateByIdCard(trimmed);
      setAffiliate(found);
    } catch (err) {
      setSearchError(getApiErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  };

  const resetFromPatient = () => {
    setSpecialtyId("");
    setDoctors([]);
    setSelectedDoctor(null);
    setForm({ date: "", hour: "", address: "", city_id: "", phone: "", value: "" });
  };

  const handleSelectPatient = (patient: PatientSelection) => {
    setSelectedPatient(patient);
    setForm((p) => ({
      ...p,
      phone: onlyDigits(affiliate?.movil ?? affiliate?.phone ?? "").slice(0, 10),
    }));
    resetFromSpecialty();
  };

  const resetFromSpecialty = () => {
    setSpecialtyId("");
    setDoctors([]);
    setSelectedDoctor(null);
    setForm((p) => ({ ...p, address: "", city_id: "", value: "" }));
  };

  const handleSelectDoctor = (doctor: DoctorForAppointment) => {
    setSelectedDoctor(doctor);
    setForm((p) => ({
      ...p,
      address: doctor.address,
      city_id: String(doctor.city_id),
      value: String(doctor.value_agreement),
    }));
  };

  // ── Validations ─────────────────────────────────────────────────────────

  const valueError = useMemo(() => {
    if (!form.value) return null;
    return Number(form.value) < 10000 ? "El valor debe ser mayor o igual a $10.000" : null;
  }, [form.value]);

  const phoneError = useMemo(() => {
    if (!form.phone) return null;
    return form.phone.length !== 10 ? "El teléfono debe tener exactamente 10 dígitos" : null;
  }, [form.phone]);

  const canSubmit = useMemo(() => {
    if (!selectedPatient || !selectedDoctor) return false;
    if (!form.date || !form.hour) return false;
    if (!form.address || !form.city_id) return false;
    if (!form.value || Number(form.value) < 10000) return false;
    if (phoneError) return false;
    return true;
  }, [selectedPatient, selectedDoctor, form, phoneError]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPatient || !selectedDoctor) return;
    const payload: CreateAppointmentPayload = {
      afi_code:  selectedPatient.afiCode,
      type:      selectedPatient.type,
      name:      selectedPatient.name,
      doctor_id: selectedDoctor.id,
      date:      form.date,
      hour:      form.hour,
      address:   form.address,
      city_id:   Number(form.city_id),
      phone:     form.phone,
      value:     Number(form.value),
      user_id:   userId,
    };
    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setIdCardInput("");
    setSearchError(null);
    setAffiliate(null);
    setSelectedPatient(null);
    resetFromPatient();
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Section 1: Search affiliate ───────────────────────────────────── */}
      <div className="rounded-2xl border border-stroke bg-background p-5 shadow-sm dark:border-dark-3">
        <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">
          1. Buscar Afiliado
        </h3>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label required>Número de documento del titular</Label>
            <input
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              placeholder="Ej: 1234567890"
              value={idCardInput}
              inputMode="numeric"
              onChange={(e) => setIdCardInput(onlyDigits(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={searchLoading}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleSearch}
              disabled={!idCardInput.trim() || searchLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {searchLoading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </div>

        {/* Search error */}
        {searchError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {searchError}
          </div>
        )}

        {/* Result: policyholder + beneficiaries */}
        {affiliate && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-dark-5 dark:text-dark-6">
              Selecciona quién va a la cita
            </p>

            {/* Policyholder */}
            <PatientCard
              icon={<User className="h-4 w-4" />}
              label="Titular"
              name={`${affiliate.name} ${affiliate.lastname}`}
              idCard={affiliate.id_card}
              selected={selectedPatient?.afiCode === affiliate.id && selectedPatient?.type === 1}
              onClick={() =>
                handleSelectPatient({
                  afiCode: affiliate.id,
                  type: 1,
                  name: `${affiliate.name} ${affiliate.lastname}`,
                })
              }
            />

            {/* Beneficiaries */}
            {affiliate.beneficiaries && affiliate.beneficiaries.length > 0 && (
              <>
                <p className="text-xs text-dark-5 dark:text-dark-6">Beneficiarios:</p>
                {affiliate.beneficiaries.map((b) => (
                  <PatientCard
                    key={b.id}
                    icon={<Users className="h-4 w-4" />}
                    label="Beneficiario"
                    name={b.name}
                    idCard={b.id_card ?? undefined}
                    selected={selectedPatient?.afiCode === b.id && selectedPatient?.type === 2}
                    onClick={() =>
                      handleSelectPatient({ afiCode: b.id, type: 2, name: b.name })
                    }
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Specialty and doctor ─────────────────────────────── */}
      {selectedPatient && (
        <div className="rounded-2xl border border-stroke bg-background p-5 shadow-sm dark:border-dark-3">
          <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">
            2. Especialidad y Médico
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label required>Especialidad</Label>
              <SearchableSelect
                className="mt-1"
                options={specialties.map((s) => ({ value: s.id, label: s.name }))}
                value={specialtyId}
                onChange={(v) => {
                  setSpecialtyId(v);
                  setSelectedDoctor(null);
                  setForm((p) => ({ ...p, address: "", city_id: "", value: "" }));
                }}
                placeholder="Buscar especialidad..."
              />
            </div>

            <div>
              <Label required>Médico</Label>
              <SearchableSelect
                className="mt-1"
                disabled={!specialtyId || doctorsLoading}
                options={doctors.map((d) => ({
                  value: d.id,
                  label: `${d.name} ${d.lastname}`,
                }))}
                value={selectedDoctor ? String(selectedDoctor.id) : ""}
                onChange={(v) => {
                  const doc = doctors.find((d) => String(d.id) === v);
                  if (doc) handleSelectDoctor(doc);
                }}
                placeholder={
                  !specialtyId
                    ? "Selecciona una especialidad primero"
                    : doctorsLoading
                    ? "Cargando médicos..."
                    : "Buscar médico..."
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Section 3: Appointment details ───────────────────────────────── */}
      {selectedDoctor && (
        <div className="rounded-2xl border border-stroke bg-background p-5 shadow-sm dark:border-dark-3">
          <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">
            3. Detalles de la Cita
          </h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Date */}
            <div>
              <Label required>Fecha</Label>
              <div className="mt-1">
                <DatePickerWithToday
                  value={form.date}
                  onChange={(date) => setForm((p) => ({ ...p, date }))}
                />
              </div>
            </div>

            {/* Time */}
            <div>
              <Label required>Hora</Label>
              <input
                type="time"
                value={form.hour}
                onChange={(e) => setForm((p) => ({ ...p, hour: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <Label required>Dirección de la consulta</Label>
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                placeholder="Dirección del consultorio"
              />
            </div>

            {/* City (read-only — comes from the doctor) */}
            <div>
              <Label>Ciudad</Label>
              <div className="mt-1 flex h-[38px] items-center rounded-lg border border-stroke bg-gray-2 px-3 text-sm text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
                {selectedDoctor.city?.name ?? "—"}
              </div>
            </div>

            {/* Value */}
            <div>
              <Label required>Valor de la consulta</Label>
              <input
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: onlyDigits(e.target.value) }))}
                inputMode="numeric"
                placeholder="Ej: 50000"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-dark-2 dark:text-white ${
                  valueError
                    ? "border-red-500 focus:outline-red-500"
                    : "border-stroke dark:border-dark-3"
                }`}
              />
              {valueError && <p className="mt-1 text-xs text-red-500">{valueError}</p>}
            </div>

            {/* Phone */}
            <div>
              <Label>Teléfono del paciente</Label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: onlyDigits(e.target.value).slice(0, 10) }))
                }
                inputMode="numeric"
                maxLength={10}
                placeholder="Ej: 3001234567"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-dark-2 dark:text-white ${
                  phoneError
                    ? "border-red-500 focus:outline-red-500"
                    : "border-stroke dark:border-dark-3"
                }`}
              />
              {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          onClick={handleClear}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
        >
          <Eraser className="h-4 w-4" />
          Limpiar
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Cita"}
        </Button>
      </div>
    </div>
  );
}

// ─── Helper component: selectable patient card ───────────────────

function PatientCard({
  icon,
  label,
  name,
  idCard,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  name: string;
  idCard?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : "border-stroke hover:border-gray-400 dark:border-dark-3 dark:hover:border-dark-4"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={selected ? "text-primary" : "text-dark-5 dark:text-dark-6"}>
            {icon}
          </span>
          <div>
            <p className="text-sm font-medium text-dark dark:text-white">{name}</p>
            <p className="text-xs text-dark-5 dark:text-dark-6">
              {label}{idCard ? ` · CC ${idCard}` : ""}
            </p>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
    </button>
  );
}
