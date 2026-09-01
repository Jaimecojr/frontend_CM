# Cobertura de Tests — Fase 4 (Web pública + `src/components/*` compartido + hooks/lib restantes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la brecha de cobertura de la última fase de la iniciativa: sitio web público
(`src/app/web/*`, `src/components/web/*`), los archivos de `src/components/*` (fuera de `web/`) que
tienen lógica propia real (tras clasificar los 63 archivos de esa carpeta), y los hooks/lib que
quedaron sin cubrir tras las Fases 1-3. Termina fijando el umbral real de cobertura en
`vitest.config.ts`.

**Architecture:** 23 tareas independientes agrupadas por capa/archivo. Primero `src/lib/*` y
`src/hooks/*` (sin dependencias de UI), luego primitivas compartidas con lógica real
(`Dropdown`, `LoadingOverlay`, `DatePickerWithToday`, `SearchableSelect`, el sistema `DataTable`),
luego los widgets de layout (`Header`/`Sidebar` y sus piezas) y el formulario de login
(`SigninWithPassword`), y por último el sitio público completo (`src/components/web/*` seguido de
`src/app/web/*`), de la capa de servicio hacia las páginas — mismo orden que la Fase 1
(fetch/servicio → componentes hoja → páginas). La tarea final sube el umbral de cobertura de
`vitest.config.ts` con el número real medido tras esta fase.

**Tech Stack:** Vitest + Testing Library (`@testing-library/react`), ya configurado. Carpeta espejo
`tests/`.

**Spec:** `docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`

**Plantilla de formato y rigor:** `docs/superpowers/plans/2026-08-28-cobertura-tests-fase-1-affiliates-appointments.md`

## Global Constraints

- **Ubicación:** carpeta espejo `tests/`, misma ruta que el archivo de origen (ej.
  `tests/components/web/Navbar.test.tsx` para `src/components/web/Navbar.tsx`,
  `tests/app/web/afiliarse/page.test.tsx` para `src/app/web/afiliarse/page.tsx`).
- **Comentarios en inglés**, sin referenciar documentos internos por nombre. `describe()`/`it()` en
  **español**, patrón AAA.
- **Mocks tipados**, nunca `any` salvo en el propio cast del mock (patrón ya establecido en Fase 1:
  `(alert.confirm as any).mockImplementation(...)`).
- **Patrón de mock para `@/lib/alert`** (reutilizar tal cual, ya usado en Fases 1-3):
  ```ts
  vi.mock("@/lib/alert", () => ({
    alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  }));
  ```
- **Patrón de mock para `@/context/AuthContext`:**
  ```ts
  vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
  (useAuth as any).mockReturnValue({ user: { id: 1, type: 1, name: "Ana", email: "a@a.com" }, loading: false, logoutUser: vi.fn() });
  ```
  `AuthContextType` expone `user`, `loading` y `logoutUser: () => Promise<void>` (confirmado en
  `src/context/AuthContext.tsx`) — no `isLoggingOut` en este contexto (eso solo aplica a los hooks
  de página de Fase 1).
- **Patrón de mock para `next/navigation`:** `vi.mock("next/navigation", () => ({ useRouter: vi.fn(), usePathname: vi.fn(), useSearchParams: vi.fn() }))`, cada uno vía `mockReturnValue` según lo que el archivo use.
- **Patrón de mock para `@/hooks/use-mobile`:** `vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));` — cambiar a `true` en los casos que ejercitan el layout móvil.
- **Fetch global:** para páginas/componentes que llaman `fetch()` directo (sitio público, no pasa
  por `@/lib/api`), mockear `global.fetch = vi.fn()` en cada test y restaurarlo en `afterEach` con
  `vi.restoreAllMocks()` — no dejar un mock de `fetch` filtrarse entre archivos de test.
- **Server Components asíncronos (`AlliesSection`, `DoctorsSection`):** no se renderizan con
  `render(<Componente />)` directo porque son `async function` — Testing Library no espera la
  promesa. Se invoca la función como una función async normal para obtener el elemento ya resuelto
  y ESE elemento es lo que se pasa a `render()`:
  ```ts
  const jsx = await AlliesSection();
  render(jsx);
  ```
  Esto funciona porque un Server Component async es, en tiempo de test, simplemente una función que
  retorna JSX — no depende del runtime de Next.js para resolverse.
- `npm run test` y `npx tsc --noEmit` limpios después de cada tarea.
- Commits por tarea en la rama de esta fase (mismo criterio que la Fase 1: cada tarea es su propio
  checkpoint).

---

## Clasificación de `src/components/*` (fuera de `web/`)

Resultado completo de la clasificación pedida por la Decisión 1 del spec, sobre los 63 archivos de
`src/components/*` que no están en `web/` (ya cubierto aparte en la Parte A). Confirmado con
`Grep` que ninguno de estos archivos tiene test propio hoy (`tests/components/` no existe todavía).
Confirmado también por `Grep` de imports en todo `src/` cuáles de estos archivos NO son importados
por ningún otro módulo (columna "Código muerto").

| Archivo | Clasificación | Razón / Tarea |
|---|---|---|
| `Auth/GoogleSigninButton.tsx` | Presentacional | Se importa en `Auth/Signin/index.tsx` pero su render está comentado (`{/* <GoogleSigninButton .../> */}`) — no se ejecuta en producción; sin lógica propia. No se testea. |
| `Auth/Signin/index.tsx` | Presentacional (wrapper) | Solo compone `SigninWithPassword` (y el botón de Google comentado), sin estado propio. Su uso queda cubierto indirectamente al testear `SigninWithPassword` (Tarea 11). No se testea. |
| `Auth/SigninWithPassword.tsx` | **Lógica real** | Formulario de login real (`/auth/sign-in`): fetch con CSRF, manejo de error, `LoadingOverlay`. → **Tarea 11**. |
| `CalenderBox/index.tsx` | Código muerto | Ningún archivo de `src/` lo importa (verificado con Grep). Resto de plantilla `free-nextadmin-nextjs` sin ruta que lo use. No se testea. |
| `FormElements/checkbox.tsx` (`Checkbox`) | Presentacional | Usado en `SigninWithPassword` pero sin estado/efectos propios (solo props → JSX). Cobertura indirecta vía Tarea 11. No se testea. |
| `FormElements/Checkboxes/CheckboxFive.tsx` | Código muerto | Demo de plantilla, sin importadores. No se testea. |
| `FormElements/Checkboxes/CheckboxFour.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/Checkboxes/CheckboxOne.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/Checkboxes/CheckboxThree.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/Checkboxes/CheckboxTwo.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/DatePicker/DatePickerOne.tsx` | Código muerto | Demo de plantilla, sin importadores. No se testea. |
| `FormElements/DatePicker/DatePickerTwo.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/DatePicker/DatePickerWithToday.tsx` | **Lógica real** | flatpickr + locale español + botón "Hoy" + helpers de parseo/formato de fecha. → **Tarea 6**. |
| `FormElements/InputGroup/index.tsx` | Presentacional | Usado en decenas de formularios reales, pero sin estado/lógica condicional de negocio propia. No se testea. |
| `FormElements/InputGroup/text-area.tsx` (`TextAreaGroup`) | Código muerto | Ningún archivo de `src/` lo importa (verificado). No se testea. |
| `FormElements/MultiSelect.tsx` | Código muerto | Demo de plantilla, sin importadores. No se testea. |
| `FormElements/radio.tsx` (`RadioInput`) | Código muerto | Ningún archivo de `src/` lo importa (verificado — solo su propia definición). No se testea. |
| `FormElements/select.tsx` (`Select`) | Código muerto | Ningún archivo de `src/` lo importa (verificado). No se testea. |
| `FormElements/SearchableSelect.tsx` | **Lógica real** | Filtrado por texto, selección, cierre por click-fuera, modo `disabled` de solo lectura. → **Tarea 7**. |
| `FormElements/switch.tsx` (`Switch`) | Código muerto | Ningún archivo de `src/` lo importa (verificado). No se testea. |
| `FormElements/Switchers/SwitcherFour.tsx` | Código muerto | Demo de plantilla, sin importadores. No se testea. |
| `FormElements/Switchers/SwitcherOne.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/Switchers/SwitcherThree.tsx` | Código muerto | Idem. No se testea. |
| `FormElements/Switchers/SwitcherTwo.tsx` | Código muerto | Idem. No se testea. |
| `Layouts/header/icons.tsx` | Icono SVG estático | Sin lógica; no se testean iconos. |
| `Layouts/header/notification/icons.tsx` | Icono SVG estático | Idem. |
| `Layouts/header/notification/index.tsx` (`Notification`) | **Lógica real** | Estado `isOpen`/`isDotVisible`, integración con `useIsMobile`, se renderiza en el `Header` real. → **Tarea 9**. |
| `Layouts/header/theme-toggle/icons.tsx` | Icono SVG estático | Sin lógica; no se testea. |
| `Layouts/header/theme-toggle/index.tsx` (`ThemeToggleSwitch`) | **Lógica real** | Guard de montaje (SSR) + toggle de tema vía `next-themes`. → **Tarea 9**. |
| `Layouts/header/user-info/icons.tsx` | Icono SVG estático | Sin lógica; no se testea. |
| `Layouts/header/user-info/index.tsx` (`UserInfo`) | **Lógica real** | Placeholder de carga, avatar derivado del usuario, logout, `Dropdown` real. → **Tarea 9**. |
| `Layouts/header/index.tsx` (`Header`) | **Lógica real (ligera)** | Wiring de `toggleSidebar`/`toggleCollapse` del contexto + render condicional por `isMobile`. → **Tarea 9**. |
| `Layouts/sidebar/data/ui-elements-list.ts` | Dato estático muerto | Genera URLs bajo `/ui-elements/...`, ruta que no existe en `src/app` (verificado). No se testea. |
| `Layouts/sidebar/data/index.ts` (`NAV_DATA`) | Dato de configuración estático | Array de navegación sin comportamiento en runtime — se ejercita indirectamente al testear `Sidebar` (Tarea 10) con los datos reales. No se testea por separado. |
| `Layouts/sidebar/icons.tsx` | Icono SVG estático | Sin lógica; no se testea. |
| `Layouts/sidebar/index.tsx` (`Sidebar`) | **Lógica real** | Expansión/colapso de acordeones según `pathname`, overlay móvil, ancho colapsado. → **Tarea 10**. |
| `Layouts/sidebar/sidebar-context.tsx` (`SidebarProvider`) | **Lógica real** | Estado `isOpen`/`isCollapsed` derivado de `isMobile`, funciones de toggle. → **Tarea 10**. |
| `Layouts/sidebar/menu-item.tsx` (`MenuItem`) | **Lógica real (ligera)** | Renderizado condicional link/botón + cierre del sidebar móvil al navegar. → **Tarea 10**. |
| `period-picker.tsx` (`PeriodPicker`) | Código muerto | Ningún archivo de `src/` lo importa (verificado). No se testea. |
| `Tables/fetch.ts` | Dato demo hardcoded | Devuelve arrays fijos tras un `setTimeout` fake; no consume la API real. Sin lógica de negocio. No se testea. |
| `Tables/icons.tsx` | Código muerto (indirecto) | Solo lo consume `Tables/invoice-table.tsx`, que a su vez no tiene importadores. No se testea. |
| `Tables/invoice-table.tsx` | Código muerto | Ningún archivo de `src/app` lo importa (verificado). No se testea. |
| `Tables/top-channels/index.tsx` | Código muerto | Idem. No se testea. |
| `Tables/top-channels/skeleton.tsx` | Código muerto | Idem. No se testea. |
| `Tables/top-products/index.tsx` | Código muerto | Idem. No se testea. |
| `Tables/top-products/skeleton.tsx` | Código muerto | Idem. No se testea. |
| `ui/dropdown.tsx` (`Dropdown`/`DropdownContent`/`DropdownTrigger`/`DropdownClose`) | **Lógica real** | Context, Escape, focus restore, `pointer-events` lock, click-outside — primitiva reutilizada por `Notification`, `UserInfo`, etc. → **Tarea 4**. |
| `ui/skeleton.tsx` (`Skeleton`) | Presentacional | `div` con clases de animación; sin lógica. No se testea. |
| `ui-elements/alert/icons.tsx` | Icono SVG estático | Sin lógica; no se testea. |
| `ui-elements/alert/index.tsx` (`Alert`) | Presentacional | Variantes de estilo vía `cva`, sin estado ni efectos. No se testea. |
| `Auth/Signin/index.tsx` | *(ver arriba)* | — |
| `data-table/DataTableSkeleton.tsx` | Presentacional | Solo renderiza placeholders según `rows`/`cols`, sin lógica condicional de negocio. No se testea. |
| `ui-elements/input.tsx` (`Input`) | Presentacional | `forwardRef` simple sobre `<input>`. No se testea. |
| `data-table/DataTablePagination.tsx` | **Lógica real (ligera)** | Guard `if (totalRows <= defaultPageSize) return null` + wiring de `previousPage`/`nextPage` de TanStack Table. → **Tarea 8**. |
| `data-table/CreateToolbarButton.tsx` | Presentacional | `Link` + `Button`, sin lógica. Su uso correcto ya se verifica en los tests de páginas de Fases 1-3 (gate de permisos). No se testea. |
| `Layouts/showcase-section.tsx` (`ShowcaseSection`) | Presentacional | Card de layout genérica, sin estado. No se testea. |
| `ui-elements/button.tsx` (`Button`) | Presentacional | Variantes `cva`, usado en ~40 archivos reales; sin lógica condicional propia. No se testea. |
| `logo.tsx` (`Logo`/`LogoIcon`) | Presentacional | Solo `<Image>` con distintos tamaños. No se testea. |
| `ui/table.tsx` (primitivas `Table*`) | Presentacional | Wrappers de `<table>`/`<tr>`/etc. con clases. No se testea. |
| `LoadingOverlay.tsx` | **Lógica real** | Guard de montaje (SSR) + `createPortal`; ejemplo ya identificado en el spec. → **Tarea 5**. |
| `FormPageSkeleton.tsx` | Presentacional | Placeholder parametrizado por `fields`, sin lógica condicional de negocio. No se testea. |
| `Auth/SigninWithPassword.tsx` | *(ver arriba)* | — |
| `Layouts/sidebar/data/index.ts` | *(ver arriba)* | — |
| `data-table/DataTable.tsx` | **Lógica real** | Búsqueda con debounce, filtro por estado, paginación cliente/servidor con TanStack Table. → **Tarea 8**. |
| `data-table/DataTableToolbar.tsx` | **Lógica real** | Derivación de `showPageSize`/`selectValue`, wiring de filtros. → **Tarea 8**. |
| `Layouts/sidebar/index.tsx` | *(ver arriba)* | — |
| `Breadcrumbs/Breadcrumb.tsx` | Presentacional | Arma `defaultItems`/usa `items`, pero sin estado ni efectos — solo mapeo de props a JSX. No se testea. |
| `Layouts/sidebar/menu-item.tsx` | *(ver arriba)* | — |

**Resumen:** de 63 archivos, **15** tienen lógica propia real y se testean en las Tareas 4–11;
**48** no se testean directamente (27 código muerto de la plantilla `free-nextadmin-nextjs` sin
ningún importador real, 6 iconos SVG estáticos, y 15 wrappers presentacionales o datos de
configuración estática cuyo uso correcto ya queda cubierto por los componentes reales que los
consumen).

---

## Parte B — `src/components/*` compartido, hooks y lib

### Tarea 1: Tests de `src/lib/utils.ts`, `alert.ts`, `getApiErrorMessage.ts`, `format-message-time.ts`

**Files:**
- Test: `tests/lib/utils.test.ts` (crear)
- Test: `tests/lib/alert.test.ts` (crear)
- Test: `tests/lib/getApiErrorMessage.test.ts` (crear)
- Test: `tests/lib/format-message-time.test.ts` (crear)

**Interfaces:**
- Consume: `cn()` de `src/lib/utils.ts`; `alert` (objeto con `show`/`success`/`error`/`info`/`warn`/`confirm`) de `src/lib/alert.ts`; `getApiErrorMessage(err)` de `src/lib/getApiErrorMessage.ts`; `formatMessageTime(timestamp)` de `src/lib/format-message-time.ts`.

**Contexto verificado:** ninguno de estos 4 archivos tiene test propio hoy (`tests/lib/` solo cubre
`api.ts` parcialmente, `dates.ts`, `memCache.ts`, `format-number.ts`).

- [ ] **Step 1: Tests de `cn()` (`utils.ts`)**

1. `cn("a", "b")` → `"a b"`.
2. `cn("p-2", "p-4")` → `"p-4"` (tailwind-merge resuelve el conflicto, se queda con el último).
3. `cn("a", false && "b", undefined, "c")` → `"a c"` (ignora valores falsy, patrón `clsx`).

- [ ] **Step 2: Tests de `alert` (mockear `sweetalert2`)**

```ts
vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }), isLoading: vi.fn(() => false), close: vi.fn() },
}));
```

1. `alert.success("Listo", "texto")` → `Swal.fire` llamado con `{ icon: "success", title: "Listo", text: "texto", ...base }` (incluye `confirmButtonText: "Aceptar"`, etc.).
2. `alert.error()` sin args → usa defaults `title: "Ups"`.
3. `alert.confirm()` sin `onConfirm` → retorna `res.isConfirmed` (`true` con el mock de arriba).
4. `alert.confirm({ onConfirm })` → `onConfirm` se invoca dentro de `preConfirm`; si `onConfirm` resuelve normal, `alert.confirm(...)` retorna `true`.
5. `alert.confirm({ onConfirm })` donde `onConfirm` rechaza (`mockRejectedValue(new Error("fallo"))`) → `alert.confirm(...)` **re-lanza** ese error (comportamiento real: `storedError` se relanza tras `Swal.close()`).

- [ ] **Step 3: Tests de `getApiErrorMessage`**

1. `{ data: { message: "Error X" } }` → `"Error X"`.
2. `{ data: { message: "Error X", errors: { email: ["requerido"] } } }` → `"Error X: requerido"`.
3. `{ data: { message: "Error X", errors: { email: "requerido" } } }` (string, no array) → `"Error X: requerido"`.
4. `{ response: { data: { message: "Error Axios" } } }` (sin `.data`, solo `.response.data`) → `"Error Axios"`.
5. `{ message: "fallo genérico" }` (sin `.data` ni `.response`) → `"fallo genérico"`.
6. `{}` → `"Ocurrió un error inesperado. Intenta de nuevo."`.

- [ ] **Step 4: Tests de `formatMessageTime`**

Usar `vi.useFakeTimers()` y `vi.setSystemTime(new Date("2026-06-15T12:00:00"))`.

1. Timestamp de hace 30 minutos hoy → `"30m"`.
2. Timestamp de hace 0 minutos → `"just now"`.
3. Timestamp de hace 3 horas hoy (más de 60 min, mismo día) → hora local tipo `"9:00 AM"` (usar el mismo `toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })` en la aserción para no hardcodear un string de locale frágil).
4. Timestamp de hace 2 días (dentro de la semana) → nombre del día (`toLocaleDateString("en-US", { weekday: "long" })`).
5. Timestamp de hace 30 días, mismo año → `"Mon DD"` (`toLocaleDateString("en-US", { day: "numeric", month: "short" })`).
6. Timestamp de un año anterior → incluye el año (`toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })`).
7. Restaurar `vi.useRealTimers()` en `afterEach`.

- [ ] **Step 5: Correr `npm run test` y `npx tsc --noEmit`**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 2: Tests de `apiFetch` y `csrf` en `src/lib/api.ts`

**Files:**
- Test: `tests/lib/api.test.ts` (**modificar** — ya existe con tests de `ApiError`/`getXsrfToken`; agregar `describe` nuevos, no reescribir los existentes)

**Interfaces:**
- Consume: `apiFetch<T>(path, options)` y `csrf()` de `src/lib/api.ts`.

**Contexto verificado:** el archivo actual tiene el comentario "csrf() y apiFetch() ... están
cubiertos por separado (tests de red mockeada)" pero **ese archivo de tests de red mockeada no
existe** — es un hallazgo de esta fase. `apiFetch` tiene lógica real no trivial: reintento
automático en `419` (invalida el CSRF cacheado y reintenta una vez), armado de headers
condicional (`Content-Type` solo si el método tiene body), y el objeto `ApiError` lanzado en
respuestas no-`ok`.

- [ ] **Step 1: Mock de `global.fetch`**

```ts
const fetchMock = vi.fn();
beforeEach(() => { global.fetch = fetchMock; fetchMock.mockReset(); });
```

- [ ] **Step 2: Tests de `apiFetch` — headers y método**

1. `apiFetch("/api/x")` (GET implícito) → `fetch` llamado con headers que **no** incluyen
   `Content-Type` (solo `Accept` y `X-XSRF-TOKEN`).
2. `apiFetch("/api/x", { method: "POST", body: "{}" })` → headers **sí** incluyen
   `"Content-Type": "application/json"`.
3. `X-XSRF-TOKEN` en los headers refleja el valor de `getXsrfToken()` (setear
   `document.cookie = "XSRF-TOKEN=abc"` antes del test).

- [ ] **Step 3: Tests de la respuesta exitosa y de error**

1. `fetch` resuelve `{ ok: true, json: async () => ({ data: [1,2,3] }) }` → `apiFetch` retorna
   `{ data: [1,2,3] }`.
2. `fetch` resuelve `{ ok: false, status: 422, json: async () => ({ message: "Inválido", errors: {} }) }`
   → `apiFetch` rechaza con una instancia de `ApiError` con `status: 422` y `message: "Inválido"`.
3. `fetch` resuelve `{ ok: false, status: 500, json: async () => { throw new Error("no json"); } }`
   → el `.catch(() => ({}))` interno evita que reviente; `ApiError.message` cae al fallback
   `"Error 500 al consumir API"`.

- [ ] **Step 4: Test del reintento en 419**

1. Primera llamada a `fetch` resuelve `{ status: 419, ok: false, json: async () => ({}) }`;
   segunda llamada (tras el reintento) resuelve `{ ok: true, json: async () => ({ data: "ok" }) }`.
   → `apiFetch` retorna `"ok"` y `fetch` fue llamado **dos veces** — la segunda vez, después de
   haber invalidado y vuelto a pedir el CSRF (mockear `fetch` para que la URL de
   `/sanctum/csrf-cookie` también resuelva `ok: true` dentro de este mismo mock).

- [ ] **Step 5: Tests de `csrf()` — cacheo de la promesa**

1. Dos llamadas consecutivas a `csrf()` sin que la primera rechace → `fetch` fue llamado **una
   sola vez** hacia `/sanctum/csrf-cookie` (la segunda llamada reutiliza `csrfPromise`).
2. Si la llamada a `fetch` dentro de `csrf()` rechaza → la promesa cacheada se limpia (verificar
   llamando `csrf()` de nuevo después: dispara una **nueva** petición `fetch`, no reutiliza la
   promesa rechazada).

- [ ] **Step 6: Correr tests y tsc**
- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 3: Tests de `use-click-outside.ts`, `use-mobile.ts`, `usePageTitle.ts`, `useClientTable.ts`

**Files:**
- Test: `tests/hooks/use-click-outside.test.ts` (crear)
- Test: `tests/hooks/use-mobile.test.ts` (crear)
- Test: `tests/hooks/usePageTitle.test.ts` (crear)
- Test: `tests/hooks/useClientTable.test.ts` (crear)

**Interfaces:**
- Consume: `useClickOutside<T>(callback)` (retorna un `ref`), `useIsMobile()` (retorna `boolean`,
  exporta también `MOBILE_BREAKPOINT = 850`), `usePageTitle(title)` (efecto sin retorno),
  `useClientTable<T>(fetchFn)` (retorna `{ data, setData, loading }`).

- [ ] **Step 1: Tests de `useClickOutside`**

Usar `renderHook` + un elemento DOM real:

1. Renderizar un componente que asigna el `ref` retornado a un `<div>` con contenido; disparar
   `mousedown` **fuera** del div → `callback` invocado.
2. Disparar `mousedown` **dentro** del div → `callback` NO invocado.
3. Desmontar el componente → el listener se remueve (verificar que un `mousedown` posterior no
   invoca `callback` de nuevo, con un spy que se resetea antes del unmount).

- [ ] **Step 2: Tests de `useIsMobile`**

Mockear `window.matchMedia`:

```ts
function mockMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }));
  return listeners;
}
```

1. `window.innerWidth` seteado por debajo de `850` → `useIsMobile()` retorna `true`.
2. `window.innerWidth` seteado en `850` o más → retorna `false` (el corte es estrictamente `<`).
3. Disparar el listener de `change` registrado tras cambiar `window.innerWidth` → el hook
   re-renderiza con el nuevo valor.

- [ ] **Step 3: Test de `usePageTitle`**

1. `renderHook(() => usePageTitle("Afiliados"))` → `document.title === "Afiliados | Contacto Médico Admin"`.
2. Cambiar el argumento (`rerender` con otro título) → `document.title` se actualiza al nuevo valor.

- [ ] **Step 4: Tests de `useClientTable`**

Mockear `@/lib/alert` (patrón global) y `@/lib/getApiErrorMessage`.

1. `fetchFn` resuelve `[{ id: 1 }, { id: 2 }]` → tras el efecto, `data` tiene esos 2 elementos y
   `loading` termina en `false`.
2. `fetchFn` rechaza → `alert.error("Error al cargar datos", mensaje)` se invoca con el mensaje de
   `getApiErrorMessage(err)`; `loading` termina en `false`; `data` queda en `[]` (nunca se llenó).
3. `setData` expuesto por el hook permite actualizar `data` manualmente desde el consumidor (ej.
   `act(() => result.current.setData([{ id: 9 }]))` → `result.current.data` refleja el cambio).
4. Desmontar antes de que `fetchFn` resuelva → al resolver, `setData`/`setLoading` **no** se
   llaman (verificar con un `fetchFn` que resuelve tras un `setTimeout` controlado y comprobar que
   no hay un warning de "state update on unmounted component"; el flag `cancelled` lo evita).

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 4: Tests de `src/components/ui/dropdown.tsx`

**Files:**
- Test: `tests/components/ui/dropdown.test.tsx` (crear)

**Interfaces:**
- Consume: `Dropdown({ children, isOpen, setIsOpen })`, `DropdownContent({ children, align, className })`, `DropdownTrigger({ children, className })`, `DropdownClose({ children })`.

**Contexto verificado:** `DropdownContent` usa el `useClickOutside` real (Tarea 3) — no hace falta
mockearlo, el evento `mousedown` real en jsdom es suficiente. `Dropdown` bloquea
`document.body.style.pointerEvents` mientras está abierto y restaura el foco al trigger anterior
tras cerrar (con un `setTimeout(0)`).

- [ ] **Step 1: Test de apertura/cierre básico**

Montar un `Dropdown` controlado con `useState` en un wrapper de test:

1. `isOpen: false` → `DropdownContent` no se renderiza (retorna `null`).
2. Click en `DropdownTrigger` → invoca `setIsOpen(true)`.
3. `isOpen: true` → `DropdownContent` se renderiza con `role="menu"`.

- [ ] **Step 2: Test de cierre por click-fuera y por Escape**

1. Con `isOpen: true`, click en un elemento fuera del `Dropdown` → `setIsOpen(false)`.
2. Con `isOpen: true`, `keydown` con `key: "Escape"` dentro del contenedor → `setIsOpen(false)`.

- [ ] **Step 3: Test de `align` y `pointer-events`**

1. `align="end"` → el contenedor de `DropdownContent` tiene la clase `right-0`; `align="start"` →
   `left-0`; default (`center`) → `left-1/2 -translate-x-1/2`.
2. Mientras `isOpen: true` → `document.body.style.pointerEvents === "none"`; al pasar a `false` →
   la propiedad se remueve (`document.body.style.pointerEvents === ""`).

- [ ] **Step 4: Test de `DropdownTrigger` y `DropdownClose`**

1. `DropdownTrigger` expone `aria-expanded`/`aria-haspopup`/`data-state` acorde a `isOpen`.
2. Click dentro de `DropdownClose` → invoca `handleClose` (verificar indirectamente: el `Dropdown`
   pasa a `isOpen: false`).

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 5: Tests de `src/components/LoadingOverlay.tsx`

**Files:**
- Test: `tests/components/LoadingOverlay.test.tsx` (crear)

**Interfaces:**
- Consume: `LoadingOverlay({ isLoading, message })`.

**Contexto verificado:** usa `createPortal(..., document.body)` y solo se monta tras un `useEffect`
(`mounted`), igual que el patrón de `NoteModal` en la Fase 1 — RTL adjunta `document.body`
automáticamente, sin configuración extra.

- [ ] **Step 1: Test del guard de montaje y `isLoading`**

1. `isLoading: false` (default `true` si se omite, pero probar explícito `false`) → no renderiza
   nada (`container.firstChild === null` en el body).
2. `isLoading: true` → tras el primer render (con `mounted` ya en `true` gracias a `act`/microtask
   flush de RTL), se renderiza el overlay con el texto default `"Cargando"` y los 3 puntos
   animados.
3. `message="Enviando"` → el texto mostrado es `"Enviando"` en lugar del default.

- [ ] **Step 2: Test de que se renderiza en `document.body` (portal)**

1. Renderizar dentro de un `<div id="app-root">` contenedor y verificar que el overlay NO es hijo
   de ese contenedor sino de `document.body` directamente (`document.body.querySelector(...)`).

- [ ] **Step 3: Correr tests y tsc**
- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 6: Tests de `src/components/FormElements/DatePicker/DatePickerWithToday.tsx`

**Files:**
- Test: `tests/components/FormElements/DatePicker/DatePickerWithToday.test.tsx` (crear)

**Interfaces:**
- Consume: `DatePickerWithToday({ value, onChange, disabled, placeholder, className })` (default export).

**Contexto verificado:** usa `flatpickr` real (no se mockea — es una librería de terceros ya
instanciada sobre un `<input>` real de jsdom, funciona en tests sin polyfills adicionales porque
flatpickr no depende de layout real). Expone helpers internos no exportados (`parseYMD`,
`formatDisplay`) que solo se ejercitan indirectamente a través del comportamiento visible.

- [ ] **Step 1: Test del modo `disabled` (solo lectura)**

1. `disabled: true`, `value: "2026-06-15"` → el input renderizado es de solo lectura (`disabled`)
   y muestra el texto formateado `"15/06/2026"` (vía `formatDisplay`), no el valor ISO crudo.
2. `disabled: true`, `value: ""` → el input muestra `placeholder` (default `"dd/mm/aaaa"`).
3. `disabled: true`, `value: "no-es-fecha"` (no matchea `/^\d{4}-\d{2}-\d{2}$/`) → se muestra el
   string crudo tal cual (branch `if (!d) return str;` de `formatDisplay`).

- [ ] **Step 2: Test del modo editable — inicialización de flatpickr**

1. `disabled: false`, `value: "2026-06-15"` → el input NO tiene el atributo `disabled`; tras el
   montaje, flatpickr fija esa fecha como `defaultDate` (verificar leyendo `input.value`, que
   flatpickr formatea como `"15/6/2026"` según `dateFormat: "d/m/Y"`).
2. Cambiar la prop `value` tras el montaje (`rerender` con un nuevo `value`) → el segundo
   `useEffect` (`fpRef.current.setDate(...)`) actualiza el valor mostrado sin re-crear la instancia.

- [ ] **Step 3: Test del botón "Hoy"**

1. Tras abrir el calendario (click en el input para que flatpickr muestre el calendario), debe
   existir un botón con texto `"Hoy"` dentro de `document.body` (flatpickr monta su calendario
   fuera del árbol de React, buscar con `screen.getByText("Hoy")` o `document.querySelector(".flatpickr-today-btn")`).
2. Click en ese botón → invoca `fp.setDate(new Date(), true)`, lo que dispara `onChange` con la
   fecha de hoy en formato `YYYY-MM-DD` (usar `vi.setSystemTime` para fijar "hoy" y comparar el
   argumento exacto recibido por el mock de `onChange`).

- [ ] **Step 4: Test de cleanup**

1. Desmontar el componente → `fpRef.current?.destroy()` se invoca (verificar indirectamente que un
   segundo montaje en el mismo `document.body` no deja instancias de calendario duplicadas —
   contar `document.querySelectorAll(".flatpickr-calendar")` antes/después).

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 7: Tests de `src/components/FormElements/SearchableSelect.tsx`

**Files:**
- Test: `tests/components/FormElements/SearchableSelect.test.tsx` (crear)

**Interfaces:**
- Consume: `SearchableSelect({ options, value, onChange, placeholder, disabledPlaceholder, disabled, className })`.

- [ ] **Step 1: Test del modo `disabled` (solo lectura)**

1. `disabled: true`, `value` coincide con una opción → muestra el `label` de esa opción, en un
   `<input disabled readOnly>`.
2. `disabled: true`, `value` no coincide con ninguna opción, `disabledPlaceholder: "Bogotá"` →
   muestra `"Bogotá"` (útil cuando el label viene de un objeto anidado del API, ej.
   `initial.city.name`).
3. `disabled: true`, sin `value` que matchee ni `disabledPlaceholder` → input vacío.

- [ ] **Step 2: Test de apertura y filtrado**

1. Click en el contenedor → se abre el dropdown (aparecen las opciones) y el input recibe foco.
2. Escribir texto en el input → filtra `options` por `label` (case-insensitive, `includes`); si no
   hay coincidencias, muestra `"Sin resultados"`.
3. Borrar el texto de búsqueda → vuelve a mostrar todas las opciones.

- [ ] **Step 3: Test de selección**

1. Click en una opción filtrada → invoca `onChange(String(opcion.value))`, cierra el dropdown y
   limpia el texto de búsqueda.
2. La opción cuyo `value` coincide con el `value` actual del componente tiene la clase de
   resaltado (`bg-primary/10`).

- [ ] **Step 4: Test de cierre por click-fuera**

1. Con el dropdown abierto, click fuera del componente → se cierra y se limpia el texto de
   búsqueda (`mousedown` en `document`, verificado con el `useEffect` real, sin mockear nada).

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 8: Tests del sistema `DataTable` (`DataTable.tsx` + `DataTableToolbar.tsx` + `DataTablePagination.tsx`)

**Files:**
- Test: `tests/components/data-table/DataTable.test.tsx` (crear)
- Test: `tests/components/data-table/DataTableToolbar.test.tsx` (crear)
- Test: `tests/components/data-table/DataTablePagination.test.tsx` (crear)

**Interfaces:**
- Consume: `DataTable<TData, TValue>({ columns, data, ... })` (ver todas las props en el archivo
  real — búsqueda cliente/servidor, filtro de estado, paginación cliente/servidor).
- `DataTableToolbar` y `DataTablePagination` se testean primero de forma aislada (unidad), y luego
  se verifica su integración dentro de `DataTable` sin mockearlos (es el sistema real que compone
  la Fase 1/2/3 mockean como stub — aquí se testea la implementación real que esos mocks
  reemplazan).

**Contexto verificado:** `DataTable` usa columnas mínimas de ejemplo para los tests (2-3 columnas
de `ColumnDef<{ id: number; name: string }>`), no las columnas reales de ningún módulo de negocio
— esta fase testea el componente genérico, no un módulo específico.

- [ ] **Step 1: Tests de `DataTableToolbar` (unidad)**

1. `filteredRows > defaultPageSize` → se muestra el selector de "Ver" (`showPageSize`); si
   `filteredRows <= defaultPageSize` → no se muestra.
2. `pageSize >= filteredRows && filteredRows > 0` → el `<select>` de tamaño de página muestra la
   opción `"all"` seleccionada; en otro caso, muestra `String(pageSize)`.
3. Escribir en el input de búsqueda → invoca `onSearchChange` con el texto tecleado.
4. `isSearching: true` → se muestra el spinner (`svg.animate-spin`) junto al input.
5. `stateFilterValue`/`onStateFilterChange` presentes → se renderiza el `<select>` de estado con
   las opciones de `stateFilterOptions` (o el default `Activos`/`Inactivos`) + la opción `"Todos"`.
6. `hideSearch: true` → el input de búsqueda no se renderiza.

- [ ] **Step 2: Tests de `DataTablePagination` (unidad)**

Usar una tabla real de `@tanstack/react-table` mínima (`useReactTable` con 2 columnas y datos de
prueba) para pasarle un `table` real, no un mock — es más simple y fiel que mockear la API de
TanStack.

1. `totalRows <= defaultPageSize` → el componente retorna `null` (no renderiza nada).
2. `totalRows > defaultPageSize` → muestra `"Página 1 de N"`; click en "Siguiente" invoca
   `table.nextPage()` (verificar que la página visible cambia); botón "Anterior" deshabilitado en
   la primera página.

- [ ] **Step 3: Tests de `DataTable` — búsqueda cliente con debounce**

Usar `vi.useFakeTimers()`.

1. Escribir en el buscador (sin `searchValue`/`onSearchChange` externos → modo no controlado) →
   inmediatamente después de escribir, `isSearching` interno es `true` (spinner visible);
   `vi.advanceTimersByTime(300)` → se aplica el filtro sobre `getSearchText` y el spinner
   desaparece.
2. Filtrar por un texto que no matchea ninguna fila → se muestra `"No hay resultados."` con
   `colSpan={columns.length}`.
3. Cambiar el texto de búsqueda → `clientPage` vuelve a `0` (verificar mostrando más filas que
   `defaultPageSize`, avanzando de página, y confirmando que al buscar se regresa a la página 1).

- [ ] **Step 4: Tests de `DataTable` — filtro de estado (`enableStateFilter`)**

1. `enableStateFilter: true`, `getStateValue: (row) => row.state`, sin controlar el filtro
   externamente → el filtro interno arranca en `stateFilterOptions[0].value` (o `"1"` si no se
   pasan opciones) y filtra los datos client-side.
2. Seleccionar `"all"` en el filtro → no se aplica ningún filtro de estado.

- [ ] **Step 5: Tests de `DataTable` — modo servidor (`serverSide`)**

1. `serverSide: true` → no se aplica `getPaginationRowModel` (todas las filas de `data` se
   muestran, sin recorte cliente); se usa el paginador propio (`serverPage`/`serverLastPage`,
   botones "Anterior"/"Siguiente" invocando `onPageChange`).
2. `serverLastPage <= 1` → no se muestra el paginador de servidor en absoluto.
3. `loading: true` → se renderizan 8 filas esqueleto (`animate-pulse`) en lugar de los datos.

- [ ] **Step 6: Test de `columns.length <= 6` (`isFit`)**

1. Con 6 o menos columnas → el contenedor de la tabla usa las clases de ancho ajustado
   (`flex justify-center` / `w-max`); con más de 6 → usa `min-w-full`.

- [ ] **Step 7: Correr tests y tsc**
- [ ] **Step 8: Commit**

**Checkpoint.**

---

### Tarea 9: Tests de los widgets del `Header` (`Header`, `Notification`, `ThemeToggleSwitch`, `UserInfo`)

**Files:**
- Test: `tests/components/Layouts/header/index.test.tsx` (crear)
- Test: `tests/components/Layouts/header/notification/index.test.tsx` (crear)
- Test: `tests/components/Layouts/header/theme-toggle/index.test.tsx` (crear)
- Test: `tests/components/Layouts/header/user-info/index.test.tsx` (crear)

**Interfaces:**
- Consume: `Header()`, `Notification()`, `ThemeToggleSwitch()`, `UserInfo()`.
- Mockear `@/components/Layouts/sidebar/sidebar-context` (`useSidebarContext`) para `Header`;
  `@/hooks/use-mobile` (patrón global) para `Notification`; `next-themes` (`useTheme`) para
  `ThemeToggleSwitch`; `@/context/AuthContext` (patrón global) para `UserInfo`.

**Contexto verificado:** el contenido de `Notification` (lista de notificaciones) es data
hardcodeada de ejemplo — no viene de ningún endpoint real. Esto es un hallazgo a documentar en el
reporte de la tarea (no es un bug a arreglar aquí), pero el comportamiento interactivo del
dropdown SÍ es real y se testea igual.

- [ ] **Step 1: Test de `Header`**

```ts
vi.mock("@/components/Layouts/sidebar/sidebar-context", () => ({ useSidebarContext: vi.fn() }));
```

1. `isMobile: true` → se muestra el logo junto al botón de menú (link a `/4dnn1n/home`); click en
   el botón hamburguesa (visible solo en mobile, `lg:hidden`) invoca `toggleSidebar`.
2. `isMobile: false`, `isCollapsed: false` → botón de colapsar (visible solo en desktop,
   `lg:inline-flex`) con `title="Colapsar sidebar"`; click invoca `toggleCollapse`.
3. `isMobile: false`, `isCollapsed: true` → el mismo botón cambia su `title` a `"Expandir sidebar"`.
4. Se renderizan `Notification` y `UserInfo` (verificar por sus textos/roles distintivos, no
   mockearlos aquí — se testean en detalle en los steps siguientes).

- [ ] **Step 2: Test de `Notification`**

```ts
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));
```

1. Render inicial → el punto rojo (`isDotVisible`) está visible junto al icono de campana.
2. Click en el trigger (icono de campana) → se abre el dropdown, muestra "Notifications" y "5 new",
   y el punto rojo desaparece (`setIsDotVisible(false)` se dispara al abrir).
3. Se listan los 5 items de ejemplo con imagen/título/subtítulo.
4. Click en un item o en "See all notifications" → cierra el dropdown (`setIsOpen(false)`).

- [ ] **Step 3: Test de `ThemeToggleSwitch`**

```ts
vi.mock("next-themes", () => ({ useTheme: vi.fn() }));
```

1. Antes de que el `useEffect` de montaje corra (verificar con un render síncrono si es
   alcanzable, o documentar como hallazgo si RTL siempre flush-ea el efecto) → SSR guard: si no
   está montado, no renderiza nada.
2. Tras montar, `theme: "light"` → click en el botón invoca `setTheme("dark")`.
3. `theme: "dark"` → click invoca `setTheme("light")`.
4. El texto accesible (`sr-only`) indica el modo destino ("Switch to dark mode" cuando el tema
   actual es claro).

- [ ] **Step 4: Test de `UserInfo`**

```ts
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
```

1. `loading: true` (o `user: null`) → renderiza el placeholder `animate-pulse` circular, nada más.
2. `user: { user: "jperez", name: "Juan Pérez", email: "j@x.com" }`, `loading: false` → muestra la
   inicial en mayúscula (`"J"`, derivada de `user.user` con prioridad sobre `user.name`) y el
   nombre completo.
3. Click en el trigger → abre el dropdown con el email, el toggle de tema (`ThemeToggleSwitch`,
   sin mockear — se integra real), el link a `/4dnn1n/account`, y el botón "Cerrar sesión".
4. Click en "Cerrar sesión" → invoca `logoutUser()` del contexto mockeado.
5. Click en el link "Configuración" → invoca `setIsOpen(false)` (el dropdown se cierra al navegar).

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 10: Tests del sistema `Sidebar` (`Sidebar`, `sidebar-context`, `menu-item`)

**Files:**
- Test: `tests/components/Layouts/sidebar/index.test.tsx` (crear)
- Test: `tests/components/Layouts/sidebar/sidebar-context.test.tsx` (crear)
- Test: `tests/components/Layouts/sidebar/menu-item.test.tsx` (crear)

**Interfaces:**
- Consume: `Sidebar()`, `SidebarProvider({ children, defaultCollapsed })` + `useSidebarContext()`,
  `MenuItem(props)`.
- Mockear `next/navigation` (`usePathname`) y `@/hooks/use-mobile` (`useIsMobile`) para `Sidebar`;
  solo `@/hooks/use-mobile` para `sidebar-context`.

**Contexto verificado:** `Sidebar` usa `NAV_DATA` real (no se mockea — es la data de navegación real
del panel, clasificada como "no se testea por separado" en la tabla de arriba; se ejercita aquí
como parte del comportamiento real de `Sidebar`).

- [ ] **Step 1: Tests de `SidebarProvider`/`useSidebarContext`**

```ts
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn() }));
```

1. `useIsMobile` retorna `false` → `isOpen` arranca `false`, `toggleCollapse()` invierte
   `isCollapsed`.
2. `useIsMobile` retorna `true` → `toggleSidebar()` invierte `isOpen`; cambiar el mock a `false` en
   un `rerender` → `isOpen` se resetea a `false` (efecto que cierra el overlay al salir de mobile).
3. `useSidebarContext()` llamado fuera de un `SidebarProvider` → lanza el error
   `"useSidebarContext must be used within a SidebarProvider"`.
4. `defaultCollapsed: true` → `isCollapsed` arranca en `true`.

- [ ] **Step 2: Tests de `MenuItem`**

Envolver en un `SidebarProvider` real (o mockear `useSidebarContext` directamente — más simple:
mockear `./sidebar-context`).

1. `as="link"`, `isActive: true` → el `<Link>` tiene las clases de estado activo
   (`bg-[rgba(87,80,241,0.07)]`/`text-primary`); `isActive: false` → clases de hover neutras.
2. `as="link"`, click con `isMobile: true` → invoca `toggleSidebar()` (cierra el overlay al
   navegar); `isMobile: false` → NO invoca `toggleSidebar`.
3. `as="button"` (default) → renderiza un `<button>` con `aria-expanded={isActive}` y `onClick`
   igual al prop recibido.

- [ ] **Step 3: Tests de `Sidebar` — expansión de acordeones**

```ts
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock("./sidebar-context", () => ({ useSidebarContext: vi.fn() }));
```

1. `pathname: "/4dnn1n/home"` → ningún acordeón queda expandido (`expandedItems: []`).
2. `pathname` coincide con la URL de un subitem (ej. bajo "Authentication" → "Sign In") → el
   acordeón padre correspondiente se expande automáticamente al montar.
3. Click en el título de un item con subitems (ej. "Authentication") → `toggleExpanded` alterna
   ese acordeón (`expandedItems` pasa a `[]` si ya estaba expandido, o a `[title]` si no).
4. `isCollapsed: true` (desktop) → click en un acordeón NO lo expande (`toggleExpanded` corta
   temprano); las etiquetas de sección (`MAIN MENU`/`OTHERS`) no se muestran.

- [ ] **Step 4: Test del overlay móvil**

1. `isMobile: true`, `isOpen: true` → se renderiza el overlay oscuro (`bg-black/50`); click en él
   invoca `setIsOpen(false)`.
2. `isMobile: true`, `isOpen: false` → el `<aside>` tiene `aria-hidden="true"` y `inert`.

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 11: Tests de `src/components/Auth/SigninWithPassword.tsx`

**Files:**
- Test: `tests/components/Auth/SigninWithPassword.test.tsx` (crear)

**Interfaces:**
- Consume: `SigninWithPassword()` (default export), usado por `Auth/Signin/index.tsx` en
  `/auth/sign-in` (el único formulario de login real de la aplicación).
- Mockear `@/app/4dnn1n/home/fetch` (`csrf`, `getXsrfToken`) y `global.fetch`.

**Contexto verificado:** este es el formulario de login real (fuera del scope de las Fases 1-3, que
solo cubrieron `/4dnn1n`). Usa `window.location.href = "/4dnn1n/home"` para redirigir tras el login
— **no** resetea `loading` en el éxito (comentario explícito en el código: "loading is not reset so
the overlay stays visible throughout the navigation"), a diferencia del patrón catch/finally
habitual. No forzar una aserción de que `loading` vuelve a `false` tras el éxito — es el
comportamiento real.

- [ ] **Step 1: Test de campos y estado inicial**

1. Render inicial → inputs "Usuario"/"Contraseña" vacíos, checkbox "Recordarme" sin marcar, botón
   "Ingresar" habilitado (sin gate de `canSubmit` en este formulario — se puede intentar enviar
   vacío, la validación es responsabilidad del backend).
2. Escribir en "Usuario"/"Contraseña" → actualiza `data.user`/`data.password`; marcar "Recordarme"
   → `data.remember: true`.

- [ ] **Step 2: Test de submit exitoso**

```ts
vi.mock("@/app/4dnn1n/home/fetch", () => ({ csrf: vi.fn().mockResolvedValue(undefined), getXsrfToken: vi.fn(() => "token123") }));
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
```

1. Submit con usuario/contraseña completos → se muestra `LoadingOverlay` (texto "Cargando"); se
   llama `csrf()` antes del `fetch`; el `fetch` a `${NEXT_PUBLIC_API_URL}/login` incluye
   `X-XSRF-TOKEN: "token123"` y el body `{ user, password, remember }`.
2. Tras la respuesta `ok` → `window.location.href` queda en `"/4dnn1n/home"` (mockear
   `window.location` o espiar la asignación según lo que permita jsdom) y el overlay sigue visible
   (no hay `setLoading(false)` en el camino de éxito — confirmar que este es el comportamiento
   real, no forzar lo contrario).

- [ ] **Step 3: Test de submit fallido**

1. `getXsrfToken` retorna `null` → se lanza `"No se pudo obtener el token CSRF"` antes de llamar a
   `fetch`; el mensaje de error se muestra y `loading` vuelve a `false`.
2. `fetch` resuelve `{ ok: false, json: async () => ({ message: "Credenciales inválidas" }) }` →
   se muestra `"Credenciales inválidas"` y `loading` vuelve a `false` (overlay desaparece).
3. `fetch` resuelve `{ ok: false, json: async () => { throw new Error("no json"); } }` (ej. status
   419 con HTML) → se muestra el mensaje genérico `"Error al iniciar sesión"` (el `catch` interno
   de `res.json()` cubre este caso).

- [ ] **Step 4: Correr tests y tsc**
- [ ] **Step 5: Commit**

**Checkpoint — fin de `src/components/*` fuera de `web/`.**

---

## Parte A — Sitio web público (`src/app/web/*` + `src/components/web/*`)

### Tarea 12: Tests de `src/components/web/affiliateService.ts`

**Files:**
- Test: `tests/components/web/affiliateService.test.ts` (crear)

**Interfaces:**
- Consume: `checkAffiliateStatus(docNum): Promise<AffiliateStatusResponse>`.
- Mockear `@/lib/api` (`csrf`, `getXsrfToken`, patrón de Tarea 1 de la Fase 1) y `global.fetch`.

**Contexto verificado:** endpoint real usado — `POST /api/public/affiliate-status` con body
`{ document_number: docNum }`. **Este endpoint NO está en la lista de endpoints públicos
documentados que se dio como referencia para esta fase** (`doctors`, `specialties`, `departments`,
`cities`, `affiliate-request`, `content-allies`, `content-specialists`, `contact`) — es un hallazgo
a reportar: el widget de consulta de estado de afiliado usa un endpoint adicional no listado en el
`CLAUDE.md` del backend. La función nunca lanza — todo error se convierte en
`{ success: false, message }`.

- [ ] **Step 1: Test del camino exitoso**

1. `csrf()` se llama antes de `fetch`; `fetch` con método `POST` a `.../api/public/affiliate-status`,
   headers con `X-XSRF-TOKEN`, body `JSON.stringify({ document_number: "123" })`.
2. `fetch` resuelve `{ ok: true, json: async () => ({ success: true, data: {...} }) }` → la función
   retorna ese objeto tal cual (`data` completo, sin transformación).

- [ ] **Step 2: Test de los caminos de error**

1. `fetch` resuelve `{ ok: false, json: async () => ({ message: "No encontrado" }) }` → retorna
   `{ success: false, message: "No encontrado" }`.
2. `fetch` resuelve `{ ok: false, json: async () => ({}) }` (sin `message`) → retorna
   `{ success: false, message: "No se pudo consultar el estado. Intente nuevamente." }`.
3. `fetch` rechaza (error de red) → retorna
   `{ success: false, message: "Ocurrió un error al consultar. Intente nuevamente." }` (capturado
   por el `catch` externo, que también hace `console.error` — espiar `console.error` para que no
   ensucie la salida del test, sin necesidad de asertar sobre él).

- [ ] **Step 3: Correr tests y tsc**
- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 13: Tests de `AffiliateConsultWidget.tsx` + `AffiliateStatusModal.tsx`

**Files:**
- Test: `tests/components/web/AffiliateConsultWidget.test.tsx` (crear)
- Test: `tests/components/web/AffiliateStatusModal.test.tsx` (crear)

**Interfaces:**
- Consume: `AffiliateConsultWidget()`, `AffiliateStatusModal({ result, onClose })`.
- Mockear `@/components/web/affiliateService` (`checkAffiliateStatus`, ya testeado en Tarea 12).

**Contexto verificado:** este widget vive en `HeroSection` (la página `/web` de inicio). El campo
"Tipo de Documento" es un `<select disabled>` fijo en `"CC"` — no hay otro tipo soportado
actualmente (documentar como comportamiento real, no como bug).

- [ ] **Step 1: Tests de `AffiliateConsultWidget`**

1. Escribir texto no numérico en el input de documento → se filtra a solo dígitos
   (`replace(/\D/g, "")`).
2. Input vacío → botón "Consultar Estado" deshabilitado.
3. Submit con documento válido → llama `checkAffiliateStatus(docNum)`; mientras está pendiente, el
   botón muestra `"Consultando..."` y queda deshabilitado.
4. Tras resolver → se renderiza `AffiliateStatusModal` con el `result` recibido; cerrar el modal
   (`onClose`) → `result` vuelve a `null` y el modal desaparece.

- [ ] **Step 2: Tests de `AffiliateStatusModal` — afiliado activo**

Usar `vi.setSystemTime(new Date("2026-06-15"))`.

1. `result.success: true`, `data.stade: 1`, `data.validity_end: "2026-12-31"` (fecha futura) →
   `activa: true` → chip verde con texto `"Afiliación Activa — Vigente hasta 31/12/2026"`.
2. Iniciales calculadas correctamente: `data.name: "Juan"`, `data.lastname: "Pérez"` → `"JP"`.
3. `data.beneficiaries: [{ name: "Ana" }, { name: "Luis" }]` → se listan ambos, con el contador
   `"2"` junto al título "Beneficiarios".
4. `data.beneficiaries: []` → se muestra `"Sin beneficiarios registrados."`.

- [ ] **Step 3: Tests de `AffiliateStatusModal` — afiliado inactivo o no encontrado**

1. `data.stade: 1`, `data.validity_end: "2026-01-01"` (fecha pasada respecto a "hoy" fijado) →
   `activa: false` → chip rojo con texto `"Afiliación Inactiva — Venció 01/01/2026"`.
2. `data.stade: 2` (independientemente de la fecha) → `activa: false`.
3. `result.success: false`, sin `data` → se muestra el bloque de error con `result.message`, sin
   la sección de titular/beneficiarios.

- [ ] **Step 4: Tests de `AffiliateStatusModal` — Escape/scroll-lock/portal**

1. Montar el modal → `document.body.style.overflow === "hidden"`; desmontar → vuelve a `""`.
2. `keydown` con `key: "Escape"` → invoca `onClose`.
3. Click en el backdrop → invoca `onClose`; click dentro del panel (`stopPropagation`) → no lo
   invoca.

- [ ] **Step 5: Correr tests y tsc (restaurar `vi.useRealTimers()`)**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 14: Tests de `src/components/web/LegalModal.tsx`

**Files:**
- Test: `tests/components/web/LegalModal.test.tsx` (crear)

**Interfaces:**
- Consume: `LegalModal({ type, onClose })` (default export). Usado por `Footer.tsx`,
  `afiliarse/page.tsx` y `contactenos/page.tsx`.

- [ ] **Step 1: Test de contenido según `type`**

1. `type="privacy"` → título `"Política de Privacidad y Tratamiento de Datos"`, contenido incluye
   la sección `"1. Responsable del Tratamiento"`.
2. `type="terms"` → título `"Términos y Condiciones"`, contenido incluye
   `"1. Descripción del Servicio"`.

- [ ] **Step 2: Test de cierre — Escape, backdrop, botones**

1. `keydown` con `key: "Escape"` → invoca `onClose`.
2. Click en el backdrop (`onClick` en el contenedor externo) → invoca `onClose`; click dentro del
   panel (`stopPropagation`) → no lo invoca.
3. Click en el botón "×" del header o en "Entendido" del footer → ambos invocan `onClose`.

- [ ] **Step 3: Test de scroll-lock y portal**

1. Montar → `document.body.style.overflow === "hidden"`; desmontar → se restaura a `""`.
2. El modal se renderiza en `document.body` (portal), no dentro del contenedor de test.

- [ ] **Step 4: Correr tests y tsc**
- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 15: Tests de `src/components/web/Navbar.tsx`

**Files:**
- Test: `tests/components/web/Navbar.test.tsx` (crear)

**Interfaces:**
- Consume: `Navbar()`.
- Mockear `next/navigation` (`usePathname`).

- [ ] **Step 1: Test de resaltado del link activo**

1. `usePathname` retorna `"/web/servicios"` → el link "Servicios" tiene la clase
   `text-[#E8192C]` (activo); los demás tienen la clase neutra (`text-[#64748B]`).
2. `usePathname` retorna `"/web/afiliarse"` → el CTA "Afíliate" tiene `opacity-90` adicional.

- [ ] **Step 2: Test del menú móvil**

1. Render inicial → el panel móvil no se muestra (`mobileOpen: false`).
2. Click en el botón hamburguesa → se abre (`aria-expanded="true"`, ícono cambia a `"close"`) y se
   muestra la lista de links duplicada para móvil.
3. Cambiar `usePathname` (simulando navegación, vía `rerender` con un nuevo valor mockeado) → el
   menú móvil se cierra automáticamente (`useEffect` que resetea `mobileOpen` en cada cambio de
   `pathname`).

- [ ] **Step 3: Correr tests y tsc**
- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 16: Tests de `src/components/web/Footer.tsx`

**Files:**
- Test: `tests/components/web/Footer.test.tsx` (crear)

**Interfaces:**
- Consume: `Footer()`.
- Mockear `global.fetch`.

**Contexto verificado:** endpoint real usado — `GET /api/public/franchises`. **Tampoco está en la
lista de endpoints públicos documentados** dada como referencia — segundo hallazgo de endpoint no
documentado en esta fase (además de `affiliate-status` de la Tarea 12). Reportarlo junto al de la
Tarea 12.

- [ ] **Step 1: Test de carga y filtro de franquicias**

1. `fetch` resuelve `{ ok: true, json: async () => ({ data: [{ id: 1, name: "Sede Centro", address: "calle 10", city: { id: 1, name: "armenia" } }, { id: 2, name: "Sede Sin Dirección", address: null, city: null }] }) }`
   → solo se lista la franquicia con `address` no vacío (`filter((f) => !!f.address?.trim())`); la
   ciudad/dirección se muestran en Title Case (`"Armenia: Calle 10"`, vía `toTitleCase`).
2. `fetch` rechaza o resuelve `ok: false` → `franchises` queda `[]`, la sección "Nuestras Sedes" se
   renderiza vacía sin romper el resto del footer.

- [ ] **Step 2: Test de los modales legales**

1. Click en "Aviso de Privacidad" → se renderiza `LegalModal` con `type="privacy"`.
2. Click en "Términos y Condiciones" → se renderiza `LegalModal` con `type="terms"`.
3. Cerrar el modal (`onClose`) → `legalModal` vuelve a `null`.

- [ ] **Step 3: Test del copyright**

1. `vi.setSystemTime(new Date("2026-01-01"))` → el texto de copyright incluye `"2026"`
   (`new Date().getFullYear()`).

- [ ] **Step 4: Correr tests y tsc**
- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 17: Tests de `src/components/web/AlliesSection.tsx` (Server Component async)

**Files:**
- Test: `tests/components/web/AlliesSection.test.tsx` (crear)

**Interfaces:**
- Consume: `AlliesSection()` (async, sin props). Usado en `src/app/web/page.tsx`.

**Contexto verificado:** endpoint real — `GET /api/public/content-allies` (sí está en la lista de
endpoints documentados). Usar el patrón de "Server Components asíncronos" de los Global
Constraints para renderizarlo.

- [ ] **Step 1: Test con datos**

1. `fetch` resuelve `{ ok: true, json: async () => ({ data: [{ id: 1, image: "logo1.png", url: "https://aliado.com", position: 1 }] }) }`
   → tras `await AlliesSection()` y `render(jsx)`, se muestra un link `<a>` con `href="https://aliado.com"`,
   `target="_blank"`, y una imagen cuyo `src` es `${API_URL}/storage/logo1.png`.

- [ ] **Step 2: Test de los caminos vacíos**

1. `fetch` resuelve `{ ok: true, json: async () => ({ data: [] }) }` → `AlliesSection()` retorna
   `null` (la sección entera no se renderiza).
2. `fetch` resuelve `{ ok: false }` → `getAllies()` captura y retorna `[]` → mismo resultado
   (`null`).
3. `fetch` rechaza (error de red) → el `catch` interno también retorna `[]` → `null`.

- [ ] **Step 3: Correr tests y tsc**
- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 18: Tests de `src/components/web/DoctorsSection.tsx` (Server Component async)

**Files:**
- Test: `tests/components/web/DoctorsSection.test.tsx` (crear)

**Interfaces:**
- Consume: `DoctorsSection()` (async, sin props). Usado en `src/app/web/page.tsx`.

**Contexto verificado:** endpoint real — `GET /api/public/content-specialists` (sí está en la
lista documentada). Mismo patrón de test de Server Component async que la Tarea 17.

- [ ] **Step 1: Test con datos**

1. `fetch` resuelve `{ ok: true, json: async () => ({ data: [{ id: 1, name: "Dra. Ana Ruiz", specialty: "Pediatría", photo: "ana.jpg", position: 1 }] }) }`
   → tras `await DoctorsSection()` y `render(jsx)`, se muestra el nombre, la especialidad, y una
   imagen con `src="${API_URL}/storage/ana.jpg"`.

- [ ] **Step 2: Test de los caminos vacíos**

1. `data: []`, respuesta no-`ok`, y `fetch` rechazando → los 3 casos hacen que `DoctorsSection()`
   retorne `null` (misma lógica de `getSpecialists()` con `try/catch` y `?? []`).

- [ ] **Step 3: Correr tests y tsc**
- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 19: Tests de las superficies estáticas/de composición (`web/page.tsx`, `web/layout.tsx`, `HeroSection`, `QuickAccessSection`, `AboutSection`, `quienes-somos/page.tsx`, `servicios/page.tsx`)

**Files:**
- Test: `tests/app/web/page.test.tsx` (crear)
- Test: `tests/app/web/layout.test.tsx` (crear)
- Test: `tests/components/web/HeroSection.test.tsx` (crear)
- Test: `tests/components/web/QuickAccessSection.test.tsx` (crear)
- Test: `tests/components/web/AboutSection.test.tsx` (crear)
- Test: `tests/app/web/quienes-somos/page.test.tsx` (crear)
- Test: `tests/app/web/servicios/page.test.tsx` (crear)

**Interfaces:**
- Consume: `WebPage()`, `WebLayout({ children })`, `HeroSection()`, `QuickAccessSection()`,
  `AboutSection()`, `QuienesSomosPage()`, `ServiciosPage()`.

**Contexto verificado:** ninguno de estos 7 archivos tiene estado, efectos, ni fetch — son
composición de secciones o contenido 100% estático (arrays `STATS`/`CHECKLIST_ITEMS`/
`HOME_SERVICES`/`SPECIALTIES` mapeados a JSX). Por eso los tests aquí son deliberadamente ligeros
(smoke + aserciones de contenido puntual), no exhaustivos como los de páginas con lógica real
(Tareas 20-22) — consistente con la Decisión 1 del spec aplicada a páginas de puro contenido.

- [ ] **Step 1: Test de `WebPage` (`src/app/web/page.tsx`)**

Mockear los 5 componentes hijos (`HeroSection`, `QuickAccessSection`, `AboutSection`,
`AlliesSection`, `DoctorsSection`) con stubs mínimos — ya testeados por separado (Tareas 13/17/18/
19).

1. Renderiza las 5 secciones en el orden `Hero → QuickAccess → About → Allies → Doctors` (verificar
   con `container.textContent` o el orden de los `data-testid` de los stubs).

- [ ] **Step 2: Test de `WebLayout` (`src/app/web/layout.tsx`)**

Mockear `Navbar`/`Footer` con stubs (ya testeados en Tareas 15/16).

1. Renderiza `Navbar`, el `children` recibido, y `Footer`, en ese orden.

- [ ] **Step 3: Test de `HeroSection`**

Mockear `AffiliateConsultWidget` (ya testeado en Tarea 13).

1. Muestra el `h1` con "Los Mejores Especialistas a tu Alcance" y el widget de consulta.

- [ ] **Step 4: Test de `QuickAccessSection`**

1. Las 4 tarjetas están presentes; el link de "Guía Médica" apunta a `/web/guia-medica` y el de
   "Afíliate" a `/web/afiliarse` (verificar `href` con `screen.getByRole("link", { name: /.../ })`).

- [ ] **Step 5: Test de `AboutSection`**

1. Muestra los 3 badges de experiencia (`"15+"`, `"+5"`, `"500+"`) y el link "Conoce más sobre
   nosotros" con `href="/web/quienes-somos"`.

- [ ] **Step 6: Test de `QuienesSomosPage`**

1. Muestra los 3 valores de `STATS` (`"15+"`, `"+5"`, `"500+"`) con sus labels (`"Años"`,
   `"Ciudades"`, `"Médicos"`).
2. Muestra los 4 items de `CHECKLIST_ITEMS`.
3. El CTA final ("Afíliate ahora") apunta a `/web/afiliarse`.

- [ ] **Step 7: Test de `ServiciosPage`**

1. Se listan los 6 `HOME_SERVICES` (por título) y las 20 `SPECIALTIES` (por texto).
2. Los 2 CTAs finales apuntan a `/web/guia-medica` y `/web/afiliarse` respectivamente.

- [ ] **Step 8: Correr tests y tsc**
- [ ] **Step 9: Commit**

**Checkpoint.**

---

### Tarea 20: Tests de `src/app/web/afiliarse/page.tsx`

**Files:**
- Test: `tests/app/web/afiliarse/page.test.tsx` (crear)

**Interfaces:**
- Consume: `AfiliacioPage()` (default export).
- Mockear `global.fetch`, `react-google-recaptcha` (`ReCAPTCHA`, como componente stub que expone un
  botón de test para simular `onChange(token)`), `@/lib/api` (`csrf`, `getXsrfToken`), y
  `@/components/web/LegalModal` (ya testeado en Tarea 14).

**Contexto verificado:** endpoint real — `POST /api/public/affiliate-request` (documentado). Los
catálogos de departamento/ciudad se cargan con funciones **privadas del archivo** (`getDepartments`/
`getCitiesByDepartment`, no exportadas) que llaman `GET /api/public/departments` y
`GET /api/public/departments/{id}/cities` respectivamente — se ejercitan solo a través del
comportamiento visible de la página (mockeando `fetch`), no importándolas directamente.

```ts
vi.mock("react-google-recaptcha", () => ({
  default: React.forwardRef((props: any, ref: any) => (
    <button type="button" data-testid="recaptcha-stub" onClick={() => props.onChange("captcha-token")}>
      recaptcha stub
    </button>
  )),
}));
```

- [ ] **Step 1: Test de carga de catálogos y cascada departamento → ciudad**

1. Al montar, `fetch` es llamado hacia `/api/public/departments`; los departamentos recibidos
   pueblan el `<select>` de "Departamento".
2. Seleccionar un departamento → dispara `fetch` hacia
   `/api/public/departments/{id}/cities`; el `<select>` de "Ciudad" pasa de `disabled` a habilitado
   y se llena con las ciudades recibidas.
3. Volver a `""` el departamento → el `<select>` de ciudad se vacía y vuelve a `disabled`.

- [ ] **Step 2: Test de beneficiarios dinámicos**

1. Seleccionar `"3 beneficiarios"` en el select de cantidad → aparecen 3 bloques
   "Beneficiario 1/2/3", cada uno con su input de nombre.
2. Reducir a `"1 beneficiario"` → solo queda el primer bloque, con el nombre ya escrito preservado
   (`prev.slice(0, count)`).
3. Aumentar de 1 a 2 → el nuevo bloque aparece vacío, el primero conserva lo escrito.

- [ ] **Step 3: Test de validaciones — cada regla real del `validate()`**

Sin llenar ningún campo, click en "Enviar solicitud":

1. Errores mostrados: nombre, apellidos, cédula (`/^\d+$/`), celular (`/^\d{10}$/`), correo (regex
   simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), fecha de nacimiento, dirección, departamento, ciudad,
   captcha, política de privacidad, términos y condiciones — verificar al menos 4-5 mensajes
   exactos del código real (ej. `"El celular debe tener exactamente 10 dígitos."`).
2. El foco/scroll se dirige al primer campo con error (`scrollIntoView` — mockear
   `Element.prototype.scrollIntoView` con `vi.fn()` porque jsdom no lo implementa).
3. Con un beneficiario agregado y su nombre vacío → error `"El nombre del beneficiario es requerido."`
   bajo ese bloque específico (`errors.ben_0`).
4. Llenar `movil` con letras → el input las descarta automáticamente (`replace(/\D/g, "")`,
   truncado a 10 dígitos con `.slice(0, 10)`).

- [ ] **Step 4: Test de envío exitoso**

Con todos los campos válidos, incluyendo click en el stub de reCAPTCHA y ambos checkboxes:

1. Submit → `csrf()` se llama antes del `fetch`; `fetch` `POST` a `/api/public/affiliate-request`
   con el body exacto: `{ name, lastname, document: cedula, movil, email, birth_date: birthDate, address, department_id: deptId, city_id: cityId, beneficiaries, advisor_name: advisorName, recaptcha_token: captchaToken }`.
2. Respuesta `{ ok: true }` con `data.success !== false` → se muestra la pantalla de éxito con
   `responseMsg` (o el mensaje default); click en "Enviar otra solicitud" → vuelve al formulario
   vacío (`submitState: "idle"`, todos los campos reseteados).

- [ ] **Step 5: Test de envío fallido**

1. Respuesta `{ ok: true, json: () => ({ success: false, message: "Cédula duplicada" }) }` → se
   muestra el bloque de error con ese mensaje; el stub de reCAPTCHA se "resetea"
   (`recaptchaRef.current?.reset()` — verificar que no rompe si el stub no implementa `.reset`, o
   exponerlo en el mock) y `captchaToken` vuelve a `null` (el botón de enviar vuelve a
   deshabilitarse hasta volver a tocar el captcha).
2. `fetch` rechaza (error de red) → mensaje `"No se pudo conectar con el servidor. Intenta más tarde."`.

- [ ] **Step 6: Test del modal legal**

1. Click en "Política de Privacidad" dentro del texto del checkbox → abre `LegalModal type="privacy"`.
2. Click en "Términos y Condiciones" → abre `LegalModal type="terms"`.

- [ ] **Step 7: Correr tests y tsc**
- [ ] **Step 8: Commit**

**Checkpoint.**

---

### Tarea 21: Tests de `src/app/web/contactenos/page.tsx`

**Files:**
- Test: `tests/app/web/contactenos/page.test.tsx` (crear)

**Interfaces:**
- Consume: `ContactenosPage()` (default export).
- Mismo patrón de mocks que la Tarea 20 (`fetch`, `react-google-recaptcha`, `@/lib/api`,
  `LegalModal`).

**Contexto verificado:** endpoint real — `POST /api/public/contact` (documentado). Estructura
prácticamente idéntica a `afiliarse/page.tsx` pero SIN beneficiarios ni cédula, y con contador de
caracteres en el mensaje.

- [ ] **Step 1: Test de carga de catálogos y cascada departamento → ciudad**

Mismo comportamiento que la Tarea 20 Step 1, aplicado a esta página (departamentos/ciudades vía
`fetch` directo a los mismos endpoints públicos).

- [ ] **Step 2: Test de validaciones propias de este formulario**

1. `asunto` vacío → error `"Selecciona un asunto."`; el `<select>` de asunto tiene las 5 opciones
   de `ASUNTOS` (`"Información sobre planes"`, `"Soporte técnico"`, `"Quejas y reclamos"`,
   `"Solicitud de información"`, `"Otro"`).
2. `mensaje` con menos de 10 caracteres (pero no vacío) → error
   `"El mensaje debe tener al menos 10 caracteres."`; vacío → `"El mensaje es requerido."`.
3. El contador de caracteres bajo el textarea (`{mensaje.length} caracteres`) se actualiza al
   escribir.
4. `movil` con formato inválido → mismo mensaje que en `afiliarse` (`"El celular debe tener
   exactamente 10 dígitos."`) y mismo filtrado a solo-dígitos truncado a 10.

- [ ] **Step 3: Test de envío exitoso**

1. Submit válido → `fetch` `POST` a `/api/public/contact` con body
   `{ name, movil, email, asunto, department_id: deptId, city_id: cityId, mensaje, recaptcha_token: captchaToken }`.
2. Éxito → pantalla de confirmación; botón "Enviar otro mensaje" → llama `resetForm()` (verificar
   que también invoca `recaptchaRef.current?.reset()`, a diferencia de `afiliarse` que resetea el
   captcha inline — documentar esta pequeña diferencia si aparece al implementar, no es motivo de
   fallo).

- [ ] **Step 4: Test de envío fallido y modal legal**

Mismo patrón que la Tarea 20 Steps 5-6, adaptado a los mensajes de esta página.

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 22: Tests de `src/app/web/guia-medica/page.tsx`

**Files:**
- Test: `tests/app/web/guia-medica/page.test.tsx` (crear)

**Interfaces:**
- Consume: `GuiaMedicaPage()` (default export).
- Mockear `global.fetch`.

**Contexto verificado:** endpoints reales usados — `GET /api/public/departments`,
`GET /api/public/departments/{id}/cities`, `GET /api/public/specialties`,
`GET /api/public/doctors` (todos documentados). **Hallazgo a documentar (no corregir en este
plan):** no hay debounce en la búsqueda por texto — cada tecleo dispara `fetchDoctors()` de
inmediato vía el efecto que depende de `search` (a diferencia de `DataTable`, que sí debounce-a
300ms). Escribir el test confirmando este comportamiento real (cada cambio de `search` dispara una
llamada `fetch` nueva), no asumir un debounce que no existe.

- [ ] **Step 1: Test de carga inicial**

1. Al montar, `fetch` se llama para `departments`, `specialties`, y `doctors` (con
   `page=1&per_page=12`, sin `search`/`department_id`/`city_id`/`specialty_id`).
2. Mientras `loading: true` → se muestran 6 tarjetas esqueleto (`animate-pulse`).
3. Tras resolver con `meta.total: 0` → mensaje `"No se encontraron médicos con esos filtros."`.
4. Tras resolver con datos → mensaje `"Mostrando N de M médicos"` (pluralización: singular cuando
   `meta.total === 1`).

- [ ] **Step 2: Test de filtros — cascada y reset de página**

1. Escribir en el buscador → dispara un nuevo `fetch` con el parámetro `search` incluido (sin
   debounce, confirmando el hallazgo de arriba) y resetea `page` a `1` (`handleFilterChange`).
2. Seleccionar un departamento → dispara `fetch` a `/api/public/departments/{id}/cities`, resetea
   `page` a `1`, y el `<select>` de ciudad deja de estar `disabled`.
3. Seleccionar una especialidad → incluye `specialty_id` en la siguiente llamada a
   `getDoctors`.
4. Con al menos un filtro activo → aparece el botón "Limpiar"; click → resetea `search`,
   `deptId`, `cityId`, `specialtyId` y `page` a sus valores iniciales.

- [ ] **Step 3: Test de la tarjeta de médico (`DoctorCard`)**

1. `doctor.movil` presente → se usa como contacto mostrado; `doctor.movil: null`, `doctor.phone`
   presente → se usa `phone` en su lugar (`doctor.movil || doctor.phone`).
2. `doctor.specialty` presente → se muestra el nombre de la especialidad en mayúsculas
   estilizadas; ausente → no se renderiza esa línea.
3. `doctor.address`/`doctor.city` ausentes → sus líneas correspondientes no se renderizan (cada
   una es condicional).

- [ ] **Step 4: Test de paginación**

1. `meta.last_page > 1` → se muestran los botones "Anterior"/"Siguiente"; en la página 1,
   "Anterior" está deshabilitado; en la última página, "Siguiente" está deshabilitado.
2. Click en "Siguiente" → incrementa `page`, dispara un nuevo `fetch` con `page` actualizado.
3. `meta.last_page <= 1` → no se muestra el paginador.

- [ ] **Step 5: Correr tests y tsc**
- [ ] **Step 6: Commit**

**Checkpoint — fin de la Parte A (sitio web público).**

---

### Tarea 23: Umbral de cobertura — medir y fijar en `vitest.config.ts`

**Files:**
- Modificar: `vitest.config.ts` (`coverage.thresholds`)

**Contexto verificado:** hoy `coverage.thresholds = { lines: 0, branches: 0, functions: 0, statements: 0 }`
en `vitest.config.ts` (líneas 12-17). El spec pide fijar este umbral con el número real medido
tras completar las 4 fases, redondeado hacia abajo con margen razonable (ej. resultado 87% → 85%)
— **no inventar el número de antemano**, correr la medición real primero.

- [ ] **Step 1: Correr la suite completa con cobertura**

```bash
npm run test:coverage
```

Esto ejecuta `vitest run --coverage` (provider `v8`, reportes `text` + `html`, alcance
`src/**/*.{ts,tsx}` según `vitest.config.ts`).

- [ ] **Step 2: Anotar el resultado real**

Registrar en el reporte de esta tarea (no en este plan, que no puede predecir el número) el
porcentaje real de `% Lines`, `% Branches`, `% Functions`, `% Statements` que muestra la tabla de
resumen impresa en consola (reporter `text`) tras correr el Step 1, ejecutado al final de la Fase 4
con TODO el trabajo de las Tareas 1-22 ya commiteado.

- [ ] **Step 3: Fijar el umbral con margen**

Para cada una de las 4 métricas, tomar el número real medido en el Step 2, redondear hacia abajo al
múltiplo de 5 más cercano por debajo (ej. `87.4% → 85`, `91% → 90`, `78.9% → 75`) y escribir ese
valor en `vitest.config.ts`:

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "html"],
  include: ["src/**/*.{ts,tsx}"],
  thresholds: { lines: <valor medido>, branches: <valor medido>, functions: <valor medido>, statements: <valor medido> },
},
```

Si alguna métrica queda por debajo de lo esperado por el mínimo aceptable de `dev-standards`
(85-90%), documentarlo como hallazgo en el reporte de esta tarea — **no** inflar el umbral por
encima de lo medido para "aparentar" cumplir la meta.

- [ ] **Step 4: Correr `npm run test:coverage` de nuevo para confirmar que el build no rompe con el nuevo umbral**

Expected: la suite sigue en verde; ningún archivo cae por debajo del umbral recién fijado (si
alguno cae, es porque el número se fijó mal en el Step 3 — ajustar hacia abajo, no borrar tests).

- [ ] **Step 5: Commit**

**Checkpoint final de la Fase 4.**

---

## Verificación final de la Fase 4

- [ ] Suite completa (`npm run test`) en verde — incluye los tests nuevos de las 23 tareas más
  todos los de las Fases 1-3 sin regresiones.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run test:coverage`: confirmar que el % final coincide con el umbral fijado en la
  Tarea 23 y que ninguna métrica quedó por debajo de él.
- [ ] Revisar que la tabla de clasificación de `src/components/*` (sección al inicio de este plan)
  siga siendo válida — si alguna tarea encontró que un archivo clasificado como "código muerto" en
  realidad se usa en algún lugar no detectado por los `Grep` iniciales, documentarlo como hallazgo
  y decidir si amerita un test adicional (no lo asuma de antemano; corregir la tabla si aplica).
- [ ] Revisar el diff completo antes de decidir cómo integrar esta fase — el usuario decide cuándo
  y cómo mergear/pushear (recordar: no hacer commits/push no solicitados).
- [ ] Con las 4 fases completas, confirmar que `docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`
  quedó totalmente cubierto: Decisión 1 (clasificación de `src/components/*`, hecha en la sección
  inicial de este plan), Decisión 2 (fases por riesgo, ya ejecutadas en orden), metodología de
  mocks/ubicación (aplicada en las 4 fases), y el umbral de cobertura (fijado en la Tarea 23).
