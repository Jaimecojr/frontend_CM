# Legal Modals (Política de Privacidad y Términos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar Política de Privacidad y Términos y Condiciones en un modal al hacer clic en sus enlaces dentro de los formularios de Contáctenos y Afiliarse.

**Architecture:** Un componente `LegalModal.tsx` compartido con React Portal contiene ambos textos. Los formularios existentes agregan un `useState` para controlar qué modal está abierto y convierten los spans clickeables en `<button type="button">`.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS

---

## Mapa de archivos

| Acción | Archivo |
|--------|---------|
| Crear | `src/components/web/LegalModal.tsx` |
| Modificar | `src/app/web/contactenos/page.tsx` |
| Modificar | `src/app/web/afiliarse/page.tsx` |

---

## Task 1: Crear el componente `LegalModal.tsx`

**Files:**
- Create: `src/components/web/LegalModal.tsx`

- [ ] **Step 1: Crear el archivo con el componente completo**

Crear `src/components/web/LegalModal.tsx` con el siguiente contenido:

```tsx
'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface LegalModalProps {
  type: 'privacy' | 'terms';
  onClose: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-[#1DBFCE] mt-6 mb-2 first:mt-0">
      {children}
    </h3>
  );
}

function PrivacyContent() {
  return (
    <div className="text-sm leading-relaxed text-gray-700 space-y-3">
      <p>
        <strong>[RAZÓN SOCIAL]</strong> (en adelante &quot;Contacto Médico&quot;), identificada con
        NIT <strong>[NIT]</strong>, con domicilio en <strong>[CIUDAD]</strong>, Colombia, en
        cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, informa a sus
        usuarios la presente Política de Privacidad y Tratamiento de Datos Personales.
      </p>

      <SectionTitle>1. Responsable del Tratamiento</SectionTitle>
      <ul className="space-y-1 pl-2">
        <li><strong>Razón Social:</strong> [RAZÓN SOCIAL]</li>
        <li><strong>NIT:</strong> [NIT]</li>
        <li><strong>Domicilio:</strong> [CIUDAD], Colombia</li>
        <li><strong>Correo de contacto:</strong> [CORREO DATOS]</li>
      </ul>

      <SectionTitle>2. Datos Personales que Recopilamos</SectionTitle>
      <p className="font-medium">Al diligenciar el formulario de afiliación:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nombre y apellidos</li>
        <li>Número de cédula de ciudadanía</li>
        <li>Número de celular (10 dígitos)</li>
        <li>Correo electrónico</li>
        <li>Fecha de nacimiento</li>
        <li>Dirección de residencia</li>
        <li>Departamento y ciudad</li>
        <li>Nombre de beneficiarios (cuando aplica)</li>
      </ul>
      <p className="font-medium mt-3">Al diligenciar el formulario de contacto:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nombre y apellidos</li>
        <li>Número de celular</li>
        <li>Correo electrónico</li>
        <li>Departamento y ciudad</li>
        <li>Mensaje o consulta</li>
      </ul>

      <SectionTitle>3. Finalidad del Tratamiento</SectionTitle>
      <p>Los datos personales recopilados se utilizan para:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Procesar y gestionar su solicitud de afiliación al plan de salud.</li>
        <li>Crear su perfil de usuario en el sistema y generar su carnet digital.</li>
        <li>Enviar el carnet de afiliado al número de WhatsApp registrado.</li>
        <li>Facilitar el acceso a la red de médicos e IPS aliadas con tarifas preferenciales.</li>
        <li>Responder las consultas enviadas a través del formulario de contacto.</li>
        <li>
          Enviar comunicaciones relacionadas con el estado de su afiliación, vencimientos y
          renovaciones.
        </li>
        <li>Cumplir con obligaciones legales y contractuales.</li>
      </ul>

      <SectionTitle>4. Derechos del Titular</SectionTitle>
      <p>
        En virtud de la Ley 1581 de 2012, usted como titular de los datos personales tiene
        derecho a:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Conocer</strong> los datos personales que Contacto Médico tiene sobre usted.
        </li>
        <li>
          <strong>Actualizar y rectificar</strong> sus datos cuando sean inexactos, incompletos o
          desactualizados.
        </li>
        <li>
          <strong>Solicitar la supresión</strong> de sus datos cuando no exista obligación legal o
          contractual de conservarlos.
        </li>
        <li>
          <strong>Revocar la autorización</strong> otorgada para el tratamiento de sus datos.
        </li>
        <li>
          <strong>Presentar quejas</strong> ante la Superintendencia de Industria y Comercio (SIC)
          por infracciones a la normativa de protección de datos.
        </li>
      </ul>
      <p className="mt-2">
        Para ejercer estos derechos, escríbanos a{' '}
        <strong>[CORREO DATOS]</strong> indicando su nombre completo, número de documento y la
        solicitud específica. Daremos respuesta en un plazo máximo de <strong>10 días hábiles</strong>.
      </p>

      <SectionTitle>5. Seguridad y Confidencialidad</SectionTitle>
      <p>
        Implementamos medidas técnicas y administrativas para proteger sus datos personales contra
        accesos no autorizados, pérdida, alteración o divulgación indebida. No compartimos su
        información personal con terceros, salvo:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Cuando sea necesario para la prestación del servicio (médicos e IPS de la red).</li>
        <li>Por obligación legal o requerimiento de autoridad competente.</li>
      </ul>

      <SectionTitle>6. Vigencia</SectionTitle>
      <p>
        Sus datos personales serán conservados durante el tiempo que dure la relación contractual
        de afiliación y el período adicional exigido por la ley para efectos de auditoría y
        cumplimiento legal.
      </p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="text-sm leading-relaxed text-gray-700 space-y-3">
      <p>
        Al diligenciar cualquiera de los formularios disponibles en este sitio web, el usuario
        declara haber leído y aceptado los presentes Términos y Condiciones establecidos por{' '}
        <strong>[RAZÓN SOCIAL]</strong> (en adelante &quot;Contacto Médico&quot;), NIT{' '}
        <strong>[NIT]</strong>.
      </p>

      <SectionTitle>1. Descripción del Servicio</SectionTitle>
      <p>
        Contacto Médico es una empresa colombiana que ofrece planes de salud complementaria que
        brindan acceso a una red de médicos generales, especialistas e IPS aliadas con tarifas
        preferenciales. Al afiliarse, el usuario recibe un carnet digital enviado a su WhatsApp
        que lo acredita como beneficiario de los descuentos y servicios de la red.
      </p>

      <SectionTitle>2. Proceso de Afiliación</SectionTitle>
      <ul className="list-disc pl-5 space-y-1">
        <li>El usuario diligencia el formulario de afiliación con información veraz y completa.</li>
        <li>
          Contacto Médico revisa la solicitud y, una vez procesada, activa el plan y envía el
          carnet digital al número de WhatsApp registrado.
        </li>
        <li>
          La afiliación tiene una vigencia determinada según el plan contratado y puede renovarse
          antes o después del vencimiento.
        </li>
      </ul>

      <SectionTitle>3. Obligaciones del Usuario</SectionTitle>
      <p>El usuario se compromete a:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Suministrar información veraz, completa y actualizada en los formularios.</li>
        <li>
          Notificar a Contacto Médico cualquier cambio en sus datos de contacto o información
          personal.
        </li>
        <li>
          Utilizar los formularios y el servicio de manera adecuada, sin enviar información falsa,
          engañosa o con fines ilícitos.
        </li>
        <li>
          No ceder ni compartir su carnet de afiliado con personas no registradas como
          beneficiarios.
        </li>
      </ul>

      <SectionTitle>4. Alcance y Limitaciones del Servicio</SectionTitle>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          El servicio de Contacto Médico <strong>facilita el acceso</strong> a una red de
          profesionales de la salud con tarifas preferenciales; no constituye un seguro médico ni
          una póliza de salud.
        </li>
        <li>
          El servicio <strong>no cubre</strong> atención de urgencias hospitalarias, cirugías,
          hospitalizaciones, medicamentos ni procedimientos de alta complejidad, salvo que el plan
          contratado lo especifique expresamente.
        </li>
        <li>
          En caso de emergencia médica, el usuario debe acudir a los servicios de urgencias
          habilitados en el sistema de salud colombiano (EPS, Clínicas de urgencias).
        </li>
        <li>
          Contacto Médico no se hace responsable por el diagnóstico, tratamiento o resultado
          médico derivado de las consultas realizadas a través de la red.
        </li>
      </ul>

      <SectionTitle>5. Vigencia y Renovación</SectionTitle>
      <ul className="list-disc pl-5 space-y-1">
        <li>Cada plan de afiliación tiene una fecha de vencimiento indicada en el carnet.</li>
        <li>
          El usuario puede renovar su afiliación antes del vencimiento para mantener la
          continuidad del servicio.
        </li>
        <li>
          Vencido el plan sin renovación, el acceso a las tarifas preferenciales quedará suspendido
          automáticamente.
        </li>
      </ul>

      <SectionTitle>6. Modificaciones</SectionTitle>
      <p>
        Contacto Médico se reserva el derecho de modificar los presentes Términos y Condiciones en
        cualquier momento. Los cambios serán publicados en este sitio web. El uso continuado del
        servicio después de la publicación de cambios implica la aceptación de los nuevos términos.
      </p>

      <SectionTitle>7. Ley Aplicable y Jurisdicción</SectionTitle>
      <p>
        Los presentes Términos y Condiciones se rigen por las leyes de la República de Colombia.
        Para cualquier controversia derivada de la interpretación o ejecución de estos términos,
        las partes se someten a la jurisdicción de los jueces y tribunales competentes de la ciudad
        de <strong>[CIUDAD]</strong>, Colombia.
      </p>
    </div>
  );
}

export default function LegalModal({ type, onClose }: LegalModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const title = type === 'privacy' ? 'Política de Privacidad y Tratamiento de Datos' : 'Términos y Condiciones';

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#1DBFCE]">
          <h2 className="text-base font-bold text-[#1A1A2E]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4 shrink-0"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {type === 'privacy' ? <PrivacyContent /> : <TermsContent />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#1DBFCE] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Verificar que el archivo existe**

```powershell
Test-Path "src/components/web/LegalModal.tsx"
```
Expected: `True`

---

## Task 2: Integrar `LegalModal` en Contáctenos

**Files:**
- Modify: `src/app/web/contactenos/page.tsx`

- [ ] **Step 1: Agregar el import de `LegalModal`**

En `src/app/web/contactenos/page.tsx`, después de la línea con los imports existentes (alrededor de la línea 10), agregar:

```tsx
import LegalModal from "@/components/web/LegalModal";
```

- [ ] **Step 2: Agregar el estado `legalModal`**

En el bloque de estados (cerca de las líneas 56-57 donde están `privacyAccepted` y `termsAccepted`), agregar después de ellas:

```tsx
const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
```

- [ ] **Step 3: Convertir el span de Política de Privacidad en button**

Buscar este bloque exacto (alrededor de la línea 374):
```tsx
      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
        Política de Privacidad
      </span>
```

Reemplazarlo por:
```tsx
      <button
        type="button"
        onClick={() => setLegalModal('privacy')}
        className="text-[#1DBFCE] font-semibold hover:underline"
      >
        Política de Privacidad
      </button>
```

- [ ] **Step 4: Convertir el span de Términos y Condiciones en button**

Buscar este bloque exacto (alrededor de la línea 408):
```tsx
      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
        Términos y Condiciones
      </span>
```

Reemplazarlo por:
```tsx
      <button
        type="button"
        onClick={() => setLegalModal('terms')}
        className="text-[#1DBFCE] font-semibold hover:underline"
      >
        Términos y Condiciones
      </button>
```

- [ ] **Step 5: Montar el `LegalModal` al final del JSX**

Buscar el cierre `</main>` al final del `return` y agregar el modal justo antes:

```tsx
        {legalModal && (
          <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </main>
```

---

## Task 3: Integrar `LegalModal` en Afiliarse

**Files:**
- Modify: `src/app/web/afiliarse/page.tsx`

Los cuatro pasos son idénticos a los del Task 2 — mismos imports, mismo estado, mismos reemplazos de spans, mismo montaje del modal.

- [ ] **Step 1: Agregar el import de `LegalModal`**

En `src/app/web/afiliarse/page.tsx`, agregar junto a los otros imports:

```tsx
import LegalModal from "@/components/web/LegalModal";
```

- [ ] **Step 2: Agregar el estado `legalModal`**

Cerca de las líneas 61-62 donde están `privacyAccepted` y `termsAccepted`, agregar:

```tsx
const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
```

- [ ] **Step 3: Convertir el span de Política de Privacidad en button**

Buscar (alrededor de la línea 451):
```tsx
      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
        Política de Privacidad
      </span>
```

Reemplazar por:
```tsx
      <button
        type="button"
        onClick={() => setLegalModal('privacy')}
        className="text-[#1DBFCE] font-semibold hover:underline"
      >
        Política de Privacidad
      </button>
```

- [ ] **Step 4: Convertir el span de Términos y Condiciones en button**

Buscar (alrededor de la línea 486):
```tsx
      <span className="text-[#1DBFCE] font-semibold hover:underline cursor-pointer">
        Términos y Condiciones
      </span>
```

Reemplazar por:
```tsx
      <button
        type="button"
        onClick={() => setLegalModal('terms')}
        className="text-[#1DBFCE] font-semibold hover:underline"
      >
        Términos y Condiciones
      </button>
```

- [ ] **Step 5: Montar el `LegalModal` al final del JSX**

Buscar el cierre `</main>` al final del `return` y agregar el modal justo antes:

```tsx
        {legalModal && (
          <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
        )}
      </main>
```

---

## Task 4: Verificación

- [ ] **Step 1: Verificar que el build de TypeScript no tiene errores**

Desde la raíz del frontend (`frontend-cm/`):
```bash
npx tsc --noEmit
```
Expected: sin errores (salida vacía o solo advertencias menores).

- [ ] **Step 2: Verificar visualmente en el navegador**

Levantar el servidor de desarrollo:
```bash
npm run dev
```

Verificar en `http://localhost:3000/web/contactenos`:
- [ ] Hacer clic en "Política de Privacidad" → se abre el modal con el texto correcto
- [ ] Hacer clic en "Términos y Condiciones" → se abre el modal con el texto correcto
- [ ] Hacer clic en el backdrop → el modal se cierra
- [ ] Presionar `Escape` → el modal se cierra
- [ ] Hacer clic en "Entendido" → el modal se cierra
- [ ] Hacer clic en ✕ → el modal se cierra
- [ ] El scroll del body se bloquea mientras el modal está abierto

Repetir los mismos pasos en `http://localhost:3000/web/afiliarse`.

---

## Notas post-implementación

Antes de salir a producción, reemplazar los marcadores de posición en `LegalModal.tsx`:
- `[RAZÓN SOCIAL]` → nombre legal de la empresa
- `[NIT]` → NIT con dígito de verificación
- `[CORREO DATOS]` → correo para solicitudes de datos personales
- `[CIUDAD]` → ciudad del domicilio principal