"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, User, Users } from "lucide-react";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import { Button } from "@/components/ui-elements/button";
import {
  getActiveSpecialties,
  getDoctorsBySpecialty,
  type ApiAppointment,
  type SpecialtyOption,
  type DoctorForAppointment,
  type CreateAppointmentPayload,
} from "../fetch";

type Props = {
  initial: ApiAppointment;
  onSubmit: (payload: CreateAppointmentPayload) => Promise<void>;
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

export default function AppointmentEditForm({ initial, onSubmit }: Props) {
  // ── Especialidad + Médico ────────────────────────────────────────────────
  const [specialties, setSpecialties] = useState<SpecialtyOption[]>([]);
  const [specialtyId, setSpecialtyId] = useState(
    String(initial.doctor?.specialty_id ?? ""),
  );
  const [doctors, setDoctors] = useState<DoctorForAppointment[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorForAppointment | null>(null);

  const initialDoctorId = useRef(initial.doctor_id);

  // ── Campos del formulario ────────────────────────────────────────────────
  const [form, setForm] = useState({
    date:    initial.date,
    hour:    initial.hour,
    address: initial.address,
    city_id: String(initial.city_id),
    phone:   initial.phone ?? "",
    value:   String(initial.value),
  });

  const [saving, setSaving] = useState(false);

  // Cargar especialidades al montar
  useEffect(() => {
    getActiveSpecialties().then(setSpecialties).catch(console.error);
  }, []);

  // Cargar médicos al cambiar especialidad
  useEffect(() => {
    if (!specialtyId) {
      setDoctors([]);
      setSelectedDoctor(null);
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    getDoctorsBySpecialty(Number(specialtyId))
      .then((list) => {
        if (cancelled) return;
        setDoctors(list);
        // Auto-seleccionar el médico inicial la primera vez que cargan
        if (initialDoctorId.current) {
          const doc = list.find((d) => d.id === initialDoctorId.current);
          if (doc) {
            setSelectedDoctor(doc);
            initialDoctorId.current = 0;
          }
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setDoctorsLoading(false); });
    return () => { cancelled = true; };
  }, [specialtyId]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectDoctor = (doctor: DoctorForAppointment) => {
    setSelectedDoctor(doctor);
    setForm((p) => ({
      ...p,
      address: doctor.address,
      city_id: String(doctor.city_id),
      value:   String(doctor.value_agreement),
    }));
  };

  // ── Validaciones ─────────────────────────────────────────────────────────

  const valueError = useMemo(() => {
    if (!form.value) return null;
    return Number(form.value) < 10000 ? "El valor debe ser mayor o igual a $10.000" : null;
  }, [form.value]);

  const canSubmit = useMemo(() => {
    if (!selectedDoctor) return false;
    if (!form.date || !form.hour) return false;
    if (!form.address || !form.city_id) return false;
    if (!form.value || Number(form.value) < 10000) return false;
    return true;
  }, [selectedDoctor, form]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit || !selectedDoctor) return;
    const payload: CreateAppointmentPayload = {
      afi_code:  initial.afi_code,
      type:      initial.type,
      name:      initial.name,
      doctor_id: selectedDoctor.id,
      date:      form.date,
      hour:      form.hour,
      address:   form.address,
      city_id:   Number(form.city_id),
      phone:     form.phone,
      value:     Number(form.value),
      user_id:   initial.user_id,
    };
    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const cityName = selectedDoctor?.city?.name ?? initial.city?.name ?? "—";

  return (
    <div className="space-y-6">

      {/* ── Sección 1: Paciente (solo lectura) ───────────────────────────── */}
      <div className="rounded-2xl border border-stroke bg-background p-5 shadow-sm dark:border-dark-3">
        <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
          1. Paciente
        </h3>
        <div className="flex items-center gap-3 rounded-xl border border-stroke bg-gray-2 px-4 py-3 dark:border-dark-3 dark:bg-dark-3">
          <span className="text-dark-5 dark:text-dark-6">
            {initial.type === 1 ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-medium text-dark dark:text-white">{initial.name}</p>
            <p className="text-xs text-dark-5 dark:text-dark-6">
              {initial.type === 1 ? "Titular" : "Beneficiario"}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs text-dark-5 dark:text-dark-6">
          Para cambiar el paciente, elimina esta cita y crea una nueva.
        </p>
      </div>

      {/* ── Sección 2: Especialidad y médico ─────────────────────────────── */}
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

      {/* ── Sección 3: Detalles de la cita ───────────────────────────────── */}
      <div className="rounded-2xl border border-stroke bg-background p-5 shadow-sm dark:border-dark-3">
        <h3 className="mb-4 text-base font-semibold text-dark dark:text-white">
          3. Detalles de la Cita
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label required>Fecha</Label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div>
            <Label required>Hora</Label>
            <input
              type="time"
              value={form.hour}
              onChange={(e) => setForm((p) => ({ ...p, hour: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <Label required>Dirección de la consulta</Label>
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              placeholder="Dirección del consultorio"
            />
          </div>

          <div>
            <Label>Ciudad</Label>
            <div className="mt-1 flex h-[38px] items-center rounded-lg border border-stroke bg-gray-2 px-3 text-sm text-dark dark:border-dark-3 dark:bg-dark-3 dark:text-white">
              {cityName}
            </div>
          </div>

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

          <div>
            <Label>Teléfono del paciente</Label>
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
              placeholder="Ej: 3001234567"
            />
          </div>
        </div>
      </div>

      {/* ── Acciones ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
}

