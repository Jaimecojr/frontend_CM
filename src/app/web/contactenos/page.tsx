"use client";

import { useEffect, useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import type { Department, City } from "@/app/4dnn1n/counselors/fetch";
import { csrf, getXsrfToken } from "@/lib/api";
import LegalModal from "@/components/web/LegalModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
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

type SubmitState = "idle" | "loading" | "success" | "error";

const ASUNTOS = [
  "Información sobre planes",
  "Soporte técnico",
  "Quejas y reclamos",
  "Solicitud de información",
  "Otro",
];

export default function ContactenosPage() {
  /* ── Catálogos ── */
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  /* ── Campos del formulario ── */
  const [name, setName] = useState("");
  const [movil, setMovil] = useState("");
  const [email, setEmail] = useState("");
  const [asunto, setAsunto] = useState("");
  const [deptId, setDeptId] = useState<number | "">("");
  const [cityId, setCityId] = useState<number | "">("");
  const [mensaje, setMensaje] = useState("");

  /* ── Otros ── */
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
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

  /* ── Validación ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "El nombre completo es requerido.";
    if (!/^\d{10}$/.test(movil)) e.movil = "El celular debe tener exactamente 10 dígitos.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Ingresa un correo válido.";
    if (!asunto) e.asunto = "Selecciona un asunto.";
    if (!deptId) e.deptId = "Selecciona un departamento.";
    if (!cityId) e.cityId = "Selecciona una ciudad.";
    if (!mensaje.trim()) e.mensaje = "El mensaje es requerido.";
    else if (mensaje.trim().length < 10) e.mensaje = "El mensaje debe tener al menos 10 caracteres.";
    if (!captchaToken) e.captcha = "Por favor completa el reCAPTCHA.";
    if (!privacyAccepted) e.privacy = "Debes aceptar la Política de Privacidad.";
    if (!termsAccepted) e.terms = "Debes aceptar los Términos y Condiciones.";
    return e;
  };

  /* ── Resetear formulario ── */
  const resetForm = () => {
    setName(""); setMovil(""); setEmail("");
    setAsunto(""); setDeptId(""); setCityId(""); setMensaje("");
    setPrivacyAccepted(false); setTermsAccepted(false);
    setCaptchaToken(null);
    recaptchaRef.current?.reset();
  };

  /* ── Envío ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstKey = Object.keys(validationErrors)[0];
      window.document
        .getElementById(firstKey)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    setSubmitState("loading");
    try {
      await csrf();
      const res = await fetch(`${API_URL}/api/public/contact`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-XSRF-TOKEN": getXsrfToken() ?? "",
        },
        body: JSON.stringify({
          name,
          movil,
          email,
          asunto,
          department_id: deptId,
          city_id: cityId,
          mensaje,
          recaptcha_token: captchaToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setSubmitState("success");
        setResponseMsg(
          data.message || "¡Tu mensaje fue enviado con éxito! Pronto nos pondremos en contacto contigo."
        );
      } else {
        setSubmitState("error");
        setResponseMsg(data.message || "Ocurrió un error al enviar el mensaje. Intenta nuevamente.");
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
                <span
                  className="material-symbols-outlined text-[#1DBFCE]"
                  style={{ fontSize: "32px" }}
                >
                  mark_email_read
                </span>
              </div>
              <h2
                className="text-2xl font-bold text-[#1A1A2E] mb-3"
                style={{ fontFamily: "'Lora', Georgia, serif" }}
              >
                ¡Mensaje Enviado!
              </h2>
              <p className="text-[#64748B] leading-relaxed">{responseMsg}</p>
              <button
                onClick={() => {
                  setSubmitState("idle");
                  resetForm();
                }}
                className="mt-8 px-8 py-3 bg-[#E8192C] text-white rounded-xl font-semibold text-sm hover:bg-[#c41422] transition-all"
              >
                Enviar otro mensaje
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
            {/* ── Datos de contacto ── */}
            <FormCard
              icon="person"
              title="Datos de Contacto"
              description="Cuéntanos quién eres para poder responderte."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <Field label="Nombre completo" required error={errors.name}>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Juan Carlos Gómez Pérez"
                      className={inputClass(errors.name)}
                    />
                  </Field>
                </div>

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

                <div className="sm:col-span-2">
                  <Field label="Asunto" required error={errors.asunto}>
                    <select
                      id="asunto"
                      value={asunto}
                      onChange={(e) => setAsunto(e.target.value)}
                      className={selectClass(errors.asunto)}
                    >
                      <option value="">Selecciona un asunto</option>
                      {ASUNTOS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
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
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
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
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </FormCard>

            {/* ── Mensaje ── */}
            <FormCard
              icon="chat"
              title="Tu Mensaje"
              description="Escríbenos en detalle, intentamos responder en menos de 24 horas."
            >
              <Field label="Mensaje" required error={errors.mensaje}>
                <textarea
                  id="mensaje"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Escribe aquí tu consulta, comentario o solicitud..."
                  rows={6}
                  className={`${inputClass(errors.mensaje)} resize-none`}
                />
                <p className="text-[11px] text-slate-400 mt-1 text-right">
                  {mensaje.length} caracteres
                </p>
              </Field>
            </FormCard>

            {/* ── Verificación y aceptaciones ── */}
            <FormCard
              icon="verified_user"
              title="Verificación"
              description="Confirma que eres humano y acepta nuestras políticas."
            >
              <div className="space-y-5">
                {/* reCAPTCHA */}
                <div>
                  <p className="block text-sm font-medium text-[#64748B] mb-2">
                    Verificación de seguridad
                  </p>
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
                          <span
                            className="material-symbols-outlined text-white"
                            style={{ fontSize: "13px" }}
                          >
                            check
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#64748B] leading-relaxed">
                      Acepto la{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal('privacy')}
                        className="text-[#1DBFCE] font-semibold hover:underline"
                      >
                        Política de Privacidad
                      </button>{" "}
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
                          <span
                            className="material-symbols-outlined text-white"
                            style={{ fontSize: "13px" }}
                          >
                            check
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#64748B] leading-relaxed">
                      Acepto los{" "}
                      <button
                        type="button"
                        onClick={() => setLegalModal('terms')}
                        className="text-[#1DBFCE] font-semibold hover:underline"
                      >
                        Términos y Condiciones
                      </button>{" "}
                      del servicio.
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-xs text-[#E8192C] mt-1.5 ml-8">{errors.terms}</p>
                  )}
                </div>

                {/* Error de envío */}
                {submitState === "error" && (
                  <div className="p-4 rounded-xl text-sm font-medium bg-[#ffdad6] text-[#93000a] border border-[#ffb3ae] flex items-start gap-2">
                    <span
                      className="material-symbols-outlined shrink-0 mt-0.5"
                      style={{ fontSize: "16px" }}
                    >
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
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Enviando mensaje...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                        send
                      </span>
                      Enviar mensaje
                    </>
                  )}
                </button>
              </div>
            </FormCard>
          </form>
        </div>
      </section>
        {legalModal && (
          <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
        )}
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
            Contáctenos
          </span>
          <div className="h-px w-8 bg-[#E8192C]" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          ¿Cómo podemos{" "}
          <span className="text-[#1DBFCE] italic">ayudarte?</span>
        </h1>
        <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
          Completa el formulario y nuestro equipo se pondrá en contacto contigo
          a la brevedad posible.
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