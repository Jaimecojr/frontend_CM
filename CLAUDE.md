# Contacto Médico - Frontend (Next.js)

Este archivo contiene el contexto y convenciones clave del proyecto Frontend para agentes de IA. Por favor, lee esto antes de crear nuevos componentes o modificar lógica existente.

## Stack Técnico
- **Framework:** Next.js 14+ (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** TailwindCSS
- **Componentes UI:** Componentes personalizados base ubicados en `@/components/ui-elements/`.
- **Tablas:** Componente global en `@/components/data-table/DataTable`.

## Arquitectura de Módulos del Panel Admin
Los módulos internos y protegidos están en la ruta `/4dnn1n/`. Cada módulo sigue esta estructura de archivos:
- `page.tsx`: Renderiza la vista principal con la tabla de listado.
- `fetch.ts`: Centraliza las funciones de llamadas a la API (obtener, crear, editar, eliminar).
- `_components/columns.tsx`: Definición de las columnas de la tabla (usando React Table / DataTable).
- `_components/XxxForm.tsx`: Componente de formulario compartido para creación y edición.
- `new/page.tsx`: Vista de creación de un nuevo registro.
- `[id]/page.tsx`: Vista de detalle (solo lectura) de un registro existente, usando `ShowcaseSection`.
- `[id]/edit/page.tsx`: Vista de edición de un registro existente.

## Arquitectura Web Pública
Las rutas públicas de la página de aterrizaje e informativas se encuentran en la ruta `/web/`.
- `src/app/web/layout.tsx`: Layout específico para la web que incluye el Navbar, el Footer y la importación de fuentes (ej. Material Symbols).
- `src/app/web/page.tsx`: Página principal que ensambla las secciones mediante componentes modulares.
- **Componentes Modulares:** Se ubican en `src/components/web/` (ej. `HeroSection.tsx`, `Navbar.tsx`, `Footer.tsx`). Deben usar colores quemados o variables CSS específicas del manual de marca en el HTML (ej. `bg-[#E8192C]`), de forma independiente a la paleta administrativa.
- **Servicios Públicos:** Las integraciones con APIs sin autenticación (como consultas rápidas de estado para el afiliado) deben residir en `src/services/` (ej. `affiliateService.ts`).
- **Fetch público vs. autenticado:** Las páginas del sitio web (`/web`) usan `publicFetch` (sin credenciales), que llama a los endpoints `/api/public/*` del backend. **Nunca usar `apiFetch`** (que envía cookies de Sanctum) en páginas públicas — rompería para usuarios no autenticados. El patrón base es:
  ```ts
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  async function publicFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  }
  ```
- **Navbar activo:** `Navbar.tsx` es un Client Component (`"use client"`) que usa `usePathname()` para resaltar el link de la ruta actual. Al agregar nuevas rutas públicas, añadir la condición correspondiente en el className de su `<Link>`.
- **Cache en Server Components públicos:** Los componentes de la web pública que hacen `fetch` a `/api/public/*` usan `cache: "no-store"` en desarrollo para evitar datos obsoletos. **Para producción, reemplazar por `next: { revalidate: 3600 }`** — así la sección se refresca cada hora sin hacer un fetch en cada visita. Afecta a `AlliesSection.tsx` y `DoctorsSection.tsx` (y cualquier otro componente público async que agregues).

## Sistema de Caché en Memoria (`memCache`)

**Archivo:** `src/lib/memCache.ts`

Caché en memoria con TTL implementado como un `Map` singleton de módulo. Todas las importaciones desde cualquier archivo comparten la **misma tienda**, por lo que si `affiliates/fetch.ts` y `counselors/fetch.ts` ambos llaman a `getDepartments()`, la segunda llamada siempre hit el caché sin importar cuál archivo lo llamó primero.

### TTLs disponibles

| Constante | Valor | Para qué datos |
|---|---|---|
| `TTL_GEO` | 30 min | Departamentos y ciudades — nunca cambian en el sistema |
| `TTL_CATALOG` | 5 min | Catálogos operativos: especialidades, convenios, asesores, franquicias |
| `TTL_LIST` | 2 min | Listas paginadas: afiliados, médicos, citas |

Cuando el TTL expira, la próxima llamada hace fetch al servidor de forma transparente y renueva la entrada. No hay error ni efecto negativo para el usuario.

### Regla obligatoria: todo fetch de catálogo o lista usa `memCache`

**Catálogos (TTL_CATALOG o TTL_GEO):**
```ts
import { memCache, TTL_CATALOG, TTL_GEO } from "@/lib/memCache";

export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}
```

**Listas paginadas (TTL_LIST) — la clave incluye todos los parámetros:**
```ts
import { memCache, TTL_LIST } from "@/lib/memCache";

export async function getAffiliates(params?: { stade?: string; search?: string; page?: number }): Promise<AffiliatesResponse> {
  const qs = new URLSearchParams();
  // ... construir qs con params ...
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return memCache.get(`affiliates:list:${query}`, TTL_LIST, async () => {
    const res = await apiFetch<...>(`/api/affiliates${query}`);
    return { data: res.data ?? [], meta: res.meta };
  });
}
```

### Regla obligatoria: toda mutación invalida el caché afectado

Después de cualquier operación que modifica datos (crear, actualizar, eliminar, cambiar estado), llamar `memCache.invalidatePrefix(prefix)` **antes del `return`**:

```ts
export async function createAffiliate(payload: CreateAffiliatePayload) {
  await csrf();
  const result = apiFetch<ApiResponse<ApiAffiliate>>("/api/affiliates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("affiliates:list:"); // invalida todas las páginas/filtros
  return result;
}
```

### Convención de nombres de claves

| Prefijo | Datos | Invalidar con |
|---|---|---|
| `departments` | lista de departamentos | (nunca — TTL_GEO es suficiente) |
| `cities:{id}` | ciudades por departamento | (nunca — TTL_GEO es suficiente) |
| `affiliates:list:` | lista paginada de afiliados | `invalidatePrefix("affiliates:list:")` |
| `counselors:all` | todos los asesores | `invalidatePrefix("counselors:")` |
| `counselors:active` | asesores activos (selector) | `invalidatePrefix("counselors:")` |
| `agreements:all` | todos los convenios | `invalidatePrefix("agreements:")` |
| `agreements:active` | convenios activos (selector) | `invalidatePrefix("agreements:")` |
| `franchises:active` | franquicias activas (selector) | (TTL_CATALOG es suficiente — no hay módulo de edición) |
| `specialties:all` | todas las especialidades | `invalidatePrefix("specialties:")` |
| `specialties:active` | especialidades activas (selector) | `invalidatePrefix("specialties:")` |
| `doctors:list:` | lista paginada de médicos | `invalidatePrefix("doctors:list:")` |
| `doctors:specialty:{id}` | médicos por especialidad (selector de citas) | `invalidatePrefix("doctors:specialty:")` |
| `appointments:list:` | lista paginada de citas | `invalidatePrefix("appointments:list:")` |
| `membership-forms:list:` | solicitudes de afiliación pendientes | `invalidatePrefix("membership-forms:list:")` |
| `contacts:list:` | mensajes de contacto paginados | `invalidatePrefix("contacts:list:")` |
| `content-allies:all` | aliados estratégicos (panel admin) | `invalidatePrefix("content-allies:")` |
| `content-specialists:all` | especialistas de la salud (panel admin) | `invalidatePrefix("content-specialists:")` |

### Al crear un nuevo módulo

1. **Catálogo pequeño (sin paginación):** cachear con `TTL_CATALOG` en `getXxx()` y `invalidatePrefix("xxx:")` en create/update/delete.
2. **Módulo grande (paginado):** cachear con `TTL_LIST` usando `xxx:list:${query}` como clave e `invalidatePrefix("xxx:list:")` en create/update/delete.
3. **Selectores que usa este módulo en su formulario** (departamentos, ciudades, etc.): ya están cacheados vía el singleton compartido — no hay que hacer nada extra si se importan de un fetch.ts existente.

## Manejo de Tablas y Datos (Hooks)

### 1. Tablas Pequeñas (`useClientTable`)
Se usa para catálogos con pocos registros (asesores, convenios, franquicias).
- Carga todos los datos en la carga inicial; la búsqueda y los filtros ocurren de manera instantánea en memoria (cliente).
- Al `<DataTable>` se le deben pasar props especiales para manejar filtros locales: `getSearchText` y `getStateValue`.

### 2. Tablas Grandes (`useServerTable`)
Se usa para módulos pesados con miles de registros (ej. afiliados).
- Delega la paginación, filtros y búsquedas directamente al backend (API).
- Se hace destructuring de `tableProps` retornadas por el hook hacia el `<DataTable>`.
- **Regla Crítica del DataTable:** Al pasar opciones en `stateFilterOptions`, **NUNCA** incluyas manualmente una opción "Todos" o "all". El componente interno `DataTableToolbar` la agrega automáticamente.
- **Ocultar buscador:** El `DataTable` acepta el prop `hideSearch` (boolean, por defecto `false`). Úsalo en módulos donde la búsqueda no aplica (ej. solicitudes de afiliación). Ejemplo: `<DataTable hideSearch ... />`.

#### `isInitialLoad` — overlay solo en la carga inicial
El hook expone `isInitialLoad: boolean` (empieza en `true`, pasa a `false` tras el primer fetch). Úsalo para que el `LoadingOverlay` de pantalla completa solo aparezca al entrar al módulo, no en cada cambio de filtro. Para cambios de filtro es suficiente el skeleton de la tabla.

```tsx
const { tableProps, isInitialLoad } = useServerTable(fetchFn, options);

// Correcto: overlay solo en la carga inicial
<LoadingOverlay isLoading={tableProps.loading && isInitialLoad} />

// Incorrecto: overlay en CADA cambio de filtro (genera UX intrusiva)
<LoadingOverlay isLoading={tableProps.loading} />
```

## Convenciones de Estado de Registros
- **Afiliados:** Usa la propiedad `stade` (1 = Activo, 2 = Inactivo).
- **Asesores, Franquicias, Médicos:** Usa la propiedad `state` (1 = Activo, 2 = Inactivo).
- **Convenios, Especialidades:** Usa la propiedad `state` (1 = Activo, 0 = Inactivo).
- **Solicitudes de afiliación (`membership_forms`):** Usa la propiedad `state` (0 = Pendiente, 1 = Convertido). El panel admin solo muestra las pendientes (`state = 0`); al crear el afiliado se llama `markMembershipFormConverted()` que pasa a `state = 1` y la saca de la lista.

## Componentes de Formulario Reutilizables

### `SearchableSelect` — Select con búsqueda integrada
**Ubicación:** `@/components/FormElements/SearchableSelect`

Reemplaza todos los `<select>` nativos en los formularios del panel admin. Permite al usuario escribir para filtrar las opciones y seleccionar con click. Se adapta automáticamente al modo vista (`disabled`).

**Cuándo usarlo:** siempre que un campo de formulario sea un select dinámico (cargado desde API) o estático con más de ~3 opciones.

**API del componente:**
```tsx
<SearchableSelect
  options={items.map((i) => ({ value: i.id, label: i.name }))}
  value={form.field_id}
  onChange={(v) => setForm((p) => ({ ...p, field_id: v }))}
  disabled={isView}                       // modo solo lectura
  placeholder="Seleccionar…"             // texto cuando no hay selección
  disabledPlaceholder={initial?.rel?.name || ""} // label cuando el valor viene de relación anidada del API
  className="mt-1"
/>
```

**Prop `disabledPlaceholder`:** úsala cuando el label del valor actual no está en `options` sino en un objeto anidado del API (ej. `initial.city.name`, `initial.specialty.name`). Evita mostrar el campo vacío en modo vista.

**Selects dependientes (ej. Departamento → Ciudad):**
- Al campo dependiente (Ciudad) pásale `disabled={isView || !departmentId}`.
- Usa `placeholder` dinámico para guiar al usuario: `placeholder={departmentId ? "Seleccionar…" : "Selecciona un departamento"}`.

**Ejemplo completo con dependencia:**
```tsx
<SearchableSelect
  className="mt-1"
  disabled={isView}
  options={departments.map((d) => ({ value: d.id, label: d.name }))}
  value={departmentId}
  onChange={(v) => setDepartmentId(v ? Number(v) : "")}
/>

<SearchableSelect
  className="mt-1"
  disabled={isView || !departmentId}
  options={cities.map((c) => ({ value: c.id, label: c.name }))}
  value={form.city_id}
  onChange={(v) => setForm((p) => ({ ...p, city_id: v }))}
  placeholder={departmentId ? "Seleccionar…" : "Selecciona un departamento"}
  disabledPlaceholder={initial?.city?.name || ""}
/>
```

**Nota:** El campo **Asesor** en `AffiliateForm` tiene su propio combobox personalizado con lógica adicional (validación de selección forzada) y **no** usa `SearchableSelect`.

### `DatePickerWithToday` — Selector de fecha con botón "Hoy"
**Ubicación:** `@/components/FormElements/DatePicker/DatePickerWithToday`

Reemplaza **todos** los `<input type="date">` editables del sistema. Usa flatpickr con locale español e inyecta un botón "Hoy" dentro del calendario para seleccionar la fecha actual con un clic.

**Cuándo usarlo:** siempre que un formulario (panel admin o web pública) tenga un campo de fecha editable. Los únicos `<input type="date">` que pueden permanecer nativos son los que están siempre `disabled` y son calculados automáticamente (ej. fecha final de vigencia, fecha final de renovación).

**API del componente:**
```tsx
<DatePickerWithToday
  value={form.date}              // string "YYYY-MM-DD" o ""
  onChange={(date) => setForm((p) => ({ ...p, date }))}  // recibe "YYYY-MM-DD"
  disabled={isView}              // opcional — modo solo lectura (no abre el calendario)
  placeholder="dd/mm/aaaa"       // opcional
  className=""                   // opcional — clases adicionales para tamaño o bordes
/>
```

- El valor interno siempre viaja como `YYYY-MM-DD` (compatible con la API).
- La visualización al usuario es `dd/mm/YYYY` en español (locale `es`).
- Cuando `disabled=true`, renderiza un input de solo lectura con la fecha formateada en `dd/mm/YYYY`.
- Cuando el valor se limpia desde el padre (`value=""`), el calendario se limpia automáticamente.

**Módulos donde ya está aplicado:**
- Citas: fecha de la cita (crear y editar)
- Afiliados: fecha de nacimiento, fecha inicial de vigencia, fecha de inicio de renovación, fecha venta
- Asesores: fecha de ingreso
- Franquicias: fecha de creación
- Lista de citas: filtro por fecha exacta
- Registro público (`/web/afiliarse`): fecha de nacimiento

## LoadingOverlay — Pantalla de carga del panel admin

**Componente:** `@/components/LoadingOverlay`

Overlay de pantalla completa con logo animado y puntos de carga. Solo para el panel `/4dnn1n`, nunca para la web pública.

**Decisiones de implementación importantes:**
- Usa `createPortal(…, document.body)` porque el `<main>` del auth-layout tiene `class="isolate"`, lo que crea un stacking context que atraparía el `z-index` e impediría cubrir el header. El portal bypasea este problema renderizando fuera del árbol DOM.
- Usa `useState(mounted)` + `useEffect` para compatibilidad SSR (portals son solo cliente).
- El texto del `message` va **sin puntos finales** — el componente agrega tres puntos animados automáticamente.
- Theme-aware: fondo blanco en light mode, `#020d1a` en dark mode. Logo usa `<LogoIcon>` de `@/components/logo`.

**Uso:**
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
// En el JSX (primer hijo del fragmento):
<LoadingOverlay isLoading={loading} message="Cargando" />
```

**Dónde se usa:**
- `auth-layout.tsx`: `message="Validando sesión"` y `message="Cerrando sesión"`
- `Auth/SigninWithPassword.tsx`: `message="Iniciando sesión"` — el `loading` NO se resetea en éxito para que el overlay persista durante la navegación; solo se resetea en el `catch`.
- Módulos con `useServerTable` (afiliados, médicos, citas): `isLoading={tableProps.loading && isInitialLoad}`
- Módulos con `useClientTable` (asesores, convenios, franquicias): `isLoading={loading}`

**Dashboard (`/4dnn1n/home`) — NO usar overlay:**
El dashboard mezcla streaming SSR (Suspense) con client components con `useEffect`. Ningún overlay puede esperar a que todos terminen sin bloquear la arquitectura. Cada widget tiene su propio skeleton — ese es el patrón correcto. No crear `loading.tsx` en esa carpeta.

## Módulo de Citas (`appointments`)

### Restricciones de editar/eliminar
Las acciones de editar y eliminar requieren que se cumplan **dos condiciones simultáneas**:
1. El usuario tiene acceso (`hasAccess = user?.type === 1 || user?.type === 2`)
2. La cita aún no ha pasado (`!isPast`)

```tsx
const apptDate = new Date(c.date + "T00:00:00");  // T00:00:00 evita desfase de timezone
const today = new Date();
today.setHours(0, 0, 0, 0);
const isPast = apptDate < today;
```

El `+ "T00:00:00"` es obligatorio: sin él, `new Date("2025-05-14")` se interpreta como medianoche UTC y puede quedar un día atrás en zonas horarias negativas (ej. Colombia, UTC-5).

### Notificación WhatsApp al crear/editar
El endpoint de crear y editar citas retorna una clave `whatsapp` adicional en el JSON: `{ enviado: true }` o `{ enviado: false, detalle: "..." }`. El frontend puede mostrar este resultado como feedback extra, pero la operación principal (guardado de la cita) siempre fue exitosa si el status HTTP es 200/201.

### Ciudad en formulario (read-only)
En los formularios de cita (crear y editar), la ciudad **no es un selector editable** — se muestra como texto de solo lectura derivado del médico seleccionado. El `city_id` se pasa en el payload tomándolo del médico, no del usuario.

### `useServerTable` con `extraParams` dinámicos
Cuando se usan `extraParams` para filtros adicionales (período, fecha), el hook resuelve automáticamente:
- Resetea la página a 1 cuando cambia `extraParams`
- Activa el skeleton de carga (mismo que en la carga inicial)

No hace falta ningún manejo manual desde el padre para estos casos.

## Patrones y Buenas Prácticas
1. **Optimistic UI:** Para acciones como el cambio rápido de estado (toggle activo/inactivo) desde la tabla, aplica un patrón de "Optimistic UI":
   - Actualiza el estado local (`setData`) inmediatamente.
   - Envía la petición a la API.
   - Si la API falla, revierte el estado a su valor anterior y muestra una alerta (`alert.error()`).
2. **Desmontaje de Componentes:** En los `useEffect` que realizan llamadas asíncronas, usa un flag `cancelled` para evitar intentar actualizar estados de React si el componente ya se desmontó.
3. **Notificaciones y UI:** Usa el helper `@/lib/alert` y `@/lib/getApiErrorMessage` para mostrar resultados de acciones al usuario.
4. **Idioma:** El código en sí —comentarios, nombres de funciones/hooks/componentes, variables— debe estar en **inglés**, siguiendo la convención estándar de desarrollo (esto revierte la regla anterior de este documento; mismo criterio ya adoptado en el backend, ver `CLAUDE.md` de `api-cm`). Todo el texto de la interfaz que ve el usuario final —labels, placeholders, tooltips, mensajes de `alert()`— sigue en **español**, porque el panel es para asesores/franquicias colombianas. Los comentarios de código no deben referenciar `CLAUDE.md` ni otros documentos internos por nombre; deben ser autocontenidos y explicar el WHY directamente.

## Validaciones de Formulario (Campos Comunes)
Al crear o modificar un formulario con los siguientes campos, aplica siempre estas reglas:

### Teléfono(s) (`phone`)
- Permite dígitos, espacios y guiones (`-`) para soportar múltiples números en un solo campo.
- Función helper: `function formatPhone(v: string) { return v.replace(/[^\d\s\-]/g, ""); }`
- Aplicar en `onChange`: `setForm(p => ({ ...p, phone: formatPhone(e.target.value) }))`
- Placeholder sugerido: `"Ej: 6017654321 - 6017654322"`

### Celular (`movil`)
- Solo dígitos, exactamente 10 caracteres.
- Función helper: `onlyDigits` + `.slice(0, 10)` + `maxLength={10}` + `inputMode="numeric"`.
- Mostrar error en rojo debajo del campo si está diligenciado y `form.movil.length !== 10`.
- Bloquear el botón Guardar (`canSubmit`) si el campo tiene contenido y no cumple los 10 dígitos.
- Placeholder sugerido: `"Ej: 3001234567"`

### Valor / Valor Convenio (`amount`, `value_agreement`)
- Solo dígitos (`onlyDigits`), valor mínimo **10.000**.
- Mostrar error en rojo debajo del campo si el valor ingresado es menor a 10000.
- Bloquear el botón Guardar (`canSubmit`) mientras no se cumpla el mínimo.
- Placeholder sugerido: `"Ej: 150000"`

### Patrón visual de error
```tsx
<input className={`mt-1 w-full rounded-lg border px-3 py-2 ${error ? "border-red-500 focus:outline-red-500" : ""}`} />
{error && <p className="mt-1 text-xs text-red-500">{error}</p>}
```

## Dashboard — Widgets con datos reales de la API

### Regla crítica: Client Components para datos autenticados
Los componentes del dashboard (`src/app/4dnn1n/home/_components/`) que consumen la API real **deben ser Client Components** (`"use client"`). El motivo es que la autenticación usa cookies de Sanctum que solo existen en el browser — un Server Component async no tiene acceso a esas cookies.

**Patrón correcto para un widget del dashboard:**
```tsx
"use client";
import { useEffect, useState } from "react";
import { getExpiringToday } from "../../affiliates/fetch";

export function MiWidget() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMisDatos().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  return <div>...</div>;
}
```

### Design tokens del panel — obligatorios en todos los widgets
Todos los componentes del dashboard deben usar los mismos tokens que el resto del panel. Usar `rounded-xl border bg-card` o similares es incorrecto — los estilos no van a concordar.

| Elemento | Clases |
|---|---|
| Card container | `rounded-[10px] bg-white px-7.5 py-6 shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Card container (sin padding especial) | `rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card` |
| Título de card | `text-xl font-bold text-dark dark:text-white` |
| Texto primario | `text-dark dark:text-white` |
| Texto secundario | `text-dark-5 dark:text-dark-6` |
| Fila de lista | `border-b border-stroke py-3.5 dark:border-dark-3 last:border-b-0` |
| Botón icono hover | `rounded-full p-1.5 hover:bg-gray-2 dark:hover:bg-dark-2` |

### ApexCharts — integración con el panel
ApexCharts requiere configuración específica para no romper el modo oscuro ni el fondo del card:

```tsx
// SIEMPRE incluir background: 'transparent' en el objeto chart
const options: ApexOptions = {
  chart: {
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',  // obligatorio — sin esto el chart tiene fondo blanco
  },
  // Para que el chart llene los bordes del card, usar márgenes negativos:
};

// Envolver en div con margen negativo para que el chart toque los bordes
<div className="-ml-3.5">
  <ReactApexChart ... />
</div>
// o para charts que necesitan ajuste derecho también:
<div className="-ml-4 -mr-5">
  <ReactApexChart ... />
</div>
```

**SSR:** ApexCharts usa `window` — importar siempre con dynamic:
```tsx
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });
```

### Auto-scroll en listas del dashboard
Para listas largas (> 5 items) usar scroll automático top→bottom con pausa en hover/touch:
```tsx
const containerRef = useRef<HTMLDivElement>(null);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

const startScroll = () => {
  const el = containerRef.current;
  if (!el || items.length <= 5) return;
  intervalRef.current = setInterval(() => {
    el.scrollTop += 1;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight) el.scrollTop = 0;
  }, 40);
};
const stopScroll = () => {
  if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
};

// En el div contenedor:
<div ref={containerRef} className="overflow-y-auto max-h-[280px]"
  onMouseEnter={stopScroll} onMouseLeave={startScroll}
  onTouchStart={stopScroll} onTouchEnd={startScroll}>
```

### Widget: Contratos que vencen hoy
- **Archivo:** `src/app/4dnn1n/home/_components/expiring-today-card.tsx`
- **Fuente de datos:** `GET /api/affiliates/expiring-today` vía `getExpiringToday()` en `affiliates/fetch.ts`
- Muestra afiliados con `validity_end = hoy` y `stade = 1` (activos que vencen hoy).
- Muestra `movil` y `phone` (filtrados con `.filter(Boolean).join(' · ')`).
- Botón de renovación (`RefreshCw`) → `/4dnn1n/affiliates/{id}/edit`.
- Auto-scroll cuando hay más de 5 registros.
- Skeleton: `ExpiringTodayCardSkeleton`.

### Widget: Citas pendientes del día
- **Archivo:** `src/app/4dnn1n/home/_components/today-appointments-card.tsx`
- **Fuente de datos:** `GET /api/appointments/today` vía `getTodayAppointments()` en `home/fetch.ts`
- Muestra nombre del paciente, hora y nombre del médico.
- Botón `Eye` → `/4dnn1n/appointments/{id}`.
- Auto-scroll cuando hay más de 5 registros.
- Skeleton: `TodayAppointmentsCardSkeleton`.

### Widget: Métricas globales (solo super admin)
- **Archivo:** `src/app/4dnn1n/home/_components/stats-cards.tsx`
- **Fuente de datos:** `GET /api/dashboard/stats` vía `getDashboardStats()` en `home/fetch.ts`
- Solo se renderiza si `user?.type === 1` (retorna `null` para otros roles).
- Grid 3 columnas: afiliados activos (verde), inactivos (naranja), citas este mes (azul).
- Skeleton: `StatsCardsSkeleton`.

### Widget: Gráficas mensuales
- **Archivo:** `src/app/4dnn1n/home/_components/charts-section.tsx`
- **Fuente de datos:** `GET /api/dashboard/charts?year=YYYY` vía `getDashboardCharts(year)` en `home/fetch.ts`
- 4 gráficas: citas por mes (barra), afiliados nuevos por mes (área), citas por franquicia (líneas), afiliados por franquicia (barras agrupadas).
- Las 2 gráficas de franquicia solo se renderizan si `user?.type === 1`.
- Selector de año compartido para todas las gráficas.
- `setLoading(false)` siempre en `.finally()` para no dejar el spinner colgado en caso de error.

## Lógica de Estado de Afiliados (stade)

El campo `stade` del afiliado **no debe modificarse arbitrariamente** al editar. Las reglas son:

| Acción | `stade` en payload |
|---|---|
| Crear afiliado nuevo | `1` (siempre — hardcodeado en `AffiliateForm`) |
| Editar sin renovar | no se incluye → el backend preserva el valor actual |
| Editar con renovación | `1` → se agrega en `handleUpdate` del edit page |
| Toggle manual desde la tabla | el valor opuesto al actual — **solo super admin (`type === 1`)** |
| Cron nocturno del backend | `2` → inactiva automáticamente los vencidos |

En `AffiliateForm.tsx`, el `stade: 1` usa `...(isCreate && { stade: 1 })` para aplicarse solo en modo creación.
En `[id]/edit/page.tsx`, `payload.stade = 1` se agrega explícitamente solo cuando `renovationData` existe.

### Regla de acceso para el toggle manual de stade
El botón/acción de activar o inactivar un afiliado manualmente desde la tabla **solo debe mostrarse al super admin (`user?.type === 1`)**. Los asesores y otros roles no deben poder cambiar el estado directamente — el flujo correcto es siempre a través de una renovación. Esto evita cambios accidentales o indebidos en el estado de los afiliados.

## Cliente API (`src/lib/api.ts` y `home/fetch.ts`)

Ambos archivos implementan `csrf()` y `apiFetch()` de forma independiente (duplicado intencional — no unificar salvo que se decida refactorizar explícitamente).

- **`csrf()` es idempotente:** cachea la promesa de la petición a `/sanctum/csrf-cookie` a nivel de módulo. Aunque cada mutación de cada `fetch.ts` siga llamando `await csrf()` antes de crear/editar/eliminar (patrón establecido en todos los módulos), solo se dispara **una petición de red real por sesión del navegador** — las llamadas siguientes reutilizan la misma promesa. No quitar esas llamadas a `csrf()` de los módulos pensando que son redundantes: siguen siendo necesarias como red de seguridad, simplemente ya no cuestan una petición de red extra cada vez.
- **Reintento automático en 419:** si el backend responde `419` (token CSRF vencido o inválido), `apiFetch` invalida la cookie cacheada, pide una nueva y reintenta la petición original una vez, de forma transparente para quien la llama.
- **`Content-Type` solo en peticiones con body:** los `GET`/`HEAD` no lo envían, para que el navegador los trate como "simple request" y no disparen un preflight `OPTIONS` innecesario (ver `max_age` en el CLAUDE.md del backend). Si agregas una función de fetch nueva, no fuerces `Content-Type: application/json` en un `GET`.

## Middleware de Autenticación (`src/proxy.ts`)

El middleware **no** llama al backend — solo verifica la presencia de una cookie para redirigir rápido a `/auth/sign-in` cuando no hay sesión en absoluto. **No es el guard real de autenticación** (no valida que la sesión siga siendo válida en Laravel): esa responsabilidad es de `useRequireAuth()` (`src/hooks/useRequireAuth.ts`), que sí consulta `/user` en el cliente vía `AuthContext`. Si necesitas endurecer la protección de rutas, hazlo ahí — no agregues de vuelta un `fetch` al backend en el middleware, porque reintroduce un round-trip bloqueante en cada navegación dentro de `/4dnn1n`.

**La cookie que se verifica es `auth_hint`, NO `XSRF-TOKEN`.** `XSRF-TOKEN` la pone Laravel para cualquier sesión (autenticada o no) y nunca se borra en `/logout`, así que casi siempre está presente — usarla como check hace que el fast-path nunca redirija y se cae siempre al round-trip lento de `useRequireAuth`, además de un salto visible de URL (`/4dnn1n` → `/auth/sign-in`). `auth_hint` es una cookie propia que el backend (`api-cm/routes/web.php`) solo pone en `/login` exitoso y borra explícitamente en `/logout`, con el mismo `domain`/`path`/`same_site` que la cookie de sesión. Si el backend cambia el nombre o dominio de esa cookie, hay que actualizar `proxy.ts` en el mismo cambio.

## Formularios Públicos — CSRF con Sanctum

Los formularios de la web pública que hacen `POST` a `/api/public/*` necesitan un token CSRF porque `bootstrap/app.php` usa `$middleware->statefulApi()` (Sanctum), que aplica protección CSRF a peticiones de dominios configurados como estacionarios.

**Patrón obligatorio para cualquier `POST` público:**
```ts
import { csrf, getXsrfToken } from "@/lib/api";

await csrf(); // obtiene la cookie XSRF-TOKEN
const res = await fetch(`${API_URL}/api/public/endpoint`, {
  method: "POST",
  credentials: "include",           // envía la cookie
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-XSRF-TOKEN": getXsrfToken() ?? "",  // header que Laravel valida
  },
  body: JSON.stringify(payload),
});
```

**Módulos donde ya está aplicado:** `/web/afiliarse` (`affiliate-request`) y `/web/contactenos` (`contact`).

**NO usar este patrón en `publicFetch`** (GET puro) — las peticiones GET no requieren CSRF.

## LegalModal — Modal de documentos legales web

**Archivo:** `src/components/web/LegalModal.tsx`

Modal de pantalla completa para mostrar la Política de Privacidad y los Términos y Condiciones del sitio web público. Usa `createPortal` para renderizar sobre todo el contenido.

**Props:**
```tsx
<LegalModal type="privacy" onClose={() => setLegalModal(null)} />
<LegalModal type="terms"   onClose={() => setLegalModal(null)} />
```

- `type: 'privacy' | 'terms'` — determina el contenido y el título.
- `onClose` — cierra el modal. También se activa con la tecla `Escape` y haciendo clic en el backdrop.
- Bloquea el scroll del body mientras está abierto (`document.body.style.overflow = 'hidden'`).
- Usa `createPortal(…, document.body)` igual que `LoadingOverlay` para evitar problemas de stacking context.
- Los textos tienen placeholders `[RAZÓN SOCIAL]`, `[NIT]`, `[CIUDAD]` y `[CORREO DATOS]` que el cliente debe reemplazar con datos reales antes de producción.

**Módulos donde está integrado:** `/web/afiliarse` y `/web/contactenos` — ambos muestran los dos modales con checkboxes de aceptación obligatoria.

## Módulo Mensajes de Contacto (`contacts`)

- **Ruta del panel:** `/4dnn1n/contacts`
- **Archivos:** `src/app/4dnn1n/contacts/` — `fetch.ts`, `page.tsx`, `_components/columns.tsx`, `[id]/page.tsx`
- Sin filtro de estado (`enableStateFilter={false}`) y sin buscador (`hideSearch`) — la tabla solo lista y pagina.
- El detalle (`[id]/page.tsx`) muestra todos los campos en tarjetas de solo lectura con `ShowcaseSection`. Tiene botón "Eliminar mensaje" con `alert.confirm` y redirige a la lista tras eliminar.
- Hard delete físico — no hay soft-delete ni campo de estado en este módulo.
- Caché: `contacts:list:${query}` con `TTL_LIST`; se invalida con `invalidatePrefix("contacts:list:")` en `deleteContact`.

## Permisos y Control de Acceso (RBAC)
Para proteger las vistas y acciones según el rol del usuario, sigue este patrón estandarizado en las páginas principales (`page.tsx`) y subpáginas (`new`, `[id]`, `[id]/edit`):

1. **Tablas (Ocultar botones y acciones):**
   Evalúa `const hasAccess = user?.type === 1 || user?.type === 2;` y úsalo para renderizar condicionalmente los botones del toolbar (`CreateToolbarButton`) y pasar el booleano al constructor de columnas para ocultar la columna de acciones.
2. **Subpáginas (Protección de Ruta):**
   Utiliza el siguiente bloque de código al inicio del componente para evitar renderizados indeseados o parpadeos de UI:
   ```tsx
   const { user, loading: authLoading } = useAuth();
   if (authLoading) return null;
   if (user?.type !== 1 && user?.type !== 2) {
     return (
       <div className="flex h-64 items-center justify-center p-6 text-red-500 font-medium">
         No tienes permisos suficientes para acceder a esta vista.
       </div>
     );
   }
   ```
