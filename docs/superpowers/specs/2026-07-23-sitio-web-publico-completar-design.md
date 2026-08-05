# Completar sitio web público — Quiénes Somos, Servicios, botón submit, footer legal

## Contexto

El sitio web público nuevo (`/web/*`) está siendo comparado contra el sitio en producción (contactomedico.net) para identificar qué falta antes de dar por terminado el módulo. Se detectaron 4 problemas concretos:

1. **Bug de seguridad/UX:** en los formularios de Afiliación (`/web/afiliarse`) y Contacto (`/web/contactenos`), el botón de envío solo se deshabilita mientras `submitState === "loading"`. No considera si el usuario aceptó la Política de Privacidad, los Términos y Condiciones, ni si completó el reCAPTCHA. El usuario puede hacer clic en "Enviar" en cualquier momento; la validación de esos campos corre recién dentro de `handleSubmit`, después del clic.
2. **Página "Quiénes Somos" inexistente:** el Home tiene una sección `AboutSection` con un botón "Conoce más sobre nosotros" sin `href` ni `onClick` — no lleva a ninguna parte porque la página de destino no existe. El sitio en producción sí tiene esta página con misión, visión (meta 2030) y trayectoria.
3. **Página "Servicios" inexistente:** el link "Servicios" del `Navbar` apunta a `href="#"` (muerto). El sitio en producción tiene una página completa con la lista de especialidades médicas y servicios de apoyo a domicilio.
4. **Footer con links legales sin funcionalidad:** "Aviso de Privacidad" y "Términos y Condiciones" en el `Footer` son texto plano sin acción, a pesar de que ya existe `LegalModal.tsx` con ese contenido (reutilizado actualmente solo en los formularios).

## Alcance

Incluye:
- Fix del `disabled` del botón submit en `afiliarse/page.tsx` y `contactenos/page.tsx`.
- Nueva página `/web/quienes-somos`.
- Nueva página `/web/servicios`.
- Wiring del botón "Conoce más sobre nosotros" (`AboutSection.tsx`) hacia `/web/quienes-somos`.
- Wiring del link "Servicios" del `Navbar` hacia `/web/servicios`.
- Footer: abrir `LegalModal` al hacer clic en "Aviso de Privacidad" / "Términos y Condiciones".

Fuera de alcance (explícitamente pospuesto):
- "Preguntas Frecuentes" del footer (sin contenido definido aún).
- "Cali y Valle del Cauca" del footer (sede adicional, no es parte de este trabajo).
- Blog (subdominio separado en el sitio viejo, no evaluado).

## Diseño

### 1. Fix botón submit — `afiliarse/page.tsx` y `contactenos/page.tsx`

Cambio idéntico en ambos archivos, en el botón de envío (`afiliarse/page.tsx` ~línea 520, `contactenos/page.tsx` ~línea 453):

```tsx
// Antes
disabled={submitState === "loading"}

// Después
disabled={submitState === "loading" || !privacyAccepted || !termsAccepted || !captchaToken}
```

Sin cambios en `validate()` — sigue corriendo igual como red de seguridad adicional al hacer submit (por si el estado se desincroniza).

### 2. Página `/web/quienes-somos`

Archivo nuevo: `src/app/web/quienes-somos/page.tsx`.

Sigue el lenguaje visual existente: paleta `#E8192C` (rojo marca), `#1DBFCE` (cian), `#1A1A2E` (oscuro), fuente `'Lora', Georgia, serif` para headings, mismo patrón de `max-w-[1280px] mx-auto px-6 md:px-12`.

Contenido (adaptado del sitio en producción `about_us.php`, ajustado al tono ya usado en `AboutSection.tsx`):
- Encabezado: "Quiénes Somos" + heading "Expertos en Intermediación Médica" (reutiliza la misma frase que ya está en el Home para consistencia de marca).
- Bloque Misión: reutiliza la cita ya existente en `AboutSection`: *"Nuestra misión es transformar la experiencia de salud en Colombia, conectando personas con soluciones médicas ágiles y humanas."*
- Bloque Visión (nuevo, adaptado del sitio viejo): ser la empresa líder en Colombia en intermediación y servicios complementarios de salud para el año 2030, reconocida por la calidad de su red de especialistas y la cercanía con sus afiliados.
- Bloque trayectoria: mismos 3 badges de `AboutSection` (15+ años, +5 ciudades, 500+ médicos), presentados como stat cards en esta página.
- Checklist de 4 puntos: reutiliza el mismo array de `AboutSection` ("Red de especialistas de alto nivel", "Atención prioritaria sin esperas", "Convenios de diagnóstico avanzado", "Seguimiento humano personalizado").
- CTA final: botón/link hacia `/web/afiliarse` ("Afíliate ahora").
- Metadata SEO (`title`, `description`) siguiendo el patrón de `page.tsx` del Home.

`AboutSection.tsx` (línea 108-116): el botón "Conoce más sobre nosotros" se convierte en `<Link href="/web/quienes-somos">` manteniendo las mismas clases (import `Link` desde `next/link`, ya usado en otros componentes del sitio web).

### 3. Página `/web/servicios`

Archivo nuevo: `src/app/web/servicios/page.tsx`. Mismo lenguaje visual que Quiénes Somos.

Contenido (adaptado de `services.php` del sitio en producción):
- Encabezado: "Servicios" + subtítulo sobre acceso a red de especialistas con tarifas preferenciales.
- Sección "Servicios a domicilio": laboratorio clínico, imágenes diagnósticas, ambulancia, atención médica a domicilio, enfermería a domicilio, fisioterapia y terapia respiratoria a domicilio. Tarjetas con ícono (`material-symbols-outlined`) + texto, mismo patrón de `QuickAccessSection.tsx`.
- Sección "Especialidades médicas": grid/lista de las especialidades del sitio viejo (medicina general, ginecología, pediatría, medicina interna, gastroenterología, dermatología, neurocirugía, cardiología, ortopedia, odontología general y especializada, optometría, cirugía plástica, cirugía vascular, urología, nefrología, otorrinolaringología, reumatología, endocrinología, oftalmología, neuropediatría).
- Nota de tarifa: mención de "una mínima cuota anual" sin cifras específicas (igual que el sitio viejo — evita comprometerse a un precio desactualizado).
- CTA hacia `/web/guia-medica` (buscar especialista) y `/web/afiliarse`.
- Metadata SEO propia.

`Navbar.tsx` línea 49-56: el link "Servicios" cambia de `href="#"` a `href="/web/servicios"`, y se le agrega el mismo patrón de estado activo (`pathname === "/web/servicios"`) que ya usan los demás links del navbar.

### 4. Footer — links legales funcionales

`Footer.tsx` pasa a client component (`'use client'` al inicio, ya que necesita `useState`).

- Se agrega `const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);`
- En el array de la columna "Enlaces & Otras Sedes" (línea 104-116), "Aviso de Privacidad" y "Términos y Condiciones" dejan de ser `<li>{item}</li>` planos y se convierten en `<li><button onClick={() => setLegalModal('privacy'|'terms')}>...</button></li>`, manteniendo las mismas clases hover existentes. "Preguntas Frecuentes" y "Cali y Valle del Cauca" quedan como `<li>` de texto plano, sin cambios.
- Al final del componente: `{legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}` (mismo import ya usado en los formularios: `import LegalModal from '@/components/web/LegalModal'`).

## Testing

- Verificación manual en navegador (dev server): confirmar que el botón de ambos formularios permanece deshabilitado hasta marcar ambos checkboxes y completar el reCAPTCHA, y que se habilita correctamente al cumplir las 3 condiciones.
- Navegación manual: click en "Conoce más sobre nosotros" → llega a `/web/quienes-somos`; click en "Servicios" del navbar → llega a `/web/servicios`; click en los links legales del footer → abre el modal correspondiente y cierra con "Entendido"/Escape/click fuera.
- Revisión visual de que las páginas nuevas respetan el lenguaje visual existente (colores, tipografía, spacing) en desktop y mobile.
- No se requieren tests automatizados nuevos — el módulo `/web` no tiene suite de tests existente (páginas de contenido estático + un fix de estado de UI).

## Preguntas abiertas / decisiones ya tomadas

- Contenido de Quiénes Somos y Servicios: adaptado del sitio en producción, no contenido nuevo dictado por el cliente (decisión tomada en brainstorming).
- FAQ del footer: fuera de este alcance, pendiente de contenido futuro.
- Legal: los links del footer reutilizan el `LegalModal` existente en vez de crear páginas dedicadas `/web/privacidad` y `/web/terminos`.
