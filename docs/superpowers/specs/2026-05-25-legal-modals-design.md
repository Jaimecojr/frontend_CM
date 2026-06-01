# Diseño: Modales de Política de Privacidad y Términos y Condiciones

**Fecha:** 2026-05-25
**Estado:** Aprobado

---

## 1. Objetivo

Mostrar la Política de Privacidad y los Términos y Condiciones en un modal al hacer clic en sus respectivos enlaces dentro de los formularios públicos de Contáctenos y Afiliarse. Los textos están hardcodeados en el frontend y cumplen con la Ley 1581 de 2012 (Colombia).

---

## 2. Arquitectura

### Componente nuevo
- `src/components/web/LegalModal.tsx`
  - Props: `type: 'privacy' | 'terms'`, `onClose: () => void`
  - Renderiza via React Portal en `document.body`
  - Contiene internamente los textos de ambos documentos
  - Cierra con: clic en backdrop, clic en botón ✕, clic en "Entendido", tecla Escape

### Archivos modificados
- `src/app/web/contactenos/page.tsx` — agregar `useState<'privacy' | 'terms' | null>(null)` y montar `<LegalModal>`
- `src/app/web/afiliarse/page.tsx` — ídem

---

## 3. Diseño visual del modal

- **Backdrop:** overlay `fixed inset-0 bg-black/50 z-50`, clic cierra
- **Contenedor:** `bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4`, centrado con flexbox
- **Header:** barra con acento teal (`#1DBFCE`), título a la izquierda, botón ✕ a la derecha
- **Cuerpo:** `max-h-[70vh] overflow-y-auto px-6 py-4`, texto `text-sm leading-relaxed text-gray-700`
  - Títulos de sección en teal, listas con indentación estándar
- **Footer:** botón "Entendido" alineado a la derecha, fondo teal, cierra el modal
- **Transición:** `transition-opacity duration-200`

---

## 4. Integración en formularios

En `contactenos/page.tsx` y `afiliarse/page.tsx`:

```tsx
const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

// Los spans existentes se convierten en:
<button type="button" onClick={() => setLegalModal('privacy')} className="underline text-[#1DBFCE] hover:opacity-80">
  Política de Privacidad
</button>

<button type="button" onClick={() => setLegalModal('terms')} className="underline text-[#1DBFCE] hover:opacity-80">
  Términos y Condiciones
</button>

// Al final del JSX:
{legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
```

No se toca: validación, reCAPTCHA, lógica de envío, ni estructura de los formularios.

---

## 5. Contenido — Política de Privacidad

> **Marcadores de posición:** `[RAZÓN SOCIAL]`, `[NIT]`, `[CORREO DATOS]`, `[CIUDAD]`

---

### POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS PERSONALES

**[RAZÓN SOCIAL]** (en adelante "Contacto Médico"), identificada con NIT **[NIT]**, con domicilio en **[CIUDAD]**, Colombia, en cumplimiento de la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, informa a sus usuarios la presente Política de Privacidad y Tratamiento de Datos Personales.

#### 1. Responsable del Tratamiento

| Campo | Dato |
|---|---|
| Razón Social | [RAZÓN SOCIAL] |
| NIT | [NIT] |
| Domicilio | [CIUDAD], Colombia |
| Correo de contacto | [CORREO DATOS] |

#### 2. Datos Personales que Recopilamos

**Al diligenciar el formulario de afiliación:**
- Nombre y apellidos
- Número de cédula de ciudadanía
- Número de celular (10 dígitos)
- Correo electrónico
- Fecha de nacimiento
- Dirección de residencia
- Departamento y ciudad
- Nombre de beneficiarios (cuando aplica)

**Al diligenciar el formulario de contacto:**
- Nombre y apellidos
- Número de celular
- Correo electrónico
- Departamento y ciudad
- Mensaje o consulta

#### 3. Finalidad del Tratamiento

Los datos personales recopilados se utilizan para:

- Procesar y gestionar su solicitud de afiliación al plan de salud.
- Crear su perfil de usuario en el sistema y generar su carnet digital.
- Enviar el carnet de afiliado al número de WhatsApp registrado.
- Facilitar el acceso a la red de médicos e IPS inscritas en Contacto Médico.
- Responder las consultas enviadas a través del formulario de contacto.
- Enviar comunicaciones relacionadas con el estado de su afiliación, vencimientos y renovaciones.
- Cumplir con obligaciones legales y contractuales.

#### 4. Derechos del Titular

En virtud de la Ley 1581 de 2012, usted como titular de los datos personales tiene derecho a:

- **Conocer** los datos personales que Contacto Médico tiene sobre usted.
- **Actualizar y rectificar** sus datos cuando sean inexactos, incompletos o desactualizados.
- **Solicitar la supresión** de sus datos cuando no exista obligación legal o contractual de conservarlos.
- **Revocar la autorización** otorgada para el tratamiento de sus datos.
- **Presentar quejas** ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la normativa de protección de datos.

Para ejercer estos derechos, escríbanos a **[CORREO DATOS]** indicando su nombre completo, número de documento y la solicitud específica. Daremos respuesta en un plazo máximo de **10 días hábiles**.

#### 5. Seguridad y Confidencialidad

Implementamos medidas técnicas y administrativas para proteger sus datos personales contra accesos no autorizados, pérdida, alteración o divulgación indebida. No compartimos su información personal con terceros, salvo:

- Cuando sea necesario para la prestación del servicio (médicos e IPS de la red).
- Por obligación legal o requerimiento de autoridad competente.

#### 6. Vigencia

Sus datos personales serán conservados durante el tiempo que dure la relación contractual de afiliación y el período adicional exigido por la ley para efectos de auditoría y cumplimiento legal.

---

## 6. Contenido — Términos y Condiciones

> **Marcadores de posición:** `[RAZÓN SOCIAL]`, `[NIT]`, `[CIUDAD]`

---

### TÉRMINOS Y CONDICIONES DE USO

Al diligenciar cualquiera de los formularios disponibles en este sitio web, el usuario declara haber leído y aceptado los presentes Términos y Condiciones establecidos por **[RAZÓN SOCIAL]** (en adelante "Contacto Médico"), NIT **[NIT]**.

#### 1. Descripción del Servicio

Contacto Médico es una empresa colombiana que ofrece planes de salud complementaria que brindan acceso a una red de médicos generales, especialistas e IPS aliadas con tarifas preferenciales. Al afiliarse, el usuario recibe un carnet digital enviado a su WhatsApp que lo acredita como beneficiario de los descuentos y servicios de la red.

#### 2. Proceso de Afiliación

- El usuario diligencia el formulario de afiliación con información veraz y completa.
- Contacto Médico revisa la solicitud y, una vez procesada, activa el plan y envía el carnet digital al número de WhatsApp registrado.
- La afiliación tiene una vigencia determinada según el plan contratado y puede renovarse antes o después del vencimiento.

#### 3. Obligaciones del Usuario

El usuario se compromete a:

- Suministrar información veraz, completa y actualizada en los formularios.
- Notificar a Contacto Médico cualquier cambio en sus datos de contacto o información personal.
- Utilizar los formularios y el servicio de manera adecuada, sin enviar información falsa, engañosa o con fines ilícitos.
- No ceder ni compartir su carnet de afiliado con personas no registradas como beneficiarios.

#### 4. Alcance y Limitaciones del Servicio

- El servicio de Contacto Médico **facilita el acceso** a una red de profesionales de la salud con tarifas preferenciales; no constituye un seguro médico ni una póliza de salud.
- El servicio **no cubre** atención de urgencias hospitalarias, cirugías, hospitalizaciones, medicamentos ni procedimientos de alta complejidad, salvo que el plan contratado lo especifique expresamente.
- En caso de emergencia médica, el usuario debe acudir a los servicios de urgencias habilitados en el sistema de salud colombiano (EPS, Clínicas de urgencias).
- Contacto Médico no se hace responsable por el diagnóstico, tratamiento o resultado médico derivado de las consultas realizadas a través de la red.

#### 5. Vigencia y Renovación

- Cada plan de afiliación tiene una fecha de vencimiento indicada en el carnet.
- El usuario puede renovar su afiliación antes del vencimiento para mantener la continuidad del servicio.
- Vencido el plan sin renovación, el acceso a las tarifas preferenciales quedará suspendido automáticamente.

#### 6. Modificaciones

Contacto Médico se reserva el derecho de modificar los presentes Términos y Condiciones en cualquier momento. Los cambios serán publicados en este sitio web. El uso continuado del servicio después de la publicación de cambios implica la aceptación de los nuevos términos.

#### 7. Ley Aplicable y Jurisdicción

Los presentes Términos y Condiciones se rigen por las leyes de la República de Colombia. Para cualquier controversia derivada de la interpretación o ejecución de estos términos, las partes se someten a la jurisdicción de los jueces y tribunales competentes de la ciudad de **[CIUDAD]**, Colombia.

---

## 7. Notas de implementación

- Los marcadores `[RAZÓN SOCIAL]`, `[NIT]`, `[CORREO DATOS]` y `[CIUDAD]` deben reemplazarse antes de salir a producción.
- El componente `LegalModal.tsx` sigue el patrón de `NoteModal.tsx` (React Portal + `document.body`).
- Usar `useEffect` para agregar/remover el listener de `Escape` y para bloquear el scroll del body mientras el modal está abierto (`document.body.style.overflow = 'hidden'`).