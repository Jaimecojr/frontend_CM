# Completar Sitio Web Público (Quiénes Somos, Servicios, botón submit, footer legal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar 4 brechas del sitio web público (`/web/*`) frente al sitio en producción: bug del botón de envío que no respeta checkboxes/captcha, página "Quiénes Somos" faltante, página "Servicios" faltante, y links legales del footer sin funcionalidad.

**Architecture:** Cambios puntuales en componentes/páginas existentes de Next.js (App Router) dentro de `src/app/web/` y `src/components/web/`. Dos páginas nuevas siguen el mismo patrón de componente-en-el-mismo-archivo (`page.tsx` con sub-componentes locales) ya usado en `afiliarse/page.tsx` y `contactenos/page.tsx`. No se agrega infraestructura nueva (sin nuevas dependencias, sin nuevas rutas de API).

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Material Symbols (`material-symbols-outlined`), fuente `'Lora', Georgia, serif` para headings.

## Global Constraints

- Idioma: todo el contenido visible (headings, textos, mensajes) en español.
- Paleta de marca: `#E8192C` (rojo), `#1DBFCE` (cian), `#1A1A2E` (oscuro), fondo de sección alterno `#f8f9ff`, texto secundario `#64748B`.
- Ancho de contenido estándar: `max-w-[1280px] mx-auto px-6 md:px-12` (páginas de contenido) — los formularios usan `max-w-[860px]`.
- El módulo `/web` no tiene suite de tests automatizados existente; la verificación de cada tarea es manual vía `npm run dev` y revisión en el navegador (no se introduce un framework de testing nuevo solo para este trabajo).
- No hacer commits de git durante la ejecución — el usuario ha pedido explícitamente no commitear hasta que el proyecto esté terminado. Cada tarea termina con un checkpoint de verificación manual, no con un paso de `git commit`.

---

### Task 1: Fix del botón de envío — Afiliación y Contacto

**Files:**
- Modify: `src/app/web/afiliarse/page.tsx:520`
- Modify: `src/app/web/contactenos/page.tsx:453`

**Interfaces:**
- Consumes: estado ya existente `submitState`, `privacyAccepted`, `termsAccepted`, `captchaToken` (ya declarados en ambos archivos, sin cambios de tipo).
- Produces: nada consumido por otras tareas — cambio aislado.

- [ ] **Step 1: Reproducir el bug manualmente**

Ejecutar el servidor de desarrollo:

```bash
cd frontend-cm
npm run dev
```

Abrir `http://localhost:3000/web/afiliarse` en el navegador. Sin marcar ningún checkbox ni completar el reCAPTCHA, verificar que el botón "Enviar solicitud" se ve habilitado (no tiene `opacity-60` ni cursor deshabilitado). Repetir en `http://localhost:3000/web/contactenos` con el botón "Enviar mensaje". Confirmar el bug en ambas páginas antes de tocar código.

- [ ] **Step 2: Corregir el `disabled` en `afiliarse/page.tsx`**

En `src/app/web/afiliarse/page.tsx`, línea 520:

```tsx
// Antes
disabled={submitState === "loading"}

// Después
disabled={submitState === "loading" || !privacyAccepted || !termsAccepted || !captchaToken}
```

- [ ] **Step 3: Corregir el `disabled` en `contactenos/page.tsx`**

En `src/app/web/contactenos/page.tsx`, línea 453, el mismo cambio exacto:

```tsx
// Antes
disabled={submitState === "loading"}

// Después
disabled={submitState === "loading" || !privacyAccepted || !termsAccepted || !captchaToken}
```

- [ ] **Step 4: Verificación manual**

Con el dev server corriendo, recargar `/web/afiliarse`:
1. El botón "Enviar solicitud" debe verse deshabilitado (atenuado, sin hover) al cargar la página.
2. Marcar solo el checkbox de Privacidad → sigue deshabilitado.
3. Marcar también Términos → sigue deshabilitado (falta captcha).
4. Completar el reCAPTCHA → el botón se habilita (deja de estar atenuado, responde al hover).
5. Desmarcar cualquiera de los dos checkboxes → el botón vuelve a deshabilitarse.

Repetir los mismos 5 pasos en `/web/contactenos`. Confirmar que ambos formularios se comportan igual.

---

### Task 2: Wiring de enlaces — botón "Conoce más" y link "Servicios"

**Files:**
- Modify: `src/components/web/AboutSection.tsx:1-3,108-116`
- Modify: `src/components/web/Navbar.tsx:1-5,49-56`

**Interfaces:**
- Consumes: rutas `/web/quienes-somos` y `/web/servicios` — no existen todavía en el filesystem hasta las Tasks 3 y 4, pero Next.js no falla en build/dev por un `<Link href>` a una ruta inexistente (solo da 404 al navegar). Este task puede ejecutarse antes o después de crear las páginas sin bloquear a nadie.
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Convertir el botón de `AboutSection.tsx` en Link**

En `src/components/web/AboutSection.tsx`, agregar el import de `Link` junto al de `Image` (línea 1):

```tsx
import Image from "next/image";
import Link from "next/link";
```

Reemplazar el `<button>` de las líneas 108-116:

```tsx
// Antes
<button className="flex items-center gap-2 px-7 py-3.5 bg-[#1DBFCE] text-white rounded-lg font-semibold text-[15px] hover:bg-[#17a8b5] active:scale-95 transition-all duration-200 shadow-md shadow-cyan-100">
  Conoce más sobre nosotros
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "16px" }}
  >
    arrow_forward
  </span>
</button>
```

```tsx
// Después
<Link
  href="/web/quienes-somos"
  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1DBFCE] text-white rounded-lg font-semibold text-[15px] hover:bg-[#17a8b5] active:scale-95 transition-all duration-200 shadow-md shadow-cyan-100"
>
  Conoce más sobre nosotros
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "16px" }}
  >
    arrow_forward
  </span>
</Link>
```

(Nota: `flex` cambia a `inline-flex` porque `<Link>` renderiza un `<a>`, que debe evitar ocupar el ancho completo como bloque.)

- [ ] **Step 2: Actualizar el link "Servicios" del Navbar**

En `src/components/web/Navbar.tsx`, líneas 49-56, reemplazar:

```tsx
// Antes
<li>
  <Link
    href="#"
    className="text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"
  >
    Servicios
  </Link>
</li>
```

```tsx
// Después
<li>
  <Link
    href="/web/servicios"
    className={pathname === "/web/servicios" ? "text-[#E8192C] border-b-2 border-[#E8192C] pb-0.5" : "text-[#64748B] hover:text-[#1A1A2E] border-b-2 border-transparent hover:border-[#1DBFCE] pb-0.5 transition-all duration-200"}
  >
    Servicios
  </Link>
</li>
```

- [ ] **Step 3: Verificación manual**

Con el dev server corriendo:
1. Ir a `/web`, hacer clic en "Conoce más sobre nosotros" → debe navegar a `/web/quienes-somos` (dará 404 hasta completar Task 3, es esperado en este punto).
2. Hacer clic en "Servicios" del navbar → debe navegar a `/web/servicios` (dará 404 hasta completar Task 4, es esperado).
3. Confirmar que el resto de links del navbar (Inicio, Guía Médica, Contáctenos, Afíliate) siguen funcionando sin regresión.

---

### Task 3: Página "Quiénes Somos" (`/web/quienes-somos`)

**Files:**
- Create: `src/app/web/quienes-somos/page.tsx`

**Interfaces:**
- Consumes: ninguno (página estática, sin fetch a API).
- Produces: ruta `/web/quienes-somos` consumida por el link creado en Task 2.

- [ ] **Step 1: Crear la página**

Crear `src/app/web/quienes-somos/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Quiénes Somos | Contacto Médico",
  description:
    "Conoce la historia, misión y visión de Contacto Médico: más de 15 años facilitando el acceso a especialistas de salud con tarifas preferenciales en Colombia.",
};

const CHECKLIST_ITEMS = [
  "Red de especialistas de alto nivel",
  "Atención prioritaria sin esperas",
  "Convenios de diagnóstico avanzado",
  "Seguimiento humano personalizado",
];

const STATS = [
  { value: "15+", label: "Años", color: "#E8192C" },
  { value: "+5", label: "Ciudades", color: "#1DBFCE" },
  { value: "500+", label: "Médicos", color: "#1A1A2E" },
];

export default function QuienesSomosPage() {
  return (
    <main>
      {/* Hero */}
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
              Quiénes Somos
            </span>
            <div className="h-px w-8 bg-[#E8192C]" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Expertos en{" "}
            <span className="text-[#1DBFCE] italic">Intermediación</span> Médica
          </h1>
          <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
            Llevamos más de 15 años conectando familias colombianas con soluciones
            médicas ágiles, humanas y de calidad.
          </p>
        </div>
      </section>

      {/* Trayectoria */}
      <section className="py-14 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center"
            >
              <p
                className="font-bold text-4xl leading-none"
                style={{ fontFamily: "'Lora', Georgia, serif", color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mt-2">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="pl-5 border-l-[3px] border-[#1DBFCE]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] block mb-3">
              Misión
            </span>
            <p className="text-[16px] italic text-[#64748B] leading-relaxed">
              &quot;Nuestra misión es transformar la experiencia de salud en
              Colombia, conectando personas con soluciones médicas ágiles y
              humanas.&quot;
            </p>
          </div>
          <div className="pl-5 border-l-[3px] border-[#E8192C]">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E8192C] block mb-3">
              Visión
            </span>
            <p className="text-[16px] italic text-[#64748B] leading-relaxed">
              &quot;Ser en el año 2030 la empresa líder en Colombia en
              intermediación y servicios complementarios de salud, reconocida
              por la calidad de nuestra red de especialistas y la cercanía con
              nuestros afiliados.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-20 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Lo que nos distingue
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {CHECKLIST_ITEMS.map((item) => (
              <div
                key={item}
                className="flex gap-3 items-start bg-white rounded-xl border border-slate-100 p-5"
              >
                <div className="w-5 h-5 rounded-full bg-[#1DBFCE]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span
                    className="material-symbols-outlined text-[#1DBFCE]"
                    style={{ fontSize: "13px" }}
                  >
                    check
                  </span>
                </div>
                <p className="text-[15px] text-[#1A1A2E] leading-snug">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-white">
        <div className="max-w-[640px] mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            ¿Listo para afiliarte?
          </h2>
          <p className="text-[#64748B] leading-relaxed mb-8">
            Únete hoy y accede a nuestra red de especialistas con tarifas
            preferenciales para ti y tu familia.
          </p>
          <Link
            href="/web/afiliarse"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#E8192C] text-white rounded-xl font-bold text-[15px] shadow-md hover:bg-[#c41422] active:scale-[0.98] transition-all duration-200 uppercase tracking-wide"
          >
            Afíliate ahora
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verificación manual**

Con el dev server corriendo, ir a `http://localhost:3000/web/quienes-somos`:
1. Confirmar que la página carga sin errores en la consola del navegador.
2. Confirmar visualmente: hero oscuro con título, 3 tarjetas de estadísticas, bloques de Misión/Visión lado a lado (en desktop) o apilados (en mobile — reducir el viewport), checklist de 4 puntos, y botón CTA final.
3. Hacer clic en "Afíliate ahora" → debe navegar correctamente a `/web/afiliarse`.
4. Volver a `/web` y hacer clic en "Conoce más sobre nosotros" (de Task 2) → debe llegar a esta página sin 404.

---

### Task 4: Página "Servicios" (`/web/servicios`)

**Files:**
- Create: `src/app/web/servicios/page.tsx`

**Interfaces:**
- Consumes: ninguno (página estática, sin fetch a API).
- Produces: ruta `/web/servicios` consumida por el link del Navbar creado en Task 2.

- [ ] **Step 1: Crear la página**

Crear `src/app/web/servicios/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Servicios | Contacto Médico",
  description:
    "Conoce los servicios a domicilio y la red de especialidades médicas disponibles con tarifas preferenciales a través de Contacto Médico.",
};

const HOME_SERVICES = [
  { icon: "biotech", title: "Laboratorio Clínico", description: "Toma de muestras y exámenes de laboratorio en la comodidad de tu hogar." },
  { icon: "medical_information", title: "Imágenes Diagnósticas", description: "Coordinación de estudios de imagen con nuestra red de convenios." },
  { icon: "emergency", title: "Ambulancia", description: "Servicio de traslado médico cuando lo necesitas." },
  { icon: "home_health", title: "Médico a Domicilio", description: "Atención médica general en tu casa, sin desplazamientos." },
  { icon: "vaccines", title: "Enfermería a Domicilio", description: "Curaciones, aplicación de medicamentos y cuidados de enfermería en casa." },
  { icon: "self_improvement", title: "Fisioterapia y Terapia Respiratoria", description: "Sesiones de rehabilitación y terapia respiratoria a domicilio." },
];

const SPECIALTIES = [
  "Medicina General", "Ginecología", "Pediatría", "Medicina Interna",
  "Gastroenterología", "Dermatología", "Neurocirugía", "Cardiología",
  "Ortopedia", "Odontología General y Especializada", "Optometría",
  "Cirugía Plástica", "Cirugía Vascular", "Urología", "Nefrología",
  "Otorrinolaringología", "Reumatología", "Endocrinología",
  "Oftalmología", "Neuropediatría",
];

export default function ServiciosPage() {
  return (
    <main>
      {/* Hero */}
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
              Servicios
            </span>
            <div className="h-px w-8 bg-[#E8192C]" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Acceso a una red{" "}
            <span className="text-[#1DBFCE] italic">completa</span> de salud
          </h1>
          <p className="text-slate-400 text-[16px] max-w-xl mx-auto leading-relaxed">
            Con una mínima cuota anual, accede a servicios de apoyo a domicilio y
            a nuestra amplia red de especialistas con tarifas preferenciales.
          </p>
        </div>
      </section>

      {/* Servicios a domicilio */}
      <section className="py-20 bg-[#f8f9ff]">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] mb-3 block">
              Servicios a Domicilio
            </span>
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Cuidado médico sin salir de casa
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HOME_SERVICES.map((service) => (
              <div
                key={service.title}
                className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-[#1DBFCE]/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-[#eff4ff] flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[#1DBFCE]">
                    {service.icon}
                  </span>
                </div>
                <h4 className="font-bold text-xl text-[#1A1A2E] mb-2">
                  {service.title}
                </h4>
                <p className="text-[#64748B] text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="py-20 bg-white">
        <div className="max-w-[1280px] mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#1DBFCE] mb-3 block">
              Especialidades
            </span>
            <h2
              className="text-3xl font-bold text-[#1A1A2E]"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              Nuestra red de especialistas
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {SPECIALTIES.map((specialty) => (
              <div
                key={specialty}
                className="flex items-center gap-3 bg-[#f8f9ff] border border-slate-100 rounded-lg px-5 py-3.5"
              >
                <span
                  className="material-symbols-outlined text-[#1DBFCE] shrink-0"
                  style={{ fontSize: "18px" }}
                >
                  check_circle
                </span>
                <span className="text-[14px] text-[#1A1A2E] font-medium">
                  {specialty}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 bg-[#f8f9ff]">
        <div className="max-w-[640px] mx-auto px-6 text-center">
          <h2
            className="text-2xl font-bold text-[#1A1A2E] mb-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Encuentra tu especialista
          </h2>
          <p className="text-[#64748B] leading-relaxed mb-8">
            Busca en nuestra guía médica por ciudad y especialidad, o afíliate
            para acceder a tarifas preferenciales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/web/guia-medica"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[#1DBFCE] text-[#1DBFCE] rounded-xl font-bold text-[15px] hover:bg-[#1DBFCE] hover:text-white transition-all duration-200 uppercase tracking-wide"
            >
              Ver Guía Médica
            </Link>
            <Link
              href="/web/afiliarse"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#E8192C] text-white rounded-xl font-bold text-[15px] shadow-md hover:bg-[#c41422] active:scale-[0.98] transition-all duration-200 uppercase tracking-wide"
            >
              Afíliate ahora
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verificación manual**

Con el dev server corriendo, ir a `http://localhost:3000/web/servicios`:
1. Confirmar que la página carga sin errores en la consola.
2. Confirmar visualmente: hero, grid de 6 tarjetas de servicios a domicilio, grid de 20 especialidades, y dos botones CTA finales.
3. Hacer clic en "Ver Guía Médica" → navega a `/web/guia-medica`. Hacer clic en "Afíliate ahora" → navega a `/web/afiliarse`.
4. Volver a cualquier página `/web/*` y hacer clic en "Servicios" del navbar (de Task 2) → debe resaltarse en rojo (estado activo) al estar en esta página, y llegar sin 404.

---

### Task 5: Footer — links legales funcionales

**Files:**
- Modify: `src/components/web/Footer.tsx`

**Interfaces:**
- Consumes: `LegalModal` de `src/components/web/LegalModal.tsx` (ya existe, props `{ type: 'privacy' | 'terms', onClose: () => void }`, export default).
- Produces: nada consumido por otras tareas.

- [ ] **Step 1: Convertir Footer a client component y agregar el estado del modal**

En `src/components/web/Footer.tsx`, agregar `'use client';` como primera línea del archivo, y los imports/estado necesarios. El inicio del archivo queda:

```tsx
'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logos/logo.png";
import LegalModal from "@/components/web/LegalModal";

export function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer className="bg-[#1A1A2E] text-white">
```

(El resto del `return` original permanece igual hasta llegar al bloque de "Enlaces & Otras Sedes".)

- [ ] **Step 2: Hacer clicables "Aviso de Privacidad" y "Términos y Condiciones"**

Reemplazar el bloque de la columna "Enlaces & Otras Sedes" (líneas 98-118 del archivo original):

```tsx
// Antes
<div className="space-y-5">
  <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
    Enlaces & Otras Sedes
  </h6>
  <ul className="space-y-3 text-slate-400 text-sm">
    {[
      "Cali y Valle del Cauca",
      "Aviso de Privacidad",
      "Términos y Condiciones",
      "Preguntas Frecuentes",
    ].map((item) => (
      <li
        key={item}
        className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1"
      >
        {item}
      </li>
    ))}
  </ul>
</div>
```

```tsx
// Después
<div className="space-y-5">
  <h6 className="text-[#E8192C] font-bold uppercase tracking-widest text-xs">
    Enlaces & Otras Sedes
  </h6>
  <ul className="space-y-3 text-slate-400 text-sm">
    <li className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1">
      Cali y Valle del Cauca
    </li>
    <li>
      <button
        type="button"
        onClick={() => setLegalModal('privacy')}
        className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1 text-left"
      >
        Aviso de Privacidad
      </button>
    </li>
    <li>
      <button
        type="button"
        onClick={() => setLegalModal('terms')}
        className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1 text-left"
      >
        Términos y Condiciones
      </button>
    </li>
    <li className="hover:text-[#1DBFCE] cursor-pointer transition-all duration-200 hover:translate-x-1">
      Preguntas Frecuentes
    </li>
  </ul>
</div>
```

- [ ] **Step 3: Renderizar el modal al final del footer**

Justo antes del `</footer>` de cierre (después del bloque de copyright), agregar:

```tsx
      </div>
      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </footer>
  );
}
```

(Reemplaza el cierre original `</div></footer>);}` por esta versión que agrega el modal condicional antes de cerrar `</footer>`.)

- [ ] **Step 4: Verificación manual**

Con el dev server corriendo, ir a `http://localhost:3000/web` (o cualquier página `/web/*`, el Footer es compartido vía `layout.tsx`):
1. Hacer scroll hasta el footer.
2. Clic en "Aviso de Privacidad" → se abre el modal con el contenido de `PrivacyContent` (título "Política de Privacidad y Tratamiento de Datos"). Cerrar con el botón "Entendido", con la X, con Escape, y con clic fuera del modal — las 4 formas deben cerrar correctamente.
3. Clic en "Términos y Condiciones" → se abre el modal con `TermsContent` (título "Términos y Condiciones"). Cerrar de la misma forma.
4. Confirmar que "Cali y Valle del Cauca" y "Preguntas Frecuentes" siguen siendo texto plano sin acción (comportamiento sin cambios, fuera de alcance).
5. Confirmar que no aparecen errores de hidratación en la consola del navegador (por el cambio a client component).

---

## Resumen de verificación final

Al completar las 5 tareas, hacer un recorrido manual completo del sitio público:

1. `/web` → Home carga con Hero, Acceso Rápido, About (con botón funcional), Aliados, Doctores.
2. `/web` → clic "Conoce más sobre nosotros" → `/web/quienes-somos` (Task 3).
3. Navbar → clic "Servicios" → `/web/servicios` (Task 4), con estado activo resaltado.
4. `/web/afiliarse` y `/web/contactenos` → botón de envío deshabilitado hasta cumplir las 3 condiciones (Task 1).
5. Footer (visible en cualquier página `/web/*`) → links legales abren el modal correspondiente (Task 5).
