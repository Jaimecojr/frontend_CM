"use client";

import { useEffect, useRef, useState } from "react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import ReCAPTCHA from "react-google-recaptcha";
import type { Department, City } from "@/app/4dnn1n/counselors/fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
// La clave de prueba de Google siempre pasa validación en desarrollo
const RECAPTCHA_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

async function publicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function getDepartments(): Promise<Department[]> {
  const res = await publicFetch<{ data: Department[] }>("/api/public/departments");
  return res.data ?? [];
}

async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  const res = await publicFetch<{ data: City[] }>(
    `/api/public/departments/${departmentId}/cities`
  );
  return res.data ?? [];
}

interface BeneficiaryField {
  full_name: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

export default function AfiliacioPage() {
  /* ── Catálogos ── */
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  /* ── Campos del titular ── */
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [cedula, setCedula] = useState("");
  const [movil, setMovil] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [deptId, setDeptId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");

  /* ── Beneficiarios ── */
  const [beneficiaryCount, setBeneficiaryCount] = useState(0);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryField[]>([]);

  /* ── Otros ── */
  const [advisorName, setAdvisorName] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  /* ── Estado de envío ── */
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [responseMsg, setResponseMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const recaptchaRef = useRef<ReCAPTCHA>(null);

  /* ── Carga de catálogos ── */
  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  useEffect(() => {
    if (!deptId) {
      setCities([]);
      setCityId("");
      return;
    }
    getCitiesByDepartment(Number(deptId)).then(setCities).catch(console.error);
  }, [deptId]);

  /* ── Manejo de beneficiarios ── */
  const handleBeneficiaryCountChange = (count: number) => {
    setBeneficiaryCount(count);
    setBeneficiaries((prev) => {
      if (count > prev.length) {
        return [
          ...prev,
          ...Array.from({ length: count - prev.length }, () => ({ full_name: "" })),
        ];
      }
      return prev.slice(0, count);
    });
  };

  const updateBeneficiary = (index: number, field: keyof BeneficiaryField, value: string) => {
    setBeneficiaries((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );
  };

  /* ── Validación ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "El nombre es requerido.";
    if (!lastname.trim()) e.lastname = "Los apellidos son requeridos.";
    if (!/^\d+$/.test(cedula)) e.document = "La cédula debe contener solo números.";
    if (!/^\d{10}$/.test(movil)) e.movil = "El celular debe tener exactamente 10 dígitos.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Ingresa un correo válido.";
    if (!birthDate) e.birthDate = "La fecha de nacimiento es requerida.";
    if (!address.trim()) e.address = "La dirección es requerida.";
    if (!deptId) e.deptId = "Selecciona un departamento.";
    if (!cityId) e.cityId = "Selecciona una ciudad.";
    beneficiaries.forEach((b, i) => {
      if (!b.full_name.trim()) e[`ben_${i}`] = "El nombre del beneficiario es requerido.";
    });
    if (!captchaToken) e.captcha = "Por favor completa el reCAPTCHA.";
    if (!privacyAccepted) e.privacy = "Debes aceptar la Política de Privacidad.";
    if (!termsAccepted) e.terms = "Debes aceptar los Términos y Condiciones.";
    return e;
  };

  /* ── Envío ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      window.document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSubmitState("loading");
    try {
      const res = await fetch(`${API_URL}/api/public/affiliate-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          lastname,
          document: cedula,
          movil,
          email,
          birth_date: birthDate,
          address,
          department_id: deptId,
          city_id: cityId,
          beneficiaries,
          advisor_name: advisorName,
          recaptcha_token: captchaToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setSubmitState("success");
        setResponseMsg(data.message || "¡Tu solicitud fue enviada con éxito! Pronto te contactaremos.");
      } else {
        setSubmitState("error");
        setResponseMsg(data.message || "Ocurrió un error al enviar la solicitud. Intenta nuevamente.");
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
      }
    } catch {
      setSubmitState("error");
      setResponseMsg("No se pudo conectar con el servidor. Intenta más tarde.");
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  if (submitState === "success") {
    return (
      <main>
        <HeroSection />
        <section className="py-20 bg-[#f8f9ff]">
          <div className="max-w-[640px] mx-auto px-6 text-center">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12">
              <div className="w-16 h-16 bg-[#1DBFCE]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-symbols-outlined text-[#1DBFCE]" style={{ fontSize: "32px" }}>
                  check_circle
                </span>
              </div>
              <h2
                className="text-2xl font-bold text-[#1A1A2E] mb-3"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                ¡Solicitud Enviada!
              </h2>
              <p className="text-[#64748B] leading-relaxed">{responseMsg}</p>
              <button
                onClick={() => {
                  setSubmitState("idle");
                  setName(""); setLastname(""); setCedula(""); setMovil("");
                  setEmail(""); setBirthDate(""); setAddress(""); setDeptId("");
                  setCityId(""); setBeneficiaryCount(0); setBeneficiaries([]);
                  setAdvisorName(""); setPrivacyAccepted(false); setTermsAccepted(false);
                  setCaptchaToken(null);
                }}
                className="mt-8 px-8 py-3 bg-[#E8192C] text-white rounded-xl font-semibold text-sm hover:bg-[#c41422] transition-all"
              >
                Enviar otra solicitud
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <HeroSection />

      <section className="py-12 bg-[#f8f9ff]">
        <div className="max-w-[860px] mx-auto px-6 md:px-12">
          <form onSubmit={handleSubmit} noValidate>
            {/* ── Datos del titular ── */}
            <FormCard
              icon="person"
              title="Datos del Titular"
              description="Información personal del afiliado principal."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Nombre del titular" required error={errors.name}>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Carlos"
                    className={inputClass(errors.name)}
                  />
                </Field>

                <Field label="Apellidos del titular" required error={errors.lastname}>
                  <input
                    id="lastname"
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Ej. Gómez Pérez"
                    className={inputClass(errors.lastname)}
                  />
                </Field>

                <Field label="Cédula del titular" required error={errors.document} hint="Solo números">
                  <input
                    id="document"
                    type="text"
                    inputMode="numeric"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej. 1094000000"
                    className={inputClass(errors.document)}
                  />
                </Field>

                <Field label="Teléfono Celular" required error={errors.movil} hint="10 dígitos">
                  <input
                    id="movil"
                    type="text"
                    inputMode="numeric"
                    value={movil}
                    onChange={(e) => setMovil(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Ej. 3001234567"
                    className={inputClass(errors.movil)}
                  />
                </Field>

                <Field label="Correo electrónico" required error={errors.email}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field label="Fecha de nacimiento" required error={errors.birthDate}>
                  <DatePickerWithToday
                    value={birthDate}
                    onChange={setBirthDate}
                    className={inputClass(errors.birthDate)}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Dirección" required error={errors.address}>
                    <input
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ej. Calle 10 # 5-23, Barrio Centro"
                      className={inputClass(errors.address)}
                    />
                  </Field>
                </div>

                <Field label="Departamento" required error={errors.deptId}>
                  <select
                    id="deptId"
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value ? Number(e.target.value) : "")}
                    className={selectClass(errors.deptId)}
                  >
                    <option value="">Selecciona un departamento</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Ciudad" required error={errors.cityId}>
                  <select
                    id="cityId"
                    value={cityId}
                    onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : "")}
                    disabled={!deptId || cities.length === 0}
                    className={`${selectClass(errors.cityId)} disabled:opacity-40`}
                  >
                    <option value="">
                      {!deptId ? "Primero selecciona un departamento" : "Selecciona una ciudad"}
                    </option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </FormCard>

            {/* ── Beneficiarios ── */}
            <FormCard
              icon="group_add"
              title="Beneficiarios"
              description="Personas que se beneficiarán del plan médico junto al titular."
            >
              <Field label="Cantidad de beneficiarios" error={undefined}>
                <select
                  value={beneficiaryCount}
                  onChange={(e) => handleBeneficiaryCountChange(Number(e.target.value))}
                  className={selectClass(undefined)}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "Sin beneficiarios" : `${n} beneficiario${n > 1 ? "s" : ""}`}
                    </option>
                  ))}
                </select>
              </Field>

              {beneficiaries.length > 0 && (
                <div className="mt-5 space-y-4">
                  {beneficiaries.map((b, i) => (
                    <div key={i} className="bg-[#f8f9ff] border border-slate-100 rounded-xl p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#1DBFCE] mb-3">
                        Beneficiario {i + 1}
                      </p>
                      <Field
                        label="Nombres y Apellidos del Beneficiario"
                        required
                        error={errors[`ben_${i}`]}
                      >
                        <input
                          id={`ben_${i}`}
                          type="text"
                          value={b.full_name}
                          onChange={(e) => updateBeneficiary(i, "full_name", e.target.value)}
                          placeholder="Ej. María Fernanda López"
                          className={inputClass(errors[`ben_${i}`])}
                        />
                      </Field>
                    </div>
                  ))}
                </div>
              )}
            </FormCard>

            {/* ── Asesor + reCAPTCHA + checkboxes ── */}
            <FormCard
              icon="verified_user"
              title="Información Adicional"
              description="Datos del asesor que te acompañó y verificación de seguridad."
            >
              <div className="space-y-5">
                <Field label="Nombre del asesor" error={undefined} hint="Opcional">
                  <input
                    type="text"
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="Nombre del asesor que te asesoró"
                    className={inputClass(undefined)}
                  />
                </Field>

                {/* reCAPTCHA */}
                <div>
                  <p className="block text-sm font-medium text-[#64748B] mb-2">Verificación de seguridad</p>
                  <ReCAPTCHA
                    ref={recaptchaRef}
                    sitekey={RECAPTCHA_KEY}
                    onChange={(token) => setCaptchaToken(token)}
                    onExpired={() => setCaptchaToken(null)}
                  />
                  {errors.captcha && (
                    <p className="text-xs text-[#E8192C] mt-1.5">{errors.captcha}</p>
                  )}
                </div>

                {/* Política de privacidad */}
                <div id="privacy">
                  <label className="flex items-start gap-3 cursor-pointer select-none group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${privacyAccepted ? "bg-[#1DBFCE] border-[#1DBFCE]" : "border-slate-300 bg-white group-hover:border-[#1DBFCE]"}
                          ${errors.privacy ? "border-[#E8192C]" : ""}`}
                      >
                        {privacyAccepted && (
                          <span className="material-symbols-outlined text-white" style={{ fontSize: "13px" }}>
                            check
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#64748B] leading-relaxed">
                      Acepto la{" "}
                      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
                        Política de Privacidad
                      </span>{" "}
                      de Contacto Médico y autorizo el tratamiento de mis datos personales.
                    </span>
                  </label>
                  {errors.privacy && (
                    <p className="text-xs text-[#E8192C] mt-1.5 ml-8">{errors.privacy}</p>
                  )}
                </div>

                {/* Términos y condiciones */}
                <div id="terms">
                  <label className="flex items-start gap-3 cursor-pointer select-none group">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${termsAccepted ? "bg-[#1DBFCE] border-[#1DBFCE]" : "border-slate-300 bg-white group-hover:border-[#1DBFCE]"}
                          ${errors.terms ? "border-[#E8192C]" : ""}`}
                      >
                        {termsAccepted && (
                          <span className="material-symbols-outlined text-white" style={{ fontSize: "13px" }}>
                            check
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#64748B] leading-relaxed">
                      Acepto los{" "}
                      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
                        Términos y Condiciones
                      </span>{" "}
                      del servicio de afiliación.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-xs text-[#E8192C] mt-1.5 ml-8">{errors.terms}</p>
                  )}
                </div>

                {/* Error de envío */}
                {submitState === "error" && (
                  <div className="p-4 rounded-xl text-sm font-medium bg-[#ffdad6] text-[#93000a] border border-[#ffb3ae] flex items-start gap-2">
                    <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: "16px" }}>
                      error
                    </span>
                    {responseMsg}
                  </div>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  disabled={submitState === "loading"}
                  className="w-full py-4 bg-[#E8192C] text-white rounded-xl font-bold text-[15px] shadow-md hover:bg-[#c41422] active:scale-[0.98] transition-all duration-200 uppercase tracking-wide disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitState === "loading" ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Enviando solicitud...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        send
                      </span>
                      Enviar solicitud
                    </>
                  )}
                </button>
              </div>
            </FormCard>
          </form>
        </div>
      </section>
    </main>
  );
}

/* ── Sub-componentes ── */

function HeroSection() {
  return (
    <section className="relative py-16 bg-[#1A1A2E] overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #E8192C 0%, transparent 50%), radial-gradient(circle at 80% 50%, #1DBFCE 0%, transparent 50%)",
        }}
      />
      <div className="relative z-10 max-w-[1280px] mx-auto px-6 md:px-12 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px w-8 bg-[#E8192C]" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8192C]">
            Formulario de Afiliación
          </span>
          <div className="h-px w-8 bg-[#E8192C]" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Afíliate{" "}
          <span className="text-[#1DBFCE] italic">ahora</span>
        </h1>
        <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
          Completa el formulario y uno de nuestros asesores se pondrá en contacto contigo
          para finalizar tu proceso de afiliación.
        </p>
      </div>
    </section>
  );
}

function FormCard({
  icon,
  title,
  description,
  children,
}: {
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-5">
      <div className="h-1 w-full bg-gradient-to-r from-[#E8192C] to-[#1DBFCE]" />
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-[#1DBFCE]" style={{ fontSize: "22px" }}>
            {icon}
          </span>
          <h2
            className="text-[18px] font-bold text-[#1A1A2E]"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {title}
          </h2>
        </div>
        <p className="text-sm text-[#64748B] mb-6 ml-[34px]">{description}</p>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="block text-sm font-medium text-[#64748B]">
          {label}
          {required && <span className="text-[#E8192C] ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-400">({hint})</span>}
      </div>
      {children}
      {error && <p className="text-xs text-[#E8192C] mt-1.5">{error}</p>}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full bg-white border ${error ? "border-[#E8192C]" : "border-[#e5eeff]"} rounded-xl py-3 px-4 text-sm text-[#1A1A2E] placeholder:text-slate-300 focus:ring-2 ${error ? "focus:ring-[#E8192C]/10" : "focus:ring-[#1DBFCE]/20"} focus:border-[#1DBFCE] outline-none transition-all`;
}

function selectClass(error?: string) {
  return `w-full bg-white border ${error ? "border-[#E8192C]" : "border-[#e5eeff]"} rounded-xl py-3 px-4 text-sm text-[#1A1A2E] focus:ring-2 ${error ? "focus:ring-[#E8192C]/10" : "focus:ring-[#1DBFCE]/20"} focus:border-[#1DBFCE] outline-none transition-all`;
}
