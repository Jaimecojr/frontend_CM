# Retrofit dev-standards Frontend — Seguimiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los 5 hallazgos de la segunda auditoría de `dev-standards` en el frontend: eliminar
la duplicación de `getDepartments`/`getCitiesByDepartment` en 5 `fetch.ts` (y la dependencia cruzada
`doctors` → `counselors` que provocaba), quitar los `as any`/`any` innecesarios en 3 formularios de
catálogo (y los sitios relacionados en `doctors`/`specialties`), documentar el comportamiento no
obvio de `useOptimisticToggle.ts` y tipar/documentar `getApiErrorMessage.ts`, agregar tests a 3
componentes transversales sin cobertura (`auth-layout.tsx`, `ui-elements/alert`, `Breadcrumb.tsx`,
resolviendo primero la discrepancia de mensajes de `LoadingOverlay` documentada vs. implementada),
y — de menor prioridad — extraer hooks de `_hooks/` en `account/page.tsx` y `doctors/page.tsx`.

**Architecture:** El Hallazgo 1 (extraer `src/lib/geo.ts`) va primero porque es mecánico, de bajo
riesgo, y desbloquea la limpieza de `DoctorForm.tsx` sin arrastrar la dependencia cruzada a
`counselors`. Luego el Hallazgo 4.1 (decisión sobre los mensajes de `LoadingOverlay` en
`auth-layout.tsx`) va antes que su test, para no congelar el bug actual como "comportamiento
correcto". Los Hallazgos 2 y 3 se dividen en tareas independientes por archivo (pueden ejecutarse en
cualquier orden entre sí). El Hallazgo 5 queda al final por ser menor prioridad y no bloquear nada.

**Tech Stack:** Next.js/TypeScript (`strict: true`), Vitest + Testing Library, `npx tsc --noEmit`
para verificar tipos tras cada cambio que toque un `any`/`as any`.

**Spec:** `docs/superpowers/specs/2026-09-16-retrofit-dev-standards-frontend-seguimiento-design.md`

## Global Constraints

- **Idioma del código — corrección frente a la instrucción original de este plan:** se pidió
  documentar aquí "comentarios y nombres de variables en español", copiando el criterio del plan
  hermano `2026-08-25-retrofit-dev-standards-frontend.md`. La investigación de este plan (lectura
  completa de `CLAUDE.md` del frontend, línea 308) muestra que esa regla **ya fue revertida**:
  > "Idioma: El código en sí —comentarios, nombres de funciones/hooks/componentes, variables— debe
  > estar en **inglés**... esto revierte la regla anterior de este documento; mismo criterio ya
  > adoptado en el backend... Todo el texto de la interfaz que ve el usuario final —labels,
  > placeholders, tooltips, mensajes de `alert()`— sigue en **español**."

  Esto coincide con el código real verificado en esta ronda (`useOptimisticToggle.ts`,
  `useRequireAuth.ts`, `getApiErrorMessage.ts`, `useAffiliateFormState.ts`, tests bajo `tests/app/`)
  — todos sus comentarios están en inglés, y solo los strings `describe()`/`it()` y los mensajes
  `alert.*`/validación siguen en español. **Regla aplicada en este plan:** código (comentarios,
  nombres de función/hook/componente/variable) en **inglés**; strings de UI, mensajes de
  `alert.*`/validación, y los textos de `describe()`/`it()` de los tests, en **español**.
- **No hacer `git commit` dentro de las tareas.** Cada tarea termina en un checkpoint de
  verificación — el usuario decide cuándo integrar.
- **Convención de tests:** carpeta espejo bajo `tests/` (NO colocación junto al archivo). Confirmado
  leyendo `tests/hooks/useRequireAuth.test.ts`, `tests/components/LoadingOverlay.test.tsx`,
  `tests/app/4dnn1n/settings/page.test.tsx`, `tests/app/4dnn1n/account/page.test.tsx`.
- **`vi.mock()` usa siempre el alias `@/...`**, incluso cuando el archivo bajo prueba importa el
  módulo con una ruta relativa (`../fetch`, `./providers`) — Vitest resuelve el mock por la ruta
  final, no por el string literal que usa el importador. Patrón confirmado en
  `tests/app/4dnn1n/account/page.test.tsx:11-14` y en más de 15 archivos bajo `tests/app/4dnn1n/`.
- `tsconfig.json` ya tiene `strict: true` — no requiere cambio de configuración.
- Correr `npx tsc --noEmit` después de quitar cada `any`/`as any` para confirmar que no se rompe el
  build de tipos. `vitest.config.ts` ya tiene umbrales de cobertura altos
  (`lines: 90, branches: 85, functions: 80, statements: 90`) — cualquier archivo nuevo sin test baja
  el promedio, así que cada tarea de código nuevo (Hallazgo 1, Hallazgo 4, Hallazgo 5) incluye su
  test correspondiente en el mismo checkpoint.
- Comando de test puntual: `npx vitest run <ruta-del-archivo>`. Comando de suite completa:
  `npm run test` (en Windows, si se usa `Http::fake`-equivalente con red simulada, no aplica aquí —
  es una nota del backend; el frontend no tiene el problema de segfault de PHP).

---

### Task 1: Extraer `src/lib/geo.ts` — resuelve Hallazgo 1 (duplicación + dependencia cruzada)

**Files:**
- Create: `src/lib/geo.ts`
- Create: `tests/lib/geo.test.ts`
- Modify: `src/app/4dnn1n/affiliates/fetch.ts:1-2,76-93`
- Modify: `src/app/4dnn1n/appointments/fetch.ts:1-2,122-136`
- Modify: `src/app/4dnn1n/agreements/fetch.ts:1-2,31-45`
- Modify: `src/app/4dnn1n/counselors/fetch.ts:1-2,51-65`
- Modify: `src/app/4dnn1n/franchises/fetch.ts:1-2,48-60`
- Modify: `src/app/4dnn1n/doctors/_components/DoctorForm.tsx:7`

**Interfaces:**
- Produce: `src/lib/geo.ts` exporta `getDepartments(): Promise<Department[]>` y
  `getCitiesByDepartment(departmentId: number): Promise<City[]>`, más un re-export de tipo de
  `Department`/`City` desde `@/types/geo` (`export type { Department, City } from "@/types/geo";`).
  Los 5 `fetch.ts` y `DoctorForm.tsx` consumen estas dos funciones desde aquí en adelante.

**Contexto verificado:** el cuerpo de ambas funciones es idéntico palabra por palabra en los 5
archivos (confirmado leyendo los 5 completos). `affiliates/fetch.ts` y `appointments/fetch.ts`
importan `Department`/`City` desde su propio `./types` local, pero ese archivo a su vez hace
`import type { Department, City } from "@/types/geo"; export type { Department, City };` — son el
mismo tipo en los 5 módulos, confirmado por separado en `affiliates/types.ts` y
`appointments/types.ts`. `DoctorForm.tsx:7` hoy importa
`import { getDepartments, getCitiesByDepartment } from "../../counselors/fetch";` — esta es la
dependencia cruzada `doctors` → `counselors` que este task elimina; `DoctorForm.tsx:8` ya importa
`Department`/`City` directamente desde `@/types/geo`, no necesita cambios ahí.
`src/lib/memCache.ts` ya expone `TTL_GEO` (30 min) y el singleton `memCache` — se reutilizan tal
cual, sin cambios.

Los 5 `tests/app/4dnn1n/*/fetch.test.ts` ya tienen `describe("getDepartments")` /
`describe("getCitiesByDepartment")` duplicados (confirmado en los 5, ej.
`tests/app/4dnn1n/agreements/fetch.test.ts:114-201`). Como esos tests mockean `@/lib/api` y
`@/lib/memCache` a nivel de módulo (no el archivo `fetch.ts` en sí), y `src/lib/geo.ts` importará
esos mismos dos módulos, los mocks siguen aplicando de forma transitiva cuando `fetch.ts` re-exporta
desde `geo.ts` — no deberían requerir cambios. Este task **no** borra esos 5 bloques de test
duplicados (deduplicar tests no es parte del Hallazgo 1, que es sobre el código de producción) — el
Step de verificación confirma que siguen en verde tal cual están.

- [ ] **Step 1: Crear `src/lib/geo.ts`**

```ts
import { apiFetch } from "@/lib/api";
import { memCache, TTL_GEO } from "@/lib/memCache";
import type { Department, City } from "@/types/geo";

export type { Department, City } from "@/types/geo";

type ApiResponse<T> = { message: string; data: T };

/**
 * Departments and cities used by the location selectors across several
 * modules (affiliates, agreements, appointments, counselors, franchises,
 * doctors). Lives here — not inside any single domain module — because
 * 6+ modules consume it equally; nesting it inside one of them would
 * reintroduce a cross-module dependency (see `DoctorForm.tsx`, which used
 * to import these from `counselors/fetch.ts`).
 */
export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(`/api/departments/${departmentId}/cities`);
    return res.data ?? [];
  });
}
```

- [ ] **Step 2: Crear `tests/lib/geo.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
import { apiFetch } from "@/lib/api";
import { memCache, TTL_GEO } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: {
    get: vi.fn((key, ttl, fn) => fn()),
  },
  TTL_GEO: 1800000,
}));

describe("geo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDepartments", () => {
    it("llama apiFetch con /api/departments", async () => {
      // Arrange
      const mockDepts = [{ id: 1, name: "Bogotá" }];
      (apiFetch as any).mockResolvedValue({ data: mockDepts });

      // Act
      const result = await getDepartments();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/departments");
      expect(result).toEqual(mockDepts);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getDepartments();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'departments' con TTL_GEO", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getDepartments();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("departments", TTL_GEO, expect.any(Function));
    });
  });

  describe("getCitiesByDepartment", () => {
    it("llama apiFetch con /api/departments/{departmentId}/cities", async () => {
      // Arrange
      const mockCities = [{ id: 1, name: "Bogotá", department_id: 7 }];
      (apiFetch as any).mockResolvedValue({ data: mockCities });

      // Act
      const result = await getCitiesByDepartment(7);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/departments/7/cities");
      expect(result).toEqual(mockCities);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getCitiesByDepartment(7);

      // Assert
      expect(result).toEqual([]);
    });

    it("genera claves de caché distintas para departamentos diferentes", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCitiesByDepartment(7);
      await getCitiesByDepartment(15);

      // Assert
      const calls = (memCache.get as any).mock.calls;
      expect(calls[0][0]).toBe("cities:7");
      expect(calls[1][0]).toBe("cities:15");
    });
  });
});
```

- [ ] **Step 3: Actualizar `src/app/4dnn1n/affiliates/fetch.ts`**

Cambiar el import de la línea 2:
```ts
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
```
por (ya no se usa `TTL_GEO` en este archivo):
```ts
import { memCache, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
```
Reemplazar el bloque de las líneas 76-93:
```ts
// Helpers for combo boxes
export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(
  departmentId: number,
): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(
      `/api/departments/${departmentId}/cities`,
    );
    return res.data ?? [];
  });
}
```
por:
```ts
// Combo box helpers (shared implementation, see src/lib/geo.ts)
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```

- [ ] **Step 4: Actualizar `src/app/4dnn1n/appointments/fetch.ts`**

Cambiar el import de la línea 2:
```ts
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
```
por:
```ts
import { memCache, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";
```
Reemplazar el bloque de las líneas 122-136:
```ts
// ─── Departments and cities (for the city selector) ───────────────────

export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>("/api/departments");
    return res.data ?? [];
  });
}

export async function getCitiesByDepartment(departmentId: number): Promise<City[]> {
  return memCache.get(`cities:${departmentId}`, TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<City[]>>(`/api/departments/${departmentId}/cities`);
    return res.data ?? [];
  });
}
```
por:
```ts
// ─── Departments and cities (shared implementation, see src/lib/geo.ts) ───

export { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```

- [ ] **Step 5: Actualizar `src/app/4dnn1n/agreements/fetch.ts`**

Cambiar el import de la línea 2:
```ts
import { memCache, TTL_GEO, TTL_CATALOG } from "@/lib/memCache";
```
por:
```ts
import { memCache, TTL_CATALOG } from "@/lib/memCache";
```
Reemplazar el bloque de las líneas 31-45 (`getDepartments`/`getCitiesByDepartment`) por:
```ts
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```

- [ ] **Step 6: Actualizar `src/app/4dnn1n/counselors/fetch.ts`**

Cambiar el import de la línea 2:
```ts
import { memCache, TTL_GEO, TTL_CATALOG } from "@/lib/memCache";
```
por:
```ts
import { memCache, TTL_CATALOG } from "@/lib/memCache";
```
Reemplazar el bloque de las líneas 51-65 (`getDepartments`/`getCitiesByDepartment`) por:
```ts
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```

- [ ] **Step 7: Actualizar `src/app/4dnn1n/franchises/fetch.ts`**

Cambiar el import de la línea 2:
```ts
import { memCache, TTL_GEO, TTL_CATALOG } from "@/lib/memCache";
```
por:
```ts
import { memCache, TTL_CATALOG } from "@/lib/memCache";
```
Reemplazar el bloque de las líneas 48-60 (`getDepartments`/`getCitiesByDepartment`) por:
```ts
export { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```

- [ ] **Step 8: Romper la dependencia cruzada en `DoctorForm.tsx`**

En `src/app/4dnn1n/doctors/_components/DoctorForm.tsx:7`, cambiar:
```ts
import { getDepartments, getCitiesByDepartment } from "../../counselors/fetch";
```
por:
```ts
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
```
(La línea 8, `import type { Department, City } from "@/types/geo";`, no cambia.)

- [ ] **Step 9: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores — los re-exports preservan la firma exacta que cada consumidor ya usaba.

- [ ] **Step 10: Correr los tests afectados**

Run: `npx vitest run tests/lib/geo.test.ts tests/app/4dnn1n/affiliates/fetch.test.ts tests/app/4dnn1n/appointments/fetch.test.ts tests/app/4dnn1n/agreements/fetch.test.ts tests/app/4dnn1n/counselors/fetch.test.ts tests/app/4dnn1n/franchises/fetch.test.ts tests/app/4dnn1n/doctors/_components/DoctorForm.test.tsx`
Expected: todos en verde, incluidos los `describe("getDepartments")`/`describe("getCitiesByDepartment")` ya existentes en los 5 archivos de `fetch.test.ts` (ahora ejercitan la implementación re-exportada desde `geo.ts`, sin cambios en esos archivos de test).

- [ ] **Step 11: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones en ningún otro módulo.

**Checkpoint — no hacer commit.**

---

### Task 2: Hallazgo 4.1 — decisión sobre mensajes de `LoadingOverlay` + implementarlos en `auth-layout.tsx` + test

**Files:**
- Modify: `src/app/4dnn1n/auth-layout.tsx:13,15`
- Test: `tests/app/4dnn1n/auth-layout.test.tsx` (crear)

**Interfaces:** ninguna nueva — `LoadingOverlay` ya acepta `message?: string` (confirmado leyendo
`src/components/LoadingOverlay.tsx:9`, default `"Cargando"`).

**Decisión tomada (documentada aquí, no solo en el código):** implementar los dos mensajes
distintos, **no** actualizar la documentación para "aceptar" un solo mensaje genérico. Evidencia que
respalda esta decisión — es la de menor riesgo y ya está completamente especificada:

1. `CLAUDE.md` del frontend, sección "LoadingOverlay — Pantalla de carga del panel admin", línea
   264, dice explícitamente: `auth-layout.tsx: message="Validando sesión" y message="Cerrando sesión"`.
2. El componente `LoadingOverlay` **ya soporta** la prop `message` (no hace falta tocarlo).
3. `tests/components/LoadingOverlay.test.tsx` ya prueba que un `message` custom se renderiza
   correctamente — la pieza reutilizable ya está verificada, solo falta que `auth-layout.tsx` la use.
4. El único motivo para la otra opción (actualizar la documentación a "un solo mensaje genérico")
   sería si hubiera evidencia de que los dos mensajes se descartaron a propósito — no la hay; el
   spec de seguimiento (Hallazgo 4, hallazgo adicional) confirma que es un gap de implementación, no
   una decisión de producto revertida.

- [ ] **Step 1: Pasar `message` en las dos ramas de `auth-layout.tsx`**

En `src/app/4dnn1n/auth-layout.tsx`, cambiar:
```tsx
  if (isLoggingOut) return <LoadingOverlay />;

  if (loading) return <LoadingOverlay />;
```
por:
```tsx
  if (isLoggingOut) return <LoadingOverlay message="Cerrando sesión" />;

  if (loading) return <LoadingOverlay message="Validando sesión" />;
```

- [ ] **Step 2: Crear `tests/app/4dnn1n/auth-layout.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthLayoutClient from "@/app/4dnn1n/auth-layout";
import { useRequireAuth } from "@/hooks/useRequireAuth";

vi.mock("@/hooks/useRequireAuth", () => ({ useRequireAuth: vi.fn() }));

vi.mock("@/components/LoadingOverlay", () => ({
  LoadingOverlay: ({ message }: { message?: string }) => (
    <div data-testid="loading-overlay">{message ?? "Cargando"}</div>
  ),
}));

vi.mock("@/components/Layouts/sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/Layouts/header", () => ({
  Header: () => <div data-testid="header" />,
}));

vi.mock("@/app/4dnn1n/providers", () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

vi.mock("nextjs-toploader", () => ({
  default: () => <div data-testid="toploader" />,
}));

function mockRequireAuth(overrides: Partial<ReturnType<typeof useRequireAuth>> = {}) {
  (useRequireAuth as any).mockReturnValue({
    user: null,
    loading: false,
    isLoggingOut: false,
    ...overrides,
  });
}

describe("AuthLayoutClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el overlay con 'Cerrando sesión' cuando isLoggingOut es true", () => {
    // Arrange
    mockRequireAuth({ isLoggingOut: true, loading: false, user: { id: 1 } });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Cerrando sesión");
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("muestra el overlay con 'Validando sesión' cuando loading es true y no está cerrando sesión", () => {
    // Arrange
    mockRequireAuth({ loading: true, isLoggingOut: false, user: null });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Validando sesión");
    expect(screen.queryByTestId("sidebar")).not.toBeInTheDocument();
  });

  it("prioriza 'Cerrando sesión' sobre 'Validando sesión' cuando ambos flags son true", () => {
    // Arrange
    mockRequireAuth({ isLoggingOut: true, loading: true, user: null });

    // Act
    render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(screen.getByTestId("loading-overlay")).toHaveTextContent("Cerrando sesión");
  });

  it("no renderiza nada cuando terminó de cargar y no hay usuario", () => {
    // Arrange
    mockRequireAuth({ loading: false, isLoggingOut: false, user: null });

    // Act
    const { container } = render(<AuthLayoutClient>contenido</AuthLayoutClient>);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza el layout completo (Providers, toploader, Sidebar, Header, children) cuando hay usuario autenticado", () => {
    // Arrange
    mockRequireAuth({ loading: false, isLoggingOut: false, user: { id: 1, name: "Ana" } });

    // Act
    render(
      <AuthLayoutClient>
        <div data-testid="children">Hola</div>
      </AuthLayoutClient>,
    );

    // Assert
    expect(screen.getByTestId("providers")).toBeInTheDocument();
    expect(screen.getByTestId("toploader")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("children")).toHaveTextContent("Hola");
    expect(screen.queryByTestId("loading-overlay")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Correr el test nuevo**

Run: `npx vitest run tests/app/4dnn1n/auth-layout.test.tsx`
Expected: 5 tests en verde.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Prueba manual (opcional pero recomendada)**

Iniciar `npm run dev`, hacer login y logout en el panel, confirmar visualmente que el overlay dice
"Validando sesión..." justo después del login (antes de que cargue el layout) y "Cerrando sesión..."
al hacer logout.

**Checkpoint — no hacer commit.**

---

### Task 3: Hallazgo 4.2 — tests de `ui-elements/alert/index.tsx` y `Breadcrumbs/Breadcrumb.tsx`

**Files:**
- Test: `tests/components/ui-elements/alert/index.test.tsx` (crear)
- Test: `tests/components/Breadcrumbs/Breadcrumb.test.tsx` (crear)

**Interfaces:** ninguna — solo tests, sin tocar producción.

**Hallazgo nuevo encontrado en la investigación (matiza el spec):** el spec describe
`ui-elements/alert/index.tsx` como de "uso transversal en todo el panel, con lógica de render
condicional" — la misma frase que usa para `Breadcrumb.tsx`. Verificado con
`grep -rn "ui-elements/alert" src` (0 resultados) y una búsqueda adicional de imports relativos
(`from "./alert"` / `from "../alert"`, 0 resultados): **este componente no tiene ningún consumidor
en `src/` hoy** — es distinto de `src/lib/alert.ts` (el helper `alert.confirm/success/error/warn`
que sí se usa en todo el panel y ya tiene test en `tests/lib/alert.test.ts`). Es fácil confundirlos
por el nombre. Se escribe el test igual — el archivo existe, tiene lógica de variantes condicional,
y el spec lo pide explícitamente — pero con prioridad más baja de la que sugiere "uso transversal":
es un componente de la plantilla base sin integrar aún, no una pieza crítica del panel en producción.

- [ ] **Step 1: Crear `tests/components/ui-elements/alert/index.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert } from "@/components/ui-elements/alert";

describe("Alert", () => {
  it("renderiza el título y la descripción con role='alert'", () => {
    // Arrange & Act
    render(<Alert variant="error" title="Error de validación" description="Revisa el formulario." />);

    // Assert
    const alertEl = screen.getByRole("alert");
    expect(alertEl).toHaveTextContent("Error de validación");
    expect(alertEl).toHaveTextContent("Revisa el formulario.");
  });

  it.each([
    ["success", "border-green"],
    ["warning", "border-[#FFB800]"],
    ["error", "border-red-light"],
  ] as const)("aplica la clase de borde correcta para variant=%s", (variant, expectedClass) => {
    // Arrange & Act
    render(<Alert variant={variant} title="T" description="D" />);

    // Assert
    expect(screen.getByRole("alert")).toHaveClass(expectedClass);
  });

  it("usa variant='error' por defecto (defaultVariants de cva)", () => {
    // Arrange & Act
    render(<Alert variant="error" title="T" description="D" />);

    // Assert
    expect(screen.getByRole("alert")).toHaveClass("border-red-light");
  });

  it("aplica className adicional pasado por props junto a las clases del variant", () => {
    // Arrange & Act
    render(<Alert variant="success" title="T" description="D" className="mi-clase-extra" />);

    // Assert
    const alertEl = screen.getByRole("alert");
    expect(alertEl).toHaveClass("mi-clase-extra");
    expect(alertEl).toHaveClass("border-green");
  });

  it("pasa el resto de props HTML (spread) al div raíz", () => {
    // Arrange & Act
    render(<Alert variant="warning" title="T" description="D" data-testid="alerta-custom" />);

    // Assert
    expect(screen.getByTestId("alerta-custom")).toBeInTheDocument();
  });

  it("renderiza un ícono SVG distinto por cada variant", () => {
    // Arrange & Act
    const { container, rerender } = render(<Alert variant="success" title="T" description="D" />);
    const successIconHtml = container.querySelector("svg")?.outerHTML;

    rerender(<Alert variant="error" title="T" description="D" />);
    const errorIconHtml = container.querySelector("svg")?.outerHTML;

    // Assert
    expect(successIconHtml).toBeTruthy();
    expect(errorIconHtml).toBeTruthy();
    expect(successIconHtml).not.toBe(errorIconHtml);
  });
});
```

- [ ] **Step 2: Crear `tests/components/Breadcrumbs/Breadcrumb.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

describe("Breadcrumb", () => {
  it("con solo pageName, arma los crumbs por defecto: link a Dashboard + label actual", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" />);

    // Assert
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/4dnn1n/home");
    expect(screen.getByText("Afiliados")).toBeInTheDocument();
  });

  it("no muestra el título h2 por defecto (showTitle=false)", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" />);

    // Assert
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("muestra el título h2 con el label del último crumb cuando showTitle=true", () => {
    // Arrange & Act
    render(<Breadcrumb pageName="Afiliados" showTitle />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Afiliados" })).toBeInTheDocument();
  });

  it("usa items multinivel en vez de pageName cuando items tiene elementos", () => {
    // Arrange & Act
    render(
      <Breadcrumb
        pageName="Ignorado"
        items={[
          { label: "Dashboard", href: "/4dnn1n/home" },
          { label: "Afiliados", href: "/4dnn1n/affiliates" },
          { label: "Editar" },
        ]}
      />,
    );

    // Assert
    expect(screen.queryByText("Ignorado")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Afiliados" })).toHaveAttribute(
      "href",
      "/4dnn1n/affiliates",
    );
    expect(screen.getByText("Editar")).toBeInTheDocument();
  });

  it("el último crumb nunca es un link, aunque tenga href", () => {
    // Arrange & Act
    render(
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/4dnn1n/home" },
          { label: "Actual", href: "/4dnn1n/actual" },
        ]}
      />,
    );

    // Assert
    expect(screen.queryByRole("link", { name: "Actual" })).not.toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });

  it("filtra el crumb por defecto sin label cuando no se pasa pageName", () => {
    // Arrange & Act
    render(<Breadcrumb />);

    // Assert: solo queda "Dashboard", y como es el único (y último) crumb, no es link
    expect(screen.getAllByText("Dashboard")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
  });

  it("aplica className adicional al contenedor", () => {
    // Arrange & Act
    const { container } = render(<Breadcrumb pageName="X" className="mi-clase" />);

    // Assert
    expect(container.firstChild).toHaveClass("mi-clase");
  });
});
```

- [ ] **Step 3: Correr los tests nuevos**

Run: `npx vitest run tests/components/ui-elements/alert/index.test.tsx tests/components/Breadcrumbs/Breadcrumb.test.tsx`
Expected: todos en verde.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

**Checkpoint — no hacer commit.**

---

### Task 4: Hallazgo 3 — JSDoc de `useOptimisticToggle.ts` y `getApiErrorMessage.ts`

**Files:**
- Modify: `src/hooks/useOptimisticToggle.ts:49-55`
- Modify: `src/lib/getApiErrorMessage.ts` (archivo completo)

**Interfaces:** cambia la firma de `getApiErrorMessage(err: any)` a `getApiErrorMessage(err: unknown): string` — el tipo de retorno ya era `string` en la práctica (todas las ramas retornan
`string`), solo se hace explícito. No cambia el comportamiento para ningún caller: cualquier
`unknown` sigue siendo un argumento válido para la función (no se restringe qué puede pasarse), y el
`catch (err)` de TypeScript ya tipa a `err` como `unknown` por defecto, así que los ~10 callers
existentes (`alert.error("Error", getApiErrorMessage(err))` en cada `catch`) no requieren cambios.

**Contexto verificado:** `useOptimisticToggle.ts` ya tiene un JSDoc de header (líneas 23-28)
explicando el patrón general; falta explicar por qué el bloque de las líneas 51-54 quita la fila de
la lista en vez de solo actualizar su estado. `getApiErrorMessage.ts` no tiene ningún JSDoc y maneja
3 formatos de error con comentarios `//` sueltos.

- [ ] **Step 1: Agregar el comentario inline en `useOptimisticToggle.ts`**

Cambiar:
```ts
      if (ok) {
        await alert.success("Actualizado", opts.successMessage(isActive));
        if (opts.stadeFilter !== "all") {
          opts.setData((prev) => prev.filter((x) => x.id !== item.id));
          opts.setMeta((m) => ({ ...m, total: m.total - 1 }));
        }
      }
```
por:
```ts
      if (ok) {
        await alert.success("Actualizado", opts.successMessage(isActive));

        // If an active `stade`/`state` filter is applied (e.g. "only active"),
        // the row we just toggled may no longer match it — remove it from the
        // visible list instead of leaving it there until the next refetch.
        // With "all" every state is visible, so the optimistic field update
        // above is already enough and the row stays in place.
        if (opts.stadeFilter !== "all") {
          opts.setData((prev) => prev.filter((x) => x.id !== item.id));
          opts.setMeta((m) => ({ ...m, total: m.total - 1 }));
        }
      }
```

- [ ] **Step 2: Reescribir `getApiErrorMessage.ts` con JSDoc y tipos**

Reemplazar el archivo completo por:
```ts
type ApiErrorShape = {
  data?: { message?: string; errors?: Record<string, string | string[]> };
};

type AxiosErrorShape = {
  response?: { data?: { message?: string; errors?: Record<string, string | string[]> } };
};

type GenericErrorShape = { message?: string };

/**
 * Normalizes any thrown value into a user-facing Spanish message.
 *
 * Three call sites produce three different error shapes, checked in order:
 * 1. Our own `ApiError` (thrown by `apiFetch` in `src/lib/api.ts`) — carries
 *    the parsed JSON body under `.data`, in Laravel's validation format
 *    (`{ message, errors: { field: string[] } }`).
 * 2. An Axios-style error (`.response.data`) — kept for any code path that
 *    might throw an Axios error instead of going through `apiFetch`.
 * 3. A plain `Error` (network failure, unexpected exception) — `.message`.
 * Falls back to a generic message when none of the three shapes match.
 */
export function getApiErrorMessage(err: unknown): string {
  const data = (err as ApiErrorShape)?.data;

  if (data?.message) {
    if (data?.errors && typeof data.errors === "object") {
      const firstField = Object.keys(data.errors)[0];
      const firstMsg = Array.isArray(data.errors[firstField])
        ? data.errors[firstField][0]
        : String(data.errors[firstField]);
      return `${data.message}: ${firstMsg}`;
    }
    return data.message;
  }

  const axiosData = (err as AxiosErrorShape)?.response?.data;
  if (axiosData?.message) {
    if (axiosData?.errors && typeof axiosData.errors === "object") {
      const firstField = Object.keys(axiosData.errors)[0];
      const firstMsg = Array.isArray(axiosData.errors[firstField])
        ? axiosData.errors[firstField][0]
        : String(axiosData.errors[firstField]);
      return `${axiosData.message}: ${firstMsg}`;
    }
    return axiosData.message;
  }

  const genericMessage = (err as GenericErrorShape)?.message;
  if (genericMessage) return genericMessage;

  return "Ocurrió un error inesperado. Intenta de nuevo.";
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores — ningún caller pasa un tipo restringido a `getApiErrorMessage`, todos usan
`catch (err)` (tipado `unknown` por TS) o literales de objeto sin anotación.

- [ ] **Step 4: Correr los tests existentes de ambos archivos**

Run: `npx vitest run tests/lib/getApiErrorMessage.test.ts tests/hooks/useOptimisticToggle.test.ts`
Expected: sin regresiones — los tests actuales llaman `getApiErrorMessage(err)` con objetos literales
sin anotación de tipo, compatibles con `unknown`.

- [ ] **Step 5: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Task 5: Hallazgo 2 — casos limpios: `AgreementForm.tsx`, `SpecialtyForm` (páginas), `DoctorForm.tsx` (onSubmit) y páginas de `doctors`

**Files:**
- Modify: `src/app/4dnn1n/agreements/_components/AgreementForm.tsx`
- Modify: `src/app/4dnn1n/doctors/specialties/new/page.tsx:31`
- Modify: `src/app/4dnn1n/doctors/specialties/[id]/edit/page.tsx:49`
- Modify: `src/app/4dnn1n/doctors/_components/DoctorForm.tsx:17`
- Modify: `src/app/4dnn1n/doctors/new/page.tsx:31`
- Modify: `src/app/4dnn1n/doctors/[id]/edit/page.tsx:47`

**Interfaces:** ninguna nueva — solo se reemplaza `any` por tipos ya exportados
(`CreateAgreementPayload` desde `agreements/fetch.ts`, `Partial<ApiSpecialty>` desde
`specialties/fetch.ts`, `Partial<ApiDoctor>` desde `doctors/fetch.ts`).

**Contexto verificado — por qué estos son los casos "limpios" (sin mismatch):**
- `AgreementForm`'s payload literal (`{name, amount, city_id, state}`) coincide campo por campo con
  `CreateAgreementPayload` ya exportado en `agreements/fetch.ts:47-52`, y
  `UpdateAgreementPayload = CreateAgreementPayload` (alias directo) — el mismo tipo sirve para
  `createAgreement` y `updateAgreement`, sin necesidad de una unión.
- `SpecialtyForm.tsx` (el componente) **ya** tiene `onSubmit: (data: Partial<ApiSpecialty>) => Promise<void>` tipado correctamente (confirmado leyendo el archivo completo) — el único `any` está
  en el `handleSubmit = async (data: any)` de las dos páginas que lo consumen, y
  `createSpecialty`/`updateSpecialty` ya aceptan `Partial<ApiSpecialty>` en `specialties/fetch.ts`.
- `DoctorForm.tsx`'s payload interno **ya** está tipado `Partial<ApiDoctor>` (confirmado leyendo el
  archivo completo) — solo la prop `onSubmit?: (payload: any)` de la línea 17 usa `any`, y
  `createDoctor`/`updateDoctor` en `doctors/fetch.ts` ya aceptan `Partial<ApiDoctor>` ambas.

**Hallazgo nuevo relacionado (no se toca en este task):** `DoctorForm.tsx:95` tiene
`const depFromCity = initial?.city?.department_id || (initial as any)?.department_id;` — ese
`department_id` de nivel superior **no existe** en el tipo `ApiDoctor` (confirmado leyendo
`doctors/fetch.ts:4-19`: solo existe anidado en `city.department_id`). Quitar ese `as any`
revelaría un error real de "la propiedad no existe en el tipo", y `DoctorForm.tsx` no es uno de los
3 formularios que el Hallazgo 2 del spec pide limpiar — se deja fuera de alcance de este plan,
documentado aquí para que no se pierda.

- [ ] **Step 1: Tipar `AgreementForm.tsx`**

Cambiar el import de tipos (línea 5-9):
```ts
import type {
  ApiAgreement,
  City,
  Department,
} from "../fetch";
```
por:
```ts
import type {
  ApiAgreement,
  City,
  Department,
  CreateAgreementPayload,
} from "../fetch";
```
Cambiar la definición de `Props` (líneas 19-23):
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiAgreement>;
  onSubmit?: (payload: any) => Promise<void>;
};
```
por:
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiAgreement>;
  onSubmit?: (payload: CreateAgreementPayload) => Promise<void>;
};
```
Quitar los 6 `as any` sobre `initial` (todos en accesos de solo lectura, sin mismatch de tipo —
`ApiAgreement` ya tiene `amount: number`, `city_id: number`, `state: number`, `id: number`,
`city?: {...}`):
- Línea 56: `amount: String((initial as any)?.amount ?? "")` → `amount: String(initial?.amount ?? "")`
- Línea 57: `city_id: (initial as any)?.city_id ?? ""` → `city_id: initial?.city_id ?? ""`
- Línea 58: `state: Number((initial as any)?.state ?? 1)` → `state: Number(initial?.state ?? 1)`
- Línea 75: `const depFromCity = (initial as any)?.city?.department_id;` → `const depFromCity = initial?.city?.department_id;`
- Línea 174: `value={(initial as any)?.id || ""}` → `value={initial?.id || ""}`
- Línea 229: `(initial as any)?.city?.name ||` → `initial?.city?.name ||`

Cambiar la construcción del payload (líneas 137-142):
```ts
    const payload: any = {
      name: form.name,
      amount: Number(form.amount),
      city_id: Number(form.city_id),
      state: Number(form.state) === 1 ? 1 : 0,
    };
```
por:
```ts
    const payload: CreateAgreementPayload = {
      name: form.name,
      amount: Number(form.amount),
      city_id: Number(form.city_id),
      state: Number(form.state) === 1 ? 1 : 0,
    };
```

- [ ] **Step 2: Tipar `doctors/specialties/new/page.tsx`**

Agregar el import de tipo:
```ts
import type { ApiSpecialty } from "../fetch";
```
Cambiar:
```ts
  const handleSubmit = async (data: any) => {
```
por:
```ts
  const handleSubmit = async (data: Partial<ApiSpecialty>) => {
```

- [ ] **Step 3: Tipar `doctors/specialties/[id]/edit/page.tsx`**

`ApiSpecialty` ya está importado en este archivo (línea 10: `import { getSpecialty, updateSpecialty, type ApiSpecialty } from "../../fetch";`). Cambiar:
```ts
  const handleSubmit = async (data: any) => {
```
por:
```ts
  const handleSubmit = async (data: Partial<ApiSpecialty>) => {
```

- [ ] **Step 4: Tipar la prop `onSubmit` de `DoctorForm.tsx`**

`ApiDoctor` ya está importado (línea 6: `import type { ApiDoctor } from "../fetch";`). Cambiar la
línea 17:
```ts
  onSubmit?: (payload: any) => Promise<void>;
```
por:
```ts
  onSubmit?: (payload: Partial<ApiDoctor>) => Promise<void>;
```

- [ ] **Step 5: Tipar `doctors/new/page.tsx`**

Agregar el import de tipo:
```ts
import type { ApiDoctor } from "../fetch";
```
Cambiar:
```ts
  const handleSubmit = async (data: any) => {
```
por:
```ts
  const handleSubmit = async (data: Partial<ApiDoctor>) => {
```

- [ ] **Step 6: Tipar `doctors/[id]/edit/page.tsx`**

`ApiDoctor` ya está importado (línea 10: `import { getDoctor, updateDoctor, type ApiDoctor } from "../../fetch";`). Cambiar:
```ts
  const handleSubmit = async (data: any) => {
```
por:
```ts
  const handleSubmit = async (data: Partial<ApiDoctor>) => {
```

- [ ] **Step 7: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores — todos los payloads construidos ya coincidían estructuralmente con el tipo
importado (confirmado en la investigación de este task, sin mismatches).

- [ ] **Step 8: Correr los tests afectados**

Run: `npx vitest run tests/app/4dnn1n/agreements/_components/AgreementForm.test.tsx tests/app/4dnn1n/agreements/new/page.test.tsx tests/app/4dnn1n/agreements/[id]/edit/page.test.tsx tests/app/4dnn1n/doctors/specialties/new/page.test.tsx tests/app/4dnn1n/doctors/specialties/[id]/edit/page.test.tsx tests/app/4dnn1n/doctors/_components/DoctorForm.test.tsx tests/app/4dnn1n/doctors/new/page.test.tsx tests/app/4dnn1n/doctors/[id]/edit/page.test.tsx`
Expected: sin regresiones — son cambios puramente de tipos, sin alterar el runtime.

**Checkpoint — no hacer commit.**

---

### Task 6: Hallazgo 2 — `CounselorForm.tsx` (requiere ensanchar los DTOs de `counselors/fetch.ts`)

**Files:**
- Modify: `src/app/4dnn1n/counselors/fetch.ts:67-101`
- Modify: `src/app/4dnn1n/counselors/_components/CounselorForm.tsx`

**Interfaces:**
- Modifica `CreateCounselorPayload`/`UpdateCounselorPayload` (ensanchamiento aditivo — ver Contexto).
- Consume: los tipos ensanchados, en la prop `onSubmit?: (payload: CreateCounselorPayload) => Promise<void>`.

**Contexto verificado — por qué este caso necesita tocar los DTOs (a diferencia de Task 5):**
tipar el `payload: any` de `CounselorForm.tsx` directamente contra `CreateCounselorPayload` como
está hoy **falla** en 3 campos reales (confirmado leyendo `counselors/fetch.ts:67-87` y
`CounselorForm.tsx:240-258` completos):
1. `rol: 0` (literal numérico, el comentario dice "rol always 0") vs. `rol?: string | null` en el
   DTO — mismatch de tipo.
2. `password: null` (siempre se envía `null`, nunca se gestiona la contraseña del asesor desde este
   formulario) vs. `password: string` (requerido, sin `null`) en el DTO — mismatch de tipo.
3. `type_contra: form.type_contra` — el estado del formulario hereda el tipo de `ApiCounselor.type_contra: CounselorTypeContra | string` (para leer valores legacy del backend), pero
   `CreateCounselorPayload.type_contra: CounselorTypeContra` es más estricto — mismatch de tipo.

Solo `CounselorForm.tsx` y sus dos páginas (`new`, `[id]/edit`) usan estos dos tipos (confirmado con
`grep -rn "CreateCounselorPayload\|UpdateCounselorPayload" src` → 4 resultados, todos dentro de
`counselors/fetch.ts` mismo) — ensanchar estos 3 campos con una unión de tipo no puede romper
ningún otro caller.

- [ ] **Step 1: Ensanchar `CreateCounselorPayload` y `UpdateCounselorPayload` en `counselors/fetch.ts`**

Cambiar (líneas 67-101):
```ts
export type CreateCounselorPayload = {
  name: string;
  lastname: string;
  id_card: string;

  address?: string | null;
  date_admission?: string | null;
  type_contra: CounselorTypeContra;

  email?: string | null;
  password: string;

  rol?: string | null;
  phone?: string | null;
  movil?: string | null;

  state?: 1 | 2;

  city_id: number;
  user_id: number; // franchise
};

export async function createCounselor(payload: CreateCounselorPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiCounselor>>("/api/counselors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("counselors:");
  return result;
}

export type UpdateCounselorPayload = Partial<Omit<CreateCounselorPayload, "password">> & {
  password?: string; // optional when editing
};
```
por:
```ts
export type CreateCounselorPayload = {
  name: string;
  lastname: string;
  id_card: string;

  address?: string | null;
  date_admission?: string | null;
  // Widened to `| string`: `ApiCounselor.type_contra` also accepts a plain
  // string to represent legacy values read from the backend that may not
  // match the current fixed options list.
  type_contra: CounselorTypeContra | string;

  email?: string | null;
  // Widened to `| null`: CounselorForm never lets the user set a password
  // here (advisor accounts don't manage credentials through this form) and
  // always sends `null` explicitly.
  password: string | null;

  // Widened to include `number`: CounselorForm always sends the literal `0`
  // (see the "rol always 0" comment in CounselorForm.tsx) — the backend
  // field predates this form and used to be a free string.
  rol?: string | number | null;
  phone?: string | null;
  movil?: string | null;

  state?: 1 | 2;

  city_id: number;
  user_id: number; // franchise
};

export async function createCounselor(payload: CreateCounselorPayload) {
  await csrf();
  const result = await apiFetch<ApiResponse<ApiCounselor>>("/api/counselors", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  memCache.invalidatePrefix("counselors:");
  return result;
}

export type UpdateCounselorPayload = Partial<Omit<CreateCounselorPayload, "password">> & {
  password?: string | null; // optional when editing
};
```

- [ ] **Step 2: Tipar la prop `onSubmit` de `CounselorForm.tsx`**

Agregar `CreateCounselorPayload` al import de tipos (línea 7-13):
```ts
import type {
  ApiCounselor,
  City,
  Department,
  CounselorTypeContra,
  FranchiseOption,
} from "../fetch";
```
por:
```ts
import type {
  ApiCounselor,
  City,
  Department,
  CounselorTypeContra,
  FranchiseOption,
  CreateCounselorPayload,
} from "../fetch";
```
Cambiar la definición de `Props` (líneas 25-29):
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiCounselor>;
  onSubmit?: (payload: any) => Promise<void>;
};
```
por:
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiCounselor>;
  onSubmit?: (payload: CreateCounselorPayload) => Promise<void>;
};
```

- [ ] **Step 3: Quitar los 13 `as any` sobre `initial`**

Todos son accesos de solo lectura que ya están cubiertos por `Partial<ApiCounselor>` (confirmado
campo por campo contra `ApiCounselor` en `counselors/fetch.ts:10-32`) — reemplazo mecánico
`(initial as any)?.X` → `initial?.X`:

Líneas 65-67:
```ts
  const counselorId = Number((initial as any)?.id ?? 0) || undefined;
  const initialIdCard = String((initial as any)?.id_card ?? "");
  const initialRoleNum = Number((initial as any)?.rol ?? 0);
```
por:
```ts
  const counselorId = Number(initial?.id ?? 0) || undefined;
  const initialIdCard = String(initial?.id_card ?? "");
  const initialRoleNum = Number(initial?.rol ?? 0);
```

Líneas 82-98 (bloque del `useState` inicial):
```ts
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: (initial as any)?.lastname ?? "",
    id_card: String((initial as any)?.id_card ?? ""),
    address: (initial as any)?.address ?? "",
    date_admission: (initial as any)?.date_admission ?? "",
    type_contra: (initial as any)?.type_contra ?? TYPE_CONTRA[0],

    // rol always 0
    rol: 0,

    phone: (initial as any)?.phone ?? "",
    movil: (initial as any)?.movil ?? "",

    city_id: (initial as any)?.city_id ?? "",
    user_id: (initial as any)?.user_id ?? "",

    state: Number((initial as any)?.state ?? 1),
  });
```
por:
```ts
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: initial?.lastname ?? "",
    id_card: String(initial?.id_card ?? ""),
    address: initial?.address ?? "",
    date_admission: initial?.date_admission ?? "",
    type_contra: initial?.type_contra ?? TYPE_CONTRA[0],

    // rol always 0
    rol: 0,

    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",

    city_id: initial?.city_id ?? "",
    user_id: initial?.user_id ?? "",

    state: Number(initial?.state ?? 1),
  });
```

Línea 127 (efecto de preselección de departamento):
```ts
    const depFromCity = (initial as any)?.city?.department_id;
```
por:
```ts
    const depFromCity = initial?.city?.department_id;
```

Línea 364 (`disabledPlaceholder` del selector de ciudad):
```ts
              (initial as any)?.city?.name ||
```
por:
```ts
              initial?.city?.name ||
```

- [ ] **Step 4: Tipar el payload construido en `submit()`**

Cambiar (líneas 240-258):
```ts
    const payload: any = {
      name: form.name,
      lastname: form.lastname,
      id_card: onlyDigits(form.id_card), // always numeric
      address: form.address || null,
      date_admission: form.date_admission || null,
      type_contra: form.type_contra,

      rol: 0,
      phone: form.phone || null,
      movil: form.movil || null,

      city_id: Number(form.city_id),
      user_id: Number(form.user_id),

      state: Number(form.state) === 2 ? 2 : 1,
      email: null,
      password: null,
    };
```
por:
```ts
    const payload: CreateCounselorPayload = {
      name: form.name,
      lastname: form.lastname,
      id_card: onlyDigits(form.id_card), // always numeric
      address: form.address || null,
      date_admission: form.date_admission || null,
      type_contra: form.type_contra,

      rol: 0,
      phone: form.phone || null,
      movil: form.movil || null,

      city_id: Number(form.city_id),
      user_id: Number(form.user_id),

      state: Number(form.state) === 2 ? 2 : 1,
      email: null,
      password: null,
    };
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. Si aparece un error de tipo en `city_id`/`user_id` (`number | ""` no
asignable a `number`) es porque `form.city_id`/`form.user_id` pueden quedar en `""` antes de que el
usuario elija una opción — no es un error introducido por este task (`Number(form.city_id)` ya
convierte `""` a `0` en tiempo de ejecución, el mismo comportamiento previo bajo `any`); si
`tsc` lo señala, es porque antes quedaba oculto por el `any` del payload — envolver con
`Number(...)` ya lo hace, así que no debería aparecer, pero si aparece, confirmar leyendo el mensaje
exacto antes de decidir el fix (no forzar un cast nuevo sin entender la causa).

- [ ] **Step 6: Correr los tests afectados**

Run: `npx vitest run tests/app/4dnn1n/counselors/_components/CounselorForm.test.tsx tests/app/4dnn1n/counselors/fetch.test.ts tests/app/4dnn1n/counselors/new/page.test.tsx tests/app/4dnn1n/counselors/[id]/edit/page.test.tsx`
Expected: sin regresiones.

- [ ] **Step 7: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Task 7: Hallazgo 2 — `FranchiseForm.tsx` (payload con contraseña condicional)

**Files:**
- Modify: `src/app/4dnn1n/franchises/_components/FranchiseForm.tsx`
- Modify: `src/app/4dnn1n/franchises/new/page.tsx`

**Interfaces:**
- Produce: `FranchiseFormPayload` (tipo local, exportado desde `FranchiseForm.tsx`) —
  `{ nit, name, contact, phone, movil, address, date_afi, email, user, city_id, state: 1 | 2, password?: string }`.

**Contexto verificado — por qué este caso necesita un tipo local (no el DTO de `fetch.ts`
directamente):** el payload de `FranchiseForm.tsx` agrega `password` de forma condicional después de
construir el objeto (`if (isCreate) payload.password = form.password;`), y ese mismo `Props.onSubmit`
se usa tanto en `new/page.tsx` (llama `createUser(payload)`, que exige `password: string`
obligatorio) como en `[id]/edit/page.tsx` (llama `updateFranchise(id, payload)`, con `password`
opcional) — un único tipo con `password` requerido rompería el caso de edición sin contraseña nueva,
y uno con `password` opcional no satisface directamente la llamada a `createUser`. La solución de
menor riesgo: `password` opcional en el tipo del formulario, y una guarda explícita en
`new/page.tsx` (el único call site que necesita la garantía) antes de llamar a `createUser` — el
guard nunca debería dispararse en la práctica, porque `canSubmit` ya exige `form.password` no vacío
en modo creación, pero TypeScript no puede ver esa relación a través del límite del componente.

`[id]/edit/page.tsx` **no necesita cambios** — `FranchiseFormPayload` (con todos los campos
presentes salvo `password` opcional) ya es asignable a `UpdateFranchisePayload`
(`Partial<Omit<CreateFranchisePayload,"password">> & {password?: string}`) sin ningún ajuste.

- [ ] **Step 1: Definir `FranchiseFormPayload` en `FranchiseForm.tsx`**

Después del import de `ApiFranchise`/`City`/`Department` (línea 6-10), agregar:
```ts
export type FranchiseFormPayload = {
  nit: string;
  name: string;
  contact: string | null;
  phone: string | null;
  movil: string | null;
  address: string | null;
  date_afi: string | null;
  email: string;
  user: string;
  city_id: number;
  state: 1 | 2;
  password?: string;
};
```

- [ ] **Step 2: Tipar la prop `onSubmit`**

Cambiar (líneas 14-18):
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiFranchise>;
  onSubmit?: (payload: any) => Promise<void>;
};
```
por:
```ts
type Props = {
  mode: Mode;
  initial?: Partial<ApiFranchise>;
  onSubmit?: (payload: FranchiseFormPayload) => Promise<void>;
};
```

- [ ] **Step 3: Quitar los `as any` sobre `initial`**

Todos son accesos de solo lectura ya cubiertos por `Partial<ApiFranchise>` (confirmado campo por
campo contra `ApiFranchise` en `franchises/fetch.ts:10-25`):

Líneas 53-64 (bloque del `useState` inicial):
```ts
  const [form, setForm] = useState({
    nit: initial?.nit ?? "",
    name: initial?.name ?? "",
    contact: (initial as any)?.contact ?? "",
    phone: (initial as any)?.phone ?? "",
    movil: (initial as any)?.movil ?? "",
    address: (initial as any)?.address ?? "",
    date_afi: (initial as any)?.date_afi ?? "",
    email: initial?.email ?? "",
    user: initial?.user ?? "",
    city_id: (initial as any)?.city_id ?? "",
    state: Number((initial as any)?.state ?? 1), // 1 active, 2 inactive
    password: "",
    password2: "",
  });
```
por:
```ts
  const [form, setForm] = useState({
    nit: initial?.nit ?? "",
    name: initial?.name ?? "",
    contact: initial?.contact ?? "",
    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",
    address: initial?.address ?? "",
    date_afi: initial?.date_afi ?? "",
    email: initial?.email ?? "",
    user: initial?.user ?? "",
    city_id: initial?.city_id ?? "",
    state: Number(initial?.state ?? 1), // 1 active, 2 inactive
    password: "",
    password2: "",
  });
```

Línea 83 (efecto de preselección de departamento):
```ts
    const depFromCity = (initial as any)?.city?.department_id;
```
por:
```ts
    const depFromCity = initial?.city?.department_id;
```

Línea 319 (`disabledPlaceholder` del selector de ciudad):
```ts
              (initial as any)?.city?.name ||
```
por:
```ts
              initial?.city?.name ||
```

- [ ] **Step 4: Tipar el payload construido en `submit()`, corrigiendo el `state` sin clamp**

Cambiar (líneas 162-177):
```ts
    const payload: any = {
      nit: form.nit,
      name: form.name,
      contact: form.contact || null,
      phone: form.phone || null,
      movil: form.movil || null,
      address: form.address || null,
      date_afi: form.date_afi || null,
      email: form.email,
      user: form.user,
      city_id: Number(form.city_id),
      state: isCreate ? 1 : Number(form.state),
    };

    if (isCreate) payload.password = form.password;
    if (isEdit && form.password) payload.password = form.password;
```
por:
```ts
    const payload: FranchiseFormPayload = {
      nit: form.nit,
      name: form.name,
      contact: form.contact || null,
      phone: form.phone || null,
      movil: form.movil || null,
      address: form.address || null,
      date_afi: form.date_afi || null,
      email: form.email,
      user: form.user,
      city_id: Number(form.city_id),
      // Clamped like CounselorForm/DoctorForm instead of `isCreate ? 1 : Number(form.state)`:
      // in create mode `form.state` already defaults to 1, so the result is
      // identical — this just makes the 1|2 invariant explicit for the type.
      state: Number(form.state) === 2 ? 2 : 1,
    };

    if (isCreate) payload.password = form.password;
    if (isEdit && form.password) payload.password = form.password;
```

- [ ] **Step 5: Agregar la guarda de contraseña en `new/page.tsx`**

Cambiar (líneas 48-67):
```tsx
        <FranchiseForm
          mode="create"
          onSubmit={async (payload) => {
            try {
              const ok = await alert.confirm({
                title: "¿Crear franquicia?",
                text: "Se guardará la información y quedará activa para su uso.",
                confirmButtonText: "Sí, crear",
                cancelButtonText: "Cancelar",
                onConfirm: () => createUser(payload),
              });
              if (ok) {
                await alert.success("Creado", "Franquicia creada exitosamente");
                router.push("/4dnn1n/franchises");
              }
            } catch (err) {
              await alert.error("Error", getApiErrorMessage(err));
            }
          }}
        />
```
por:
```tsx
        <FranchiseForm
          mode="create"
          onSubmit={async (payload) => {
            // `FranchiseFormPayload.password` is optional so the same type
            // also fits the edit form (where it's only sent on change), but
            // `createUser` requires it. This guard should never trigger in
            // practice — FranchiseForm's own `canSubmit` already blocks
            // submission without a password in create mode — it only
            // satisfies the type across the component boundary.
            if (!payload.password) {
              await alert.warn("Faltan datos", "La contraseña es obligatoria para crear la franquicia.");
              return;
            }
            const password = payload.password;
            try {
              const ok = await alert.confirm({
                title: "¿Crear franquicia?",
                text: "Se guardará la información y quedará activa para su uso.",
                confirmButtonText: "Sí, crear",
                cancelButtonText: "Cancelar",
                onConfirm: () => createUser({ ...payload, password }),
              });
              if (ok) {
                await alert.success("Creado", "Franquicia creada exitosamente");
                router.push("/4dnn1n/franchises");
              }
            } catch (err) {
              await alert.error("Error", getApiErrorMessage(err));
            }
          }}
        />
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. `[id]/edit/page.tsx` no debería necesitar cambios — confirmar que no aparece
ningún error ahí; si aparece, es evidencia de que `UpdateFranchisePayload` no es tan compatible como
se documentó arriba y hay que revisar el mismatch puntual antes de forzar un cast.

- [ ] **Step 7: Correr los tests afectados**

Run: `npx vitest run tests/app/4dnn1n/franchises/_components/FranchiseForm.test.tsx tests/app/4dnn1n/franchises/fetch.test.ts tests/app/4dnn1n/franchises/new/page.test.tsx tests/app/4dnn1n/franchises/[id]/edit/page.test.tsx`
Expected: sin regresiones.

- [ ] **Step 8: Prueba manual del caso límite**

En el panel, crear una franquicia nueva confirmando que el flujo sigue pidiendo contraseña
obligatoria (la guarda del Step 5 no debería ser visible en uso normal). Editar una franquicia
existente sin tocar el campo de contraseña y confirmar que el `PATCH` no incluye `password` en el
payload (pestaña Network del navegador).

- [ ] **Step 9: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Task 8: Hallazgo 5.1 (menor prioridad) — extraer `useAccountForm` en `account/page.tsx`

**Files:**
- Create: `src/app/4dnn1n/account/_hooks/useAccountForm.ts`
- Modify: `src/app/4dnn1n/account/page.tsx`

**Interfaces:**
- Produce: `useAccountForm()` — retorna todo el estado y los handlers que la página necesita:
  `username, setUsername, usernameError, setUsernameError, savingUsername, handleSaveUsername,
  showPasswordSection, togglePasswordSection, currentPassword, setCurrentPassword, newPassword,
  setNewPassword, confirmPassword, setConfirmPassword, passwordErrors, setPasswordErrors,
  savingPassword, handleSavePassword, showCurrent, setShowCurrent, showNew, setShowNew,
  showConfirm, setShowConfirm`.

**Contexto verificado:** `account/page.tsx` tiene 285 líneas (confirmado); las líneas 1-112 son
imports + 11 `useState` + 3 handlers async — exactamente la lógica que `useAffiliateFormState.ts`
ya extrae para el módulo `affiliates`, mismo criterio de `architecture.md` §3.5 citado en el spec.
El JSX de retorno (líneas 114-285) **no cambia** — solo pasa a leer las mismas variables desde el
hook en vez de declararlas localmente, por lo que `tests/app/4dnn1n/account/page.test.tsx` (ya
existente, prueba comportamiento visible, no implementación) debería seguir pasando sin
modificaciones.

- [ ] **Step 1: Crear `src/app/4dnn1n/account/_hooks/useAccountForm.ts`**

```ts
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { updateUsername, changePassword } from "../fetch";

type PasswordErrors = {
  current?: string;
  new?: string;
  confirm?: string;
};

type FieldErrorsShape = { data?: { errors?: Record<string, string | string[]> } };

/**
 * Encapsulates the two independent forms on the account page (username,
 * password) — extracted so the page component is limited to JSX/props,
 * matching the pattern already used by `useAffiliateFormState` for the
 * affiliates module.
 */
export function useAccountForm() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // ── Section A: username ──────────────────────────────
  const [username, setUsername] = useState(user?.user ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Section B: password ─────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");

    if (username.trim().length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setSavingUsername(true);
    try {
      await updateUsername(user!.id, username.trim());
      await refreshUser();
      await alert.success("Guardado", "Nombre de usuario actualizado correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: unknown) {
      const fieldErr = (err as FieldErrorsShape)?.data?.errors?.user;
      if (fieldErr) {
        setUsernameError(Array.isArray(fieldErr) ? fieldErr[0] : String(fieldErr));
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: PasswordErrors = {};

    if (newPassword.length < 6) {
      errs.new = "La contraseña debe tener al menos 6 caracteres.";
    }
    if (newPassword !== confirmPassword) {
      errs.confirm = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      await alert.success("Guardado", "Contraseña actualizada correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: unknown) {
      const currentErr = (err as FieldErrorsShape)?.data?.errors?.current_password;
      if (currentErr) {
        setPasswordErrors({
          current: Array.isArray(currentErr) ? currentErr[0] : String(currentErr),
        });
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePasswordSection = () => {
    setShowPasswordSection((v) => !v);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
  };

  return {
    username,
    setUsername,
    usernameError,
    setUsernameError,
    savingUsername,
    handleSaveUsername,

    showPasswordSection,
    togglePasswordSection,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordErrors,
    setPasswordErrors,
    savingPassword,
    handleSavePassword,
    showCurrent,
    setShowCurrent,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
  };
}
```

- [ ] **Step 2: Reemplazar el encabezado de `account/page.tsx` (líneas 1-112)**

Cambiar todo desde `"use client";` hasta el cierre de `togglePasswordSection` (líneas 1-112) por:
```tsx
"use client";

import { Save, KeyRound, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useAccountForm } from "./_hooks/useAccountForm";

export default function AccountPage() {
  usePageTitle("Configuración de cuenta");

  const {
    username,
    setUsername,
    usernameError,
    setUsernameError,
    savingUsername,
    handleSaveUsername,
    showPasswordSection,
    togglePasswordSection,
    currentPassword,
    setCurrentPassword,
    showCurrent,
    setShowCurrent,
    newPassword,
    setNewPassword,
    showNew,
    setShowNew,
    confirmPassword,
    setConfirmPassword,
    showConfirm,
    setShowConfirm,
    passwordErrors,
    setPasswordErrors,
    savingPassword,
    handleSavePassword,
  } = useAccountForm();

```
**El resto del archivo (`return (` en adelante, líneas 114-285 del original) se deja exactamente
igual** — todas las variables que referencia (`username`, `usernameError`, `savingUsername`,
`handleSaveUsername`, `showPasswordSection`, `togglePasswordSection`, `currentPassword`,
`showCurrent`, `newPassword`, `showNew`, `confirmPassword`, `showConfirm`, `passwordErrors`,
`savingPassword`, `handleSavePassword`, y los `setX` usados en los `onChange` inline) ya vienen del
hook con el mismo nombre.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Correr el test existente de la página (sin modificarlo)**

Run: `npx vitest run tests/app/4dnn1n/account/page.test.tsx`
Expected: todos los tests siguen en verde — el comportamiento visible no cambió, solo la ubicación
del estado.

- [ ] **Step 5: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Task 9: Hallazgo 5.2 (menor prioridad) — extraer `useDoctorFilters` en `doctors/page.tsx`

**Files:**
- Create: `src/app/4dnn1n/doctors/_hooks/useDoctorFilters.ts`
- Modify: `src/app/4dnn1n/doctors/page.tsx`

**Interfaces:**
- Produce: `useDoctorFilters()` — retorna `{ departments, cities, specialties,
  filterDepartmentId, setFilterDepartmentId, filterCityId, setFilterCityId, specialtySearch,
  filterSpecialtyId, handleSpecialtyChange }`.

**Depende de:** Task 1 (usa `getDepartments`/`getCitiesByDepartment` desde `@/lib/geo`, no desde
`../counselors/fetch` — si Task 1 no se aplicó todavía, ajustar el import de este hook al path
antiguo).

**Contexto verificado:** las líneas 30-63 de `doctors/page.tsx` (confirmado) cargan
departamentos/ciudades/especialidades y resuelven el texto libre del filtro de especialidad a su
`id`. El resto del componente (`useServerTable`, `useOptimisticToggle`, columnas, JSX de retorno)
**no** referencia estas variables por implementación, solo por nombre — la extracción no cambia el
JSX.

- [ ] **Step 1: Crear `src/app/4dnn1n/doctors/_hooks/useDoctorFilters.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
import type { Department, City } from "@/types/geo";
import { getSpecialties, type ApiSpecialty } from "../specialties/fetch";

/**
 * Loads the department/city/specialty catalogs used by the doctors table's
 * advanced filters, and resolves the specialty free-text input (an
 * `<input list>` combo, not a plain select) to the matching
 * `ApiSpecialty.id` that the server-side filter needs.
 */
export function useDoctorFilters() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | "">("");
  const [filterCityId, setFilterCityId] = useState<number | "">("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<number | "">("");

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
    getSpecialties()
      .then((list) => setSpecialties(list.filter((s) => s.state === 1)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!filterDepartmentId) {
      setCities([]);
      setFilterCityId("");
      return;
    }
    getCitiesByDepartment(Number(filterDepartmentId)).then(setCities).catch(console.error);
  }, [filterDepartmentId]);

  const handleSpecialtyChange = (val: string) => {
    setSpecialtySearch(val);
    if (!val) {
      setFilterSpecialtyId("");
      return;
    }
    const spec = specialties.find((s) => s.name.toLowerCase() === val.toLowerCase());
    if (spec) setFilterSpecialtyId(spec.id);
    else setFilterSpecialtyId("");
  };

  return {
    departments,
    cities,
    specialties,
    filterDepartmentId,
    setFilterDepartmentId,
    filterCityId,
    setFilterCityId,
    specialtySearch,
    filterSpecialtyId,
    handleSpecialtyChange,
  };
}
```

- [ ] **Step 2: Actualizar `doctors/page.tsx`**

Cambiar los imports (líneas 1-18):
```tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { useAuth } from "@/context/AuthContext";
import { getDoctors, updateDoctorState, type ApiDoctor } from "./fetch";
import { buildDoctorColumns } from "./_components/columns";
import { getDepartments, getCitiesByDepartment } from "../counselors/fetch";
import type { Department, City } from "@/types/geo";
import { getSpecialties, type ApiSpecialty } from "./specialties/fetch";
```
por:
```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { DataTable } from "@/components/data-table/DataTable";
import { CreateToolbarButton } from "@/components/data-table/CreateToolbarButton";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { Button } from "@/components/ui-elements/button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useServerTable } from "@/hooks/useServerTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { useAuth } from "@/context/AuthContext";
import { getDoctors, updateDoctorState, type ApiDoctor } from "./fetch";
import { buildDoctorColumns } from "./_components/columns";
import { useDoctorFilters } from "./_hooks/useDoctorFilters";
```
Cambiar el cuerpo del componente (líneas 25-63):
```tsx
export default function DoctorsPage() {
  usePageTitle("Médicos");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  // Advanced filters
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [specialties, setSpecialties] = useState<ApiSpecialty[]>([]);

  const [filterDepartmentId, setFilterDepartmentId] = useState<number | "">("");
  const [filterCityId, setFilterCityId] = useState<number | "">("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [filterSpecialtyId, setFilterSpecialtyId] = useState<number | "">("");

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
    getSpecialties().then(list => setSpecialties(list.filter(s => s.state === 1))).catch(console.error);
  }, []);

  useEffect(() => {
    if (!filterDepartmentId) {
      setCities([]);
      setFilterCityId("");
      return;
    }
    getCitiesByDepartment(Number(filterDepartmentId)).then(setCities).catch(console.error);
  }, [filterDepartmentId]);

  const handleSpecialtyChange = (val: string) => {
    setSpecialtySearch(val);
    if (!val) {
      setFilterSpecialtyId("");
      return;
    }
    const spec = specialties.find((s) => s.name.toLowerCase() === val.toLowerCase());
    if (spec) setFilterSpecialtyId(spec.id);
    else setFilterSpecialtyId("");
  };
```
por:
```tsx
export default function DoctorsPage() {
  usePageTitle("Médicos");
  const { user } = useAuth();
  const hasAccess = user?.type === 1 || user?.type === 2;

  const {
    departments,
    cities,
    specialties,
    filterDepartmentId,
    setFilterDepartmentId,
    filterCityId,
    setFilterCityId,
    specialtySearch,
    filterSpecialtyId,
    handleSpecialtyChange,
  } = useDoctorFilters();
```
**El resto del archivo (desde `const { data, setData, setMeta, stadeFilter, tableProps, isInitialLoad } = useServerTable(...)` en adelante) se deja exactamente igual** — sigue referenciando
`departments`, `cities`, `filterDepartmentId`, `setFilterDepartmentId`, `filterCityId`,
`setFilterCityId`, `specialtySearch`, `handleSpecialtyChange`, `specialties` y
`filterSpecialtyId` (dentro de `extraParams`), todos con el mismo nombre que retorna el hook.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Correr el test existente de la página (sin modificarlo)**

Run: `npx vitest run tests/app/4dnn1n/doctors/page.test.tsx`
Expected: todos los tests siguen en verde.

- [ ] **Step 5: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Resumen de verificación final (ejecutar después de la última tarea que se decida aplicar)

- [ ] `npx tsc --noEmit` → 0 errores.
- [ ] `npm run test` → 0 fallos.
- [ ] `npm run test:coverage` → confirmar que los umbrales de `vitest.config.ts`
  (`lines: 90, branches: 85, functions: 80, statements: 90`) se mantienen o suben — cada archivo
  nuevo de este plan (`src/lib/geo.ts`, `_hooks/useAccountForm.ts`, `_hooks/useDoctorFilters.ts`)
  tiene su test o hereda cobertura del test de la página que lo consume.
- [ ] `git diff --stat` → confirmar que los cambios están concentrados en los archivos de este plan,
  sin tocar `proxy.ts`, `AuthContext.tsx`, ni módulos fuera de alcance.
