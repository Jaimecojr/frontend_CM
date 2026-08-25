# Revisión de Arquitectura Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar los hallazgos de mayor ROI del spec `2026-08-07-revision-arquitectura-frontend-design.md`: eliminar los `any` en el punto de mayor riesgo de negocio (`AffiliateForm`) y en el contexto de autenticación, centralizar tipos geográficos duplicados en 5 módulos, extraer el patrón de "toggle de estado optimista" repetido en 11 módulos a un hook compartido, y extraer todo el estado/validación/payload de `AffiliateForm.tsx` (961 líneas) a `useAffiliateFormState` — con tests reales, para lo cual primero hay que instalar un test runner (hoy no existe ninguno en el proyecto).

**Architecture:** Task 1 es un prerrequisito de infraestructura (Vitest + React Testing Library) del que dependen las Tasks 2, 6 y 8, que agregan tests reales. Las Tasks 3 y 4 son independientes entre sí y de bajo riesgo (cambios de tipos). La Task 7 consume el hook de la Task 6. La Task 8 (extracción completa de `useAffiliateFormState`) se hace al final de la cadena de `AffiliateForm.tsx` porque reutiliza `@/lib/dates` (Task 2) y el tipo `AffiliateSubmitPayload` (Task 5) — antes de leer el archivo completo (961 líneas) no era posible especificarla sin placeholders; ya se leyó completo para escribir esta tarea.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5 (`strict: true`). Vitest + `@testing-library/react` + `jsdom` para tests unitarios (nuevo — no existe ningún test runner hoy).

## Global Constraints

- Comentarios y nombres de variables descriptivos en español, consistente con el resto del proyecto.
- **No hacer `git commit` dentro de las tareas.** Cada tarea termina en un checkpoint de verificación. El usuario decide cuándo integrar, según `[[feedback_no_commits_until_ready]]`.
- Hooks nuevos siguen la convención acordada: **un solo módulo lo usa → colocado en `_hooks/` del módulo; 2+ módulos → `src/hooks/`** (ver spec, sección "Convención: dónde viven los hooks nuevos").
- No modificar `src/proxy.ts`, `AuthContext.refreshUser`/`logoutUser`, ni `memCache` — ya resueltos/estables de sesiones anteriores.
- No introducir React Query/SWR ni ninguna librería de data-fetching — fuera de alcance de este plan (ver spec).

## Fuera de alcance de este plan

- Migración de los 9 módulos restantes (`agreements`, `appointments`, `contacts`, `content/allies`, `content/specialists`, `counselors`, `doctors/specialties`, `franchises`, `membership-forms`) al hook `useOptimisticToggle` de la Task 6 — la Task 7 migra solo `affiliates` y `doctors` como prueba del hook; los demás quedan listos para migrarse con el mismo patrón en un plan de seguimiento.
- Tests end-to-end de pantallas completas — fuera de alcance para un panel de este tamaño (ver spec).

---

### Task 1: Configurar Vitest + React Testing Library

**Files:**
- Modify: `package.json` (agregar dependencias de desarrollo y script `test`)
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/test/setup-smoke.test.tsx`

**Interfaces:**
- No consume nada de otras tareas.
- Produce: el comando `npm test` (`vitest run`), disponible para las Tasks 2 y 6.

- [ ] **Step 1: Instalar las dependencias**

Run:
```bash
cd frontend-cm
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Agregar el script de test a `package.json`**

En la sección `"scripts"` de `package.json`, agregar:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Crear la configuración de Vitest**

Crear `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Crear `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Escribir un test de humo que verifique que el entorno funciona**

Crear `src/test/setup-smoke.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("entorno de pruebas (vitest + jsdom + testing-library)", () => {
  it("renderiza un componente React y aplica los matchers de jest-dom", () => {
    render(<button>Guardar</button>);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("resuelve el alias @/ hacia src/", async () => {
    const mod = await import("@/lib/getApiErrorMessage");
    expect(typeof mod.getApiErrorMessage).toBe("function");
  });
});
```

- [ ] **Step 5: Correr los tests y confirmar que pasan**

Run: `npm test`
Expected: PASS en los 2 tests de `setup-smoke.test.tsx`. Si el segundo test falla por resolución del alias, revisar que `resolve.alias` en `vitest.config.ts` apunte exactamente a `src/` (mismo destino que `@/*` en `tsconfig.json`).

**Checkpoint — no hacer commit.**

---

### Task 2: Extraer helpers de fecha a `src/lib/dates.ts` con tests

**Files:**
- Create: `src/lib/dates.ts`
- Create: `src/lib/dates.test.ts`
- Modify: `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx:53-69` (eliminar las funciones locales, importar desde `@/lib/dates`)

**Interfaces:**
- Consume: el test runner de la Task 1.
- Produce: `getTodayString(): string` y `addOneYear(dateString: string): string`, mismas firmas que las funciones locales que reemplazan — ningún otro archivo de `AffiliateForm.tsx` necesita cambiar más allá del import.

**Contexto verificado:** son funciones puras (sin dependencias de React ni del DOM más allá de `Date`), definidas hoy dentro de `AffiliateForm.tsx:54-69`. Se usan en el mismo archivo para calcular `validity_end` (a un año de `validity`) y fechas de renovación.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/lib/dates.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { addOneYear, getTodayString } from "./dates";

describe("getTodayString", () => {
  it("devuelve la fecha de hoy en formato YYYY-MM-DD", () => {
    const hoy = new Date();
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
    expect(getTodayString()).toBe(esperado);
  });
});

describe("addOneYear", () => {
  it("suma exactamente un año a una fecha válida", () => {
    expect(addOneYear("2026-03-15")).toBe("2027-03-15");
  });

  it("maneja el 29 de febrero en año bisiesto sumando al 1 de marzo del año siguiente", () => {
    // new Date("2024-02-29") + 1 año -> JS normaliza el 29/feb inexistente al 1/mar
    expect(addOneYear("2024-02-29")).toBe("2025-03-01");
  });

  it("devuelve cadena vacía si el string de fecha está vacío", () => {
    expect(addOneYear("")).toBe("");
  });

  it("devuelve cadena vacía si la fecha es inválida", () => {
    expect(addOneYear("no-es-una-fecha")).toBe("");
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- dates.test`
Expected: FAIL — `src/lib/dates.ts` todavía no existe.

- [ ] **Step 3: Crear el archivo de helpers**

Crear `src/lib/dates.ts`:
```ts
export function getTodayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function addOneYear(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + 1);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npm test -- dates.test`
Expected: PASS en los 5 tests.

- [ ] **Step 5: Usar los helpers desde `AffiliateForm.tsx`**

En `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx`, eliminar las líneas 53-69 (el comentario `// Helpers globales para fechas` y las funciones `getTodayString`/`addOneYear` completas), y agregar el import junto a los demás imports del archivo (después de la línea 15):
```ts
import { addOneYear, getTodayString } from "@/lib/dates";
```

- [ ] **Step 6: Verificar que el archivo sigue compilando**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `AffiliateForm.tsx` o `dates.ts` (puede haber errores preexistentes ajenos a este cambio, ya documentados en el spec de rendimiento anterior).

- [ ] **Step 7: Verificación manual del formulario**

Con `npm run dev` corriendo, abrir `/4dnn1n/affiliates/new`, llenar la fecha de "Vigencia inicial" y confirmar que "Vigencia final" se autocompleta a un año después, igual que antes del cambio.

**Checkpoint — no hacer commit.**

---

### Task 3: Tipar `AuthContext.user` con la interfaz `AuthUser`

**Files:**
- Modify: `src/context/AuthContext.tsx:1-18`

**Interfaces:**
- No consume nada de otras tareas.
- Produce: `AuthUser` (exportado desde `AuthContext.tsx`), consumido por cualquier componente que llame `useAuth()`. No cambia el runtime — solo agrega tipos.

**Contexto verificado:** los únicos campos de `user` que se leen en todo el proyecto son `id`, `name`, `email`, `user`, `type` (confirmado por grep de `user?.` y `user.` en `src/`). `getAuthUser()` (`src/app/4dnn1n/home/fetch.ts`) retorna directamente la respuesta JSON de `GET /user` (el modelo `User` de Laravel serializado, con `password`/`remember_token` ocultos).

- [ ] **Step 1: Definir la interfaz y tipar el contexto**

En `src/context/AuthContext.tsx`, reemplazar:
```ts
interface AuthContextType {
  user: any;
  loading: boolean;
  isLoggingOut: boolean;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<void>;
}
```
por:
```ts
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  user: string;
  type: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoggingOut: boolean;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<void>;
}
```

Y reemplazar:
```ts
  const [user, setUser] = useState<any>(null);
```
por:
```ts
  const [user, setUser] = useState<AuthUser | null>(null);
```

- [ ] **Step 2: Verificar que el archivo y sus consumidores compilan**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. Si `getAuthUser()` no está tipado como `Promise<AuthUser | null>`, TypeScript puede marcar un error en `setUser(u)` dentro de `refreshUser()` — en ese caso, tipar el retorno de `getAuthUser()` en `src/app/4dnn1n/home/fetch.ts` como `Promise<AuthUser | null>` (importando `AuthUser` desde `@/context/AuthContext`) antes de continuar.

- [ ] **Step 3: Verificación manual**

Con `npm run dev`, iniciar sesión y confirmar en el editor (hover sobre `user?.type` en cualquier `page.tsx`) que TypeScript ahora infiere `number | undefined` en vez de `any`.

**Checkpoint — no hacer commit.**

---

### Task 4: Centralizar los tipos `Department`/`City` en `src/types/geo.ts`

**Files:**
- Create: `src/types/geo.ts`
- Modify: `src/app/4dnn1n/affiliates/fetch.ts:51-52`
- Modify: `src/app/4dnn1n/agreements/fetch.ts:14-15`
- Modify: `src/app/4dnn1n/appointments/fetch.ts:185-186`
- Modify: `src/app/4dnn1n/counselors/fetch.ts:34-35`
- Modify: `src/app/4dnn1n/franchises/fetch.ts:26-27`
- Modify: `src/app/4dnn1n/doctors/page.tsx:17`

**Interfaces:**
- No consume nada de otras tareas.
- Produce: `Department`, `City` en `src/types/geo.ts`. Los 5 `fetch.ts` siguen exportando `Department`/`City` (ahora re-exportados, no redefinidos), así que **ningún componente que ya importe `{ type Department }` desde su `fetch.ts` local necesita cambiar** — solo cambia de dónde viene la definición.

**Contexto verificado:** las 5 definiciones son idénticas byte a byte (`export type Department = { id: number; name: string };` / `export type City = { id: number; name: string; department_id: number };`). `doctors/page.tsx` es el único archivo que importa estos tipos desde un módulo ajeno (`../counselors/fetch`) en vez de definir o re-exportar los suyos.

- [ ] **Step 1: Crear el archivo centralizado**

Crear `src/types/geo.ts`:
```ts
export type Department = { id: number; name: string };
export type City = { id: number; name: string; department_id: number };
```

- [ ] **Step 2: Reemplazar la definición local por un re-export en los 5 módulos**

En cada uno de estos 5 archivos, reemplazar las 2 líneas de definición local:
```ts
export type Department = { id: number; name: string };
export type City = { id: number; name: string; department_id: number };
```
por:
```ts
export type { Department, City } from "@/types/geo";
```

Archivos: `src/app/4dnn1n/affiliates/fetch.ts`, `src/app/4dnn1n/agreements/fetch.ts`, `src/app/4dnn1n/appointments/fetch.ts`, `src/app/4dnn1n/counselors/fetch.ts`, `src/app/4dnn1n/franchises/fetch.ts`.

- [ ] **Step 3: Corregir el import cruzado en `doctors/page.tsx`**

En `src/app/4dnn1n/doctors/page.tsx:17`, cambiar:
```ts
import { getDepartments, getCitiesByDepartment, type Department, type City } from "../counselors/fetch";
```
por:
```ts
import { getDepartments, getCitiesByDepartment } from "../counselors/fetch";
import type { Department, City } from "@/types/geo";
```

- [ ] **Step 4: Verificar que todo compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. El re-export (`export type { X } from "..."`) preserva la firma pública de cada `fetch.ts`, así que ningún otro archivo (`AffiliateForm.tsx`, `FranchiseForm.tsx`, `CounselorForm.tsx`, `DoctorForm.tsx`, `AgreementForm.tsx`, que importan estos tipos desde su `fetch.ts` local) debería requerir cambios — confirmar con `npx tsc --noEmit` que ninguno rompió.

**Checkpoint — no hacer commit.**

---

### Task 5: Tipar el payload de envío de `AffiliateForm.tsx`

**Files:**
- Modify: `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx:32,365`

**Interfaces:**
- No consume nada de otras tareas.
- Produce: el tipo `AffiliateSubmitPayload`, usado por la prop `onSubmit` de `AffiliateForm`. Ya es compatible con las firmas actuales de sus 2 consumidores (`handleCreate: (payload: CreateAffiliatePayload) => ...` en `affiliates/new/page.tsx:82` y `handleUpdate: (payload: Partial<CreateAffiliatePayload> & { renovation?: any }) => ...` en `affiliates/[id]/edit/page.tsx:79`) — verificado que ambos ya anticipan esta forma, así que no deberían necesitar cambios.

**Contexto verificado:** el payload real que construye `submit()` (línea 365) es `{ ...form, ...campos normalizados }` más, en modo edición con renovación, un objeto `renovation` anidado (`date_ini`, `date_end`, `date_payment`, `value`) que **no** es parte de `CreateAffiliatePayload` — es un campo adicional que el backend de renovaciones consume aparte.

- [ ] **Step 1: Definir el tipo del payload**

En `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx`, en el bloque de imports (junto a los tipos ya importados de `../fetch`), agregar:
```ts
import type { CreateAffiliatePayload } from "../fetch";
```

Después de la declaración de `type Mode` (línea 27), agregar:
```ts
type AffiliateSubmitPayload = Partial<CreateAffiliatePayload> & {
  renovation?: {
    date_ini: string;
    date_end: string;
    date_payment: string;
    value: number;
  };
};
```

- [ ] **Step 2: Tipar la prop `onSubmit`**

Reemplazar (línea 32):
```ts
  onSubmit?: (payload: any) => Promise<void>;
```
por:
```ts
  onSubmit?: (payload: AffiliateSubmitPayload) => Promise<void>;
```

- [ ] **Step 3: Tipar la variable `payload`**

Reemplazar (línea 365):
```ts
    const payload: any = {
```
por:
```ts
    const payload: AffiliateSubmitPayload = {
```

- [ ] **Step 4: Compilar y resolver los errores de tipo que aparezcan**

Run: `npx tsc --noEmit`

Este paso es el punto real de la tarea: `payload: any` no verificaba nada, así que este es el primer chequeo real de tipos sobre `submit()`. Es esperable que aparezcan 1-2 errores donde `form` (el estado del formulario) tiene un campo con un tipo distinto al de `CreateAffiliatePayload` (ej. un campo que en `form` es `string` pero en el payload del backend es `number`, y la conversión `Number(form.city_id)` ya está en el código — verificar que cada campo numérico de `CreateAffiliatePayload` tiene su conversión `Number(...)` correspondiente en el spread, igual que ya existe para `city_id`, `user_id`, `counselor_id`, `agreement_id`). Corregir cada error señalado por el compilador ajustando la conversión en el spread, no relajando el tipo de vuelta a `any`.

Expected al finalizar: `npx tsc --noEmit` sin errores nuevos en `AffiliateForm.tsx`, `affiliates/new/page.tsx` ni `affiliates/[id]/edit/page.tsx`.

- [ ] **Step 5: Verificación manual de los 2 flujos**

Con `npm run dev`:
1. Crear un afiliado nuevo completo (`/4dnn1n/affiliates/new`) y confirmar que se guarda sin error 400/422.
2. Editar un afiliado existente marcando "renovar" y confirmar que la renovación se registra igual que antes del cambio.

**Checkpoint — no hacer commit.**

---

### Task 6: Hook compartido `useOptimisticToggle`

**Files:**
- Create: `src/hooks/useOptimisticToggle.ts`
- Create: `src/hooks/useOptimisticToggle.test.ts`

**Interfaces:**
- Consume: el test runner de la Task 1.
- Produce: `useOptimisticToggle<T, F>(opts): (item: T) => Promise<void>` — usado por la Task 7. Ver firma completa en el Step 3.

**Contexto verificado:** el patrón real (`affiliates/page.tsx:36-62`, `doctors/page.tsx:77-104`) es: calcular `isActive`/`nextValue` a partir de un campo (`stade` o `state`), pedir confirmación con `alert.confirm` (que internamente ejecuta `onConfirm` y relanza cualquier error que este lance — confirmado en `src/lib/alert.ts:61-67`), actualizar `setData` de forma optimista dentro de `onConfirm`, y si `alert.confirm` resuelve `true`: mostrar éxito y, si hay un filtro de estado activo (`stadeFilter !== "all"`), quitar el ítem de la lista y decrementar `meta.total`. Si algo falla, revertir `setData` al valor original y mostrar error. `setData`/`setMeta` vienen de `useServerTable` (`src/hooks/useServerTable.ts:105-114`), con tipos `Dispatch<SetStateAction<T[]>>` y `Dispatch<SetStateAction<{current_page:number;last_page:number;per_page:number;total:number}>>`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/hooks/useOptimisticToggle.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticToggle } from "./useOptimisticToggle";
import { alert } from "@/lib/alert";

vi.mock("@/lib/alert", () => ({
  alert: {
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type Item = { id: number; stade: 1 | 2 };

function crearOpts(overrides: Partial<Parameters<typeof useOptimisticToggle>[0]> = {}) {
  return {
    field: "stade" as const,
    activeValue: 1 as const,
    inactiveValue: 2 as const,
    setData: vi.fn(),
    setMeta: vi.fn(),
    stadeFilter: "all",
    updateFn: vi.fn().mockResolvedValue(undefined),
    confirmTitle: () => "¿Confirmas?",
    confirmText: () => "texto",
    successMessage: () => "listo",
    ...overrides,
  };
}

describe("useOptimisticToggle", () => {
  it("actualiza el dato de forma optimista y llama updateFn con el valor invertido", async () => {
    const opts = crearOpts();
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(opts.updateFn).toHaveBeenCalledWith(1, 2);
    expect(opts.setData).toHaveBeenCalled();
  });

  it("revierte el dato optimista si updateFn falla", async () => {
    const error = new Error("falló la red");
    const opts = crearOpts({
      updateFn: vi.fn().mockRejectedValue(error),
    });
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(alert.error).toHaveBeenCalled();
    // Dos llamadas a setData: la optimista y la de revertir.
    expect(opts.setData).toHaveBeenCalledTimes(2);
  });

  it("quita el ítem de la lista y decrementa el total si hay un filtro de estado activo", async () => {
    const opts = crearOpts({ stadeFilter: "1" });
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(opts.setMeta).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Correr el test y confirmar que falla**

Run: `npm test -- useOptimisticToggle`
Expected: FAIL — `src/hooks/useOptimisticToggle.ts` todavía no existe.

- [ ] **Step 3: Crear el hook**

Crear `src/hooks/useOptimisticToggle.ts`:
```ts
"use client";

import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { Dispatch, SetStateAction } from "react";

type TableMeta = { current_page: number; last_page: number; per_page: number; total: number };

type Options<T extends { id: number | string }, F extends keyof T> = {
  field: F;
  activeValue: T[F];
  inactiveValue: T[F];
  setData: Dispatch<SetStateAction<T[]>>;
  setMeta: Dispatch<SetStateAction<TableMeta>>;
  stadeFilter: string;
  updateFn: (id: T["id"], nextValue: T[F]) => Promise<unknown>;
  confirmTitle: (isActive: boolean) => string;
  confirmText: (isActive: boolean) => string;
  confirmButtonText?: (isActive: boolean) => string;
  successMessage: (isActive: boolean) => string;
};

/**
 * Encapsula el patrón "confirmar → actualizar de forma optimista → llamar
 * a la API → revertir si falla" repetido en los módulos con toggle de
 * estado (afiliados, médicos, etc.). Ver spec 2026-08-07 para el detalle
 * de dónde vivía este bloque antes de extraerse.
 */
export function useOptimisticToggle<T extends { id: number | string }, F extends keyof T>(
  opts: Options<T, F>,
) {
  return async (item: T) => {
    const isActive = item[opts.field] === opts.activeValue;
    const nextValue = isActive ? opts.inactiveValue : opts.activeValue;
    const previousValue = item[opts.field];

    try {
      const ok = await alert.confirm({
        title: opts.confirmTitle(isActive),
        text: opts.confirmText(isActive),
        confirmButtonText: opts.confirmButtonText?.(isActive) ?? (isActive ? "Sí, inactivar" : "Sí, activar"),
        cancelButtonText: "Cancelar",
        onConfirm: async () => {
          opts.setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, [opts.field]: nextValue } : x)));
          await opts.updateFn(item.id, nextValue);
        },
      });

      if (ok) {
        await alert.success("Actualizado", opts.successMessage(isActive));
        if (opts.stadeFilter !== "all") {
          opts.setData((prev) => prev.filter((x) => x.id !== item.id));
          opts.setMeta((m) => ({ ...m, total: m.total - 1 }));
        }
      }
    } catch (err) {
      opts.setData((prev) => prev.map((x) => (x.id === item.id ? { ...x, [opts.field]: previousValue } : x)));
      await alert.error("Error", getApiErrorMessage(err));
    }
  };
}
```

- [ ] **Step 4: Correr el test y confirmar que pasa**

Run: `npm test -- useOptimisticToggle`
Expected: PASS en los 3 tests.

- [ ] **Step 5: Correr toda la suite para descartar regresiones**

Run: `npm test`
Expected: todos los tests (incluyendo los de las Tasks 1 y 2) siguen en verde.

**Checkpoint — no hacer commit.**

---

### Task 7: Migrar `affiliates/page.tsx` y `doctors/page.tsx` a `useOptimisticToggle`

**Files:**
- Modify: `src/app/4dnn1n/affiliates/page.tsx:36-62`
- Modify: `src/app/4dnn1n/doctors/page.tsx:77-104`

**Interfaces:**
- Consume: `useOptimisticToggle` de la Task 6.
- Produce: mismo comportamiento observable en ambas pantallas (mismos textos de confirmación, mismo efecto de optimista/revert/filtrado).

- [ ] **Step 1: Migrar `affiliates/page.tsx`**

Agregar el import (junto a los demás imports de hooks):
```ts
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
```

Reemplazar el bloque `onToggleState` completo (líneas 36-62) por:
```ts
  const onToggleState = useOptimisticToggle<ApiAffiliate, "stade">({
    field: "stade",
    activeValue: 1,
    inactiveValue: 2,
    setData,
    setMeta,
    stadeFilter,
    updateFn: updateAffiliateState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar afiliado?" : "¿Activar afiliado?"),
    confirmText: (isActive) => (isActive ? "El afiliado quedará inactivo." : "El afiliado quedará activo."),
    successMessage: (isActive) => (isActive ? "Afiliado inactivado." : "Afiliado activado."),
  });
```

- [ ] **Step 2: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos — `updateAffiliateState(id: number, stade: 1 | 2)` (`affiliates/fetch.ts:99`) ya coincide exactamente con la firma que espera `updateFn`, verificado antes de escribir esta tarea.

- [ ] **Step 3: Migrar `doctors/page.tsx`**

Agregar el mismo import, y reemplazar el bloque `onToggleState` completo (líneas 77-104) por:
```ts
  const onToggleState = useOptimisticToggle<ApiDoctor, "state">({
    field: "state",
    activeValue: 1,
    inactiveValue: 2,
    setData,
    setMeta,
    stadeFilter,
    updateFn: updateDoctorState,
    confirmTitle: (isActive) => (isActive ? "¿Inactivar médico?" : "¿Activar médico?"),
    confirmText: (isActive) =>
      isActive ? "El médico no aparecerá activo en el sistema." : "El médico volverá a estar disponible.",
    confirmButtonText: () => "Sí, continuar",
    successMessage: (isActive) => `El médico ha sido ${isActive ? "inactivado" : "activado"}.`,
  });
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Verificación manual de ambas pantallas**

Con `npm run dev`:
1. En `/4dnn1n/affiliates`, inactivar y luego reactivar un afiliado de prueba. Confirmar el modal, el toast de éxito, y que si el filtro está en "Activos" el ítem desaparece de la tabla tras inactivarlo.
2. Repetir en `/4dnn1n/doctors` con un médico de prueba.
3. Cancelar el modal de confirmación en ambas pantallas y confirmar que no cambia nada (ni la UI ni una llamada a la API).
4. Simular un fallo (ej. cortar el backend momentáneamente) y confirmar que el estado optimista se revierte y aparece el toast de error.

**Checkpoint — no hacer commit.**

---

### Task 8: Extraer `useAffiliateFormState` — estado, validación y payload completos de `AffiliateForm.tsx`

**Files:**
- Create: `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts`
- Create: `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`
- Modify: `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx` (líneas 1-436 — todo el bloque no-JSX; el `return` de las líneas 438-961 no cambia)

**Interfaces:**
- Consume: `getTodayString`/`addOneYear` de `@/lib/dates` (Task 2), `AffiliateSubmitPayload` (definido en la Task 5 dentro de `AffiliateForm.tsx` — esta tarea lo mueve al hook), el test runner de la Task 1.
- Produce: `useAffiliateFormState({ mode, initial, onSubmit }): { isView, isEdit, isCreate, departments, cities, departmentId, setDepartmentId, franchises, counselors, agreements, saving, idCardError, checkingIdCard, searchCounselor, setSearchCounselor, showCounselors, setShowCounselors, wantsRenovation, setWantsRenovation, renovationType, setRenovationType, renovationDateIni, setRenovationDateIni, renovationValue, setRenovationValue, renovationDatePayment, setRenovationDatePayment, form, setForm, validateIdCard, addBeneficiary, removeBeneficiary, updateBeneficiaryName, filteredCounselors, canSubmit, submit, clear }` — y `onlyDigits(value: string): string`, que `AffiliateForm.tsx` sigue necesitando directamente en 2 `onChange` de la JSX (documento y celular).

**Contexto verificado (archivo completo leído, 961 líneas):** el componente hoy es 100% lógica no-visual desde la línea 71 hasta la 436 (13 `useState`, 1 `useRef`, 7 `useEffect`, 2 `useMemo`, 6 funciones), y 100% JSX desde la línea 438 hasta el final. La única función no-visual que la JSX sigue llamando directamente es `onlyDigits` (líneas 448 y 519, en los `onChange` de documento y celular) — por eso se exporta también desde el hook en vez de quedar privada. `addOneYear` también se usa directamente en la JSX (línea 723, para mostrar la fecha final de renovación en modo lectura) — ya está disponible vía `@/lib/dates` desde la Task 2, así que el componente la importa de ahí, no del hook.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAffiliateFormState } from "./useAffiliateFormState";

vi.mock("../fetch", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([{ id: 1, name: "Franquicia A" }]),
  getActiveCounselors: vi.fn().mockResolvedValue([{ id: 1, name: "Ana", lastname: "Gómez" }]),
  getActiveAgreements: vi.fn().mockResolvedValue([{ id: 1, name: "Convenio A", amount: 150000 }]),
  getDepartments: vi.fn().mockResolvedValue([{ id: 1, name: "Antioquia" }]),
  getCitiesByDepartment: vi.fn().mockResolvedValue([{ id: 1, name: "Medellín", department_id: 1 }]),
  checkAffiliateIdCard: vi.fn().mockResolvedValue({ exists: false }),
}));

vi.mock("@/lib/alert", () => ({
  alert: { warn: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { checkAffiliateIdCard } from "../fetch";

async function renderConCatalogosCargados(args: Parameters<typeof useAffiliateFormState>[0]) {
  const view = renderHook(() => useAffiliateFormState(args));
  await waitFor(() => expect(view.result.current.franchises).toHaveLength(1));
  return view;
}

function llenarCamposObligatorios(setForm: (fn: (prev: any) => any) => void) {
  setForm((prev: any) => ({
    ...prev,
    name: "Juan",
    lastname: "Pérez",
    id_card: "123456789",
    movil: "3001234567",
    user_id: 1,
    counselor_id: 1,
    agreement_id: 1,
    email: "juan@test.com",
    company: "ACME",
  }));
}

describe("useAffiliateFormState", () => {
  it("carga los catálogos base al montar", async () => {
    const { result } = await renderConCatalogosCargados({ mode: "create" });

    expect(result.current.counselors).toHaveLength(1);
    expect(result.current.agreements).toHaveLength(1);
    expect(result.current.departments).toHaveLength(1);
  });

  it("canSubmit es falso mientras falten campos obligatorios", async () => {
    const { result } = await renderConCatalogosCargados({ mode: "create" });
    expect(result.current.canSubmit).toBe(false);
  });

  it("canSubmit es verdadero con todos los campos obligatorios completos", async () => {
    const { result } = await renderConCatalogosCargados({ mode: "create" });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));

    act(() => llenarCamposObligatorios(result.current.setForm));

    expect(result.current.canSubmit).toBe(true);
  });

  it("submit agrega stade:1 solo en modo creación y llama a onSubmit con el payload", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = await renderConCatalogosCargados({ mode: "create", onSubmit });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));
    act(() => llenarCamposObligatorios(result.current.setForm));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ stade: 1, id_card: "123456789", movil: "3001234567" }),
    );
  });

  it("submit agrega el objeto renovation cuando wantsRenovation es 'si' en modo edición", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { result } = await renderConCatalogosCargados({
      mode: "edit",
      initial: { id: 1, id_card: "123456789", validity_end: "2027-01-01" },
      onSubmit,
    });

    act(() => result.current.setDepartmentId(1));
    await waitFor(() => expect(result.current.cities).toHaveLength(1));
    act(() => llenarCamposObligatorios(result.current.setForm));
    act(() => result.current.setWantsRenovation("si"));
    act(() => result.current.setRenovationValue("150000"));

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        renovation: expect.objectContaining({ value: 150000 }),
      }),
    );
  });

  it("clear resetea el formulario a sus valores por defecto", async () => {
    const { result } = await renderConCatalogosCargados({ mode: "create" });

    act(() => result.current.setForm((prev) => ({ ...prev, name: "Algo" })));
    expect(result.current.form.name).toBe("Algo");

    act(() => result.current.clear());

    expect(result.current.form.name).toBe("");
  });

  it("validateIdCard marca error si el documento ya existe", async () => {
    (checkAffiliateIdCard as any).mockResolvedValueOnce({ exists: true });
    const { result } = await renderConCatalogosCargados({ mode: "create" });

    let esValido = true;
    await act(async () => {
      esValido = await result.current.validateIdCard("999888777");
    });

    expect(esValido).toBe(false);
    expect(result.current.idCardError).toMatch(/ya existe/);
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npm test -- useAffiliateFormState`
Expected: FAIL — `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts` todavía no existe.

- [ ] **Step 3: Crear el hook con la lógica movida tal cual desde `AffiliateForm.tsx`**

Crear `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts`:
```ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { addOneYear, getTodayString } from "@/lib/dates";
import { alert } from "@/lib/alert";
import type {
  ApiAffiliate,
  City,
  Department,
  FranchiseOption,
  CounselorOption,
  AgreementOption,
  ApiBeneficiary,
  CreateAffiliatePayload,
} from "../fetch";
import {
  getCitiesByDepartment,
  getDepartments,
  getActiveFranchises,
  getActiveCounselors,
  getActiveAgreements,
  checkAffiliateIdCard,
} from "../fetch";

export type AffiliateFormMode = "create" | "edit" | "view";

export type AffiliateSubmitPayload = Partial<CreateAffiliatePayload> & {
  renovation?: {
    date_ini: string;
    date_end: string;
    date_payment: string;
    value: number;
  };
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function FormNumber(val: any, def: number) {
  if (val !== undefined && val !== null) return Number(val);
  return def;
}

type Args = {
  mode: AffiliateFormMode;
  initial?: Partial<ApiAffiliate>;
  onSubmit?: (payload: AffiliateSubmitPayload) => Promise<void>;
};

export function useAffiliateFormState({ mode, initial, onSubmit }: Args) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const affiliateId = Number(initial?.id ?? 0) || undefined;
  const initialIdCard = String(initial?.id_card ?? "");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [departmentId, setDepartmentId] = useState<number | "">("");

  const [franchises, setFranchises] = useState<FranchiseOption[]>([]);
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [agreements, setAgreements] = useState<AgreementOption[]>([]);

  const [saving, setSaving] = useState(false);

  const [idCardError, setIdCardError] = useState<string | null>(null);
  const [checkingIdCard, setCheckingIdCard] = useState(false);
  const lastCheckedRef = useRef<string>("");

  const [searchCounselor, setSearchCounselor] = useState("");
  const [showCounselors, setShowCounselors] = useState(false);

  const defaultToday = getTodayString();

  const [wantsRenovation, setWantsRenovation] = useState("no");
  const [renovationType, setRenovationType] = useState("vencimiento");
  const [renovationDateIni, setRenovationDateIni] = useState("");
  const [renovationValue, setRenovationValue] = useState("");
  const [renovationDatePayment, setRenovationDatePayment] = useState(getTodayString());

  const [form, setForm] = useState({
    name: initial?.name ?? "",
    lastname: initial?.lastname ?? "",
    id_card: String(initial?.id_card ?? ""),
    address: initial?.address ?? "",
    bithdate: initial?.bithdate ?? "",
    phone: initial?.phone ?? "",
    movil: initial?.movil ?? "",
    email: initial?.email ?? "",

    city_id: initial?.city_id ?? "",
    user_id: initial?.user_id ?? "",
    agreement_id: initial?.agreement_id ?? "",
    counselor_id: initial?.counselor_id ?? "",

    validity: initial?.validity ?? defaultToday,
    validity_end: initial?.validity_end ?? addOneYear(defaultToday),
    payment_date: initial?.payment_date ?? defaultToday,
    balance: initial?.balance ?? 0,
    value: initial?.value ?? 0,
    commission: FormNumber(initial?.commission, 0),
    payment_commission: (initial?.payment_commission as "si" | "no") ?? "no",
    company: initial?.company ?? "",

    carnet: (initial?.carnet as "si" | "no") ?? "no",
    state: Number(initial?.state ?? 1),
    stade: Number(initial?.stade ?? 1),
    contract_code: initial?.contract_code ?? "",

    beneficiaries: (initial?.beneficiaries?.length
      ? initial.beneficiaries
      : [{ name: "" }]) as ApiBeneficiary[],
  });

  // Set counselor auto-search text initially
  useEffect(() => {
    if (initial?.counselor && initial.counselor.name) {
      setSearchCounselor(`${initial.counselor.name} ${initial.counselor.lastname}`);
    }
  }, [initial]);

  // Auto-llenar valor desde el convenio al crear
  useEffect(() => {
    if (isCreate && agreements.length > 0 && form.agreement_id) {
      const selected = agreements.find((a) => a.id === Number(form.agreement_id));
      if (selected?.amount) {
        setForm((prev) => ({ ...prev, value: selected.amount! }));
      }
    }
  }, [form.agreement_id, agreements, isCreate]);

  // Auto-llenar valor de renovación desde el convenio al editar
  useEffect(() => {
    if (isEdit && wantsRenovation === "si" && agreements.length > 0 && form.agreement_id) {
      const selected = agreements.find((a) => a.id === Number(form.agreement_id));
      if (selected?.amount) {
        setRenovationValue(selected.amount.toString());
      }
    }
  }, [form.agreement_id, wantsRenovation, agreements, isEdit]);

  // Set renovation dates
  useEffect(() => {
    if (isEdit && wantsRenovation === "si") {
      if (renovationType === "vencimiento") {
        setRenovationDateIni(initial?.validity_end || form.validity_end || "");
      } else {
        setRenovationDateIni(getTodayString());
      }
    }
  }, [renovationType, wantsRenovation, initial?.validity_end, form.validity_end, isEdit]);

  // Cargar info bases
  useEffect(() => {
    (async () => {
      try {
        const [listFranchises, listCounselors, listAgreements, deps] = await Promise.all([
          getActiveFranchises(),
          getActiveCounselors(),
          getActiveAgreements(),
          getDepartments(),
        ]);
        setFranchises(listFranchises);
        setCounselors(listCounselors);
        setAgreements(listAgreements);
        setDepartments(deps);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Preseleccionar departamento por city.department_id (edit/view)
  useEffect(() => {
    const depFromCity = initial?.city?.department_id;
    if (depFromCity && departmentId === "") {
      setDepartmentId(Number(depFromCity));
    }
  }, [initial, departmentId]);

  // Cargar ciudades al cambiar departamento
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!departmentId) {
        setCities([]);
        setForm((p) => ({ ...p, city_id: "" }));
        return;
      }

      try {
        const list = await getCitiesByDepartment(Number(departmentId));
        if (cancelled) return;

        setCities(list);

        setForm((prev) => {
          const currentCity = prev.city_id ? Number(prev.city_id) : 0;
          const exists = currentCity && list.some((c) => c.id === currentCity);
          if (exists) return prev;

          const firstCityId = list[0]?.id ? String(list[0].id) : "";
          return { ...prev, city_id: firstCityId };
        });
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  const validateIdCard = async (raw: string) => {
    const value = onlyDigits(raw);

    if (!value) {
      setIdCardError("El documento es obligatorio.");
      return false;
    }

    if (isEdit && value === onlyDigits(initialIdCard)) {
      setIdCardError(null);
      return true;
    }

    if (lastCheckedRef.current === value && idCardError === null) return true;

    setCheckingIdCard(true);
    try {
      const res = await checkAffiliateIdCard(value, affiliateId);
      lastCheckedRef.current = value;

      if (res.exists) {
        setIdCardError("Este documento ya existe en la base de datos.");
        return false;
      }

      setIdCardError(null);
      return true;
    } catch (e) {
      setIdCardError("No se pudo validar el documento.");
      return false;
    } finally {
      setCheckingIdCard(false);
    }
  };

  const addBeneficiary = () => {
    if (form.beneficiaries.length >= 7) return;
    setForm((p) => ({ ...p, beneficiaries: [...p.beneficiaries, { name: "" }] }));
  };

  const removeBeneficiary = (index: number) => {
    if (form.beneficiaries.length <= 1) return;
    setForm((p) => {
      const b = [...p.beneficiaries];
      b.splice(index, 1);
      return { ...p, beneficiaries: b };
    });
  };

  const updateBeneficiaryName = (index: number, name: string) => {
    setForm((p) => {
      const b = [...p.beneficiaries];
      b[index].name = name;
      return { ...p, beneficiaries: b };
    });
  };

  const filteredCounselors = useMemo(() => {
    const s = searchCounselor.toLowerCase();
    if (!s) return counselors;
    return counselors.filter(
      (c) => c.name.toLowerCase().includes(s) || c.lastname.toLowerCase().includes(s),
    );
  }, [counselors, searchCounselor]);

  const canSubmit = useMemo(() => {
    if (isView) return false;

    if (!form.name || !form.lastname || !form.id_card) return false;
    if (!!idCardError) return false;

    if (!form.movil || form.movil.length !== 10) return false;

    if (!form.user_id) return false;
    if (!form.counselor_id) return false;
    if (!form.agreement_id) return false;
    if (!departmentId || !form.city_id) return false;
    if (!form.email || !form.company) return false;

    return true;
  }, [form, isView, departmentId, idCardError]);

  const submit = async () => {
    if (!onSubmit) return;

    const okId = await validateIdCard(form.id_card);
    if (!okId) {
      await alert.warn("Identificación inválida", "Revisa el documento antes de guardar.");
      return;
    }

    if (!canSubmit) {
      await alert.warn(
        "Faltan datos",
        "Revisa los campos obligatorios y asegúrate de que el celular tenga 10 dígitos elegidos.",
      );
      return;
    }

    const payload: AffiliateSubmitPayload = {
      ...form,
      id_card: onlyDigits(form.id_card),
      movil: onlyDigits(form.movil),
      bithdate: form.bithdate || null,
      contract_code: form.contract_code || "",
      value: form.value || 0,
      balance: form.balance || 0,
      commission: form.commission || 0,
      payment_date: form.payment_date || defaultToday,
      city_id: Number(form.city_id),
      user_id: Number(form.user_id),
      counselor_id: Number(form.counselor_id),
      agreement_id: Number(form.agreement_id),
      ...(isCreate && { stade: 1 }),
    };

    if (isEdit && wantsRenovation === "si") {
      payload.payment_date = renovationDatePayment;
      payload.renovation = {
        date_ini: renovationDateIni,
        date_end: addOneYear(renovationDateIni),
        date_payment: renovationDatePayment,
        value: Number(renovationValue) || 0,
      };
    }

    setSaving(true);
    try {
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const clear = () => {
    if (isView) return;

    setForm({
      name: "",
      lastname: "",
      id_card: "",
      address: "",
      bithdate: "",
      phone: "",
      movil: "",
      email: "",
      city_id: "",
      user_id: "",
      agreement_id: "",
      counselor_id: "",
      validity: defaultToday,
      validity_end: addOneYear(defaultToday),
      payment_date: defaultToday,
      balance: 0,
      value: 0,
      commission: 0,
      payment_commission: "no",
      company: "",
      carnet: "no",
      state: 1,
      stade: 1,
      contract_code: "",
      beneficiaries: [{ name: "" }],
    });

    setDepartmentId("");
    setCities([]);
    setSearchCounselor("");
    setIdCardError(null);
    lastCheckedRef.current = "";
  };

  return {
    isView,
    isEdit,
    isCreate,
    departments,
    cities,
    departmentId,
    setDepartmentId,
    franchises,
    counselors,
    agreements,
    saving,
    idCardError,
    checkingIdCard,
    searchCounselor,
    setSearchCounselor,
    showCounselors,
    setShowCounselors,
    wantsRenovation,
    setWantsRenovation,
    renovationType,
    setRenovationType,
    renovationDateIni,
    setRenovationDateIni,
    renovationValue,
    setRenovationValue,
    renovationDatePayment,
    setRenovationDatePayment,
    form,
    setForm,
    validateIdCard,
    addBeneficiary,
    removeBeneficiary,
    updateBeneficiaryName,
    filteredCounselors,
    canSubmit,
    submit,
    clear,
  };
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npm test -- useAffiliateFormState`
Expected: PASS en los 7 tests.

- [ ] **Step 5: Reducir `AffiliateForm.tsx` a JSX + el hook**

En `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx`, reemplazar las líneas 1-436 completas (todo lo que hay antes de `return (` en la línea 438) por:
```tsx
"use client";

import { Save, Eraser, Plus, Trash2 } from "lucide-react";
import DatePickerWithToday from "@/components/FormElements/DatePicker/DatePickerWithToday";
import { SearchableSelect } from "@/components/FormElements/SearchableSelect";
import { Button } from "@/components/ui-elements/button";
import { addOneYear } from "@/lib/dates";
import type { ApiAffiliate } from "../fetch";
import {
  useAffiliateFormState,
  onlyDigits,
  type AffiliateFormMode,
  type AffiliateSubmitPayload,
} from "../_hooks/useAffiliateFormState";

type Props = {
  mode: AffiliateFormMode;
  initial?: Partial<ApiAffiliate>;
  onSubmit?: (payload: AffiliateSubmitPayload) => Promise<void>;
};

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

export default function AffiliateForm({ mode, initial, onSubmit }: Props) {
  const {
    isView,
    isEdit,
    departments,
    cities,
    departmentId,
    setDepartmentId,
    franchises,
    counselors,
    agreements,
    saving,
    idCardError,
    checkingIdCard,
    searchCounselor,
    setSearchCounselor,
    showCounselors,
    setShowCounselors,
    wantsRenovation,
    setWantsRenovation,
    renovationType,
    setRenovationType,
    renovationDateIni,
    setRenovationDateIni,
    renovationValue,
    setRenovationValue,
    renovationDatePayment,
    setRenovationDatePayment,
    form,
    setForm,
    validateIdCard,
    addBeneficiary,
    removeBeneficiary,
    updateBeneficiaryName,
    filteredCounselors,
    canSubmit,
    submit,
    clear,
  } = useAffiliateFormState({ mode, initial, onSubmit });

```
(El `return (` de la línea 438 original y todo su contenido hasta el final del archivo — las líneas 438-961 — no cambian: siguen usando exactamente los mismos nombres `form`, `setForm`, `isView`, `isEdit`, `departments`, `cities`, `departmentId`, `canSubmit`, `saving`, `submit`, `clear`, `addBeneficiary`, `removeBeneficiary`, `updateBeneficiaryName`, `filteredCounselors`, `searchCounselor`, `setSearchCounselor`, `showCounselors`, `setShowCounselors`, `wantsRenovation`, `setWantsRenovation`, `renovationType`, `setRenovationType`, `renovationDateIni`, `setRenovationDateIni`, `renovationValue`, `setRenovationValue`, `renovationDatePayment`, `setRenovationDatePayment`, `idCardError`, `checkingIdCard`, `franchises`, `counselors`, `agreements`, `onlyDigits` y `addOneYear` — todos ahora vienen del hook o de los imports nuevos en vez de estar definidos localmente, con el mismo nombre.)

- [ ] **Step 6: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos. `isCreate` ya no se desestructura en el componente porque la JSX no lo usa directamente (solo `isView`/`isEdit`) — si `tsc` no se queja, está bien dejarlo fuera de la desestructuración.

- [ ] **Step 7: Verificación manual completa (los 3 modos)**

Con `npm run dev`:
1. `/4dnn1n/affiliates/new`: llenar el formulario completo, confirmar que "Vigencia final" se autocalcula, que el botón "Guardar" se habilita solo con todos los campos obligatorios, y que crea el afiliado correctamente.
2. `/4dnn1n/affiliates/[id]/edit` de un afiliado existente: confirmar que carga los datos, que el asesor aparece preseleccionado en el buscador, que "Renovar" muestra la sección de nueva vigencia y la guarda correctamente.
3. Vista de solo lectura (`mode="view"`, si existe una pantalla que la use): confirmar que todos los campos están deshabilitados y no hay botones de guardar/limpiar.
4. Repetir el caso de documento duplicado (cédula ya usada por otro afiliado) y confirmar que el mensaje de error aparece igual que antes.

**Checkpoint — no hacer commit.**

---

### Task 9: Verificación final integrada

**Files:** ninguno (solo verificación).

**Interfaces:** consume el resultado combinado de las Tasks 1-8.

- [ ] **Step 1: Suite de tests completa**

Run: `npm test`
Expected: todos los tests (setup-smoke, dates, useOptimisticToggle) en verde.

- [ ] **Step 2: Compilación completa sin errores nuevos**

Run: `npx tsc --noEmit`
Expected: mismo conjunto de errores preexistentes que antes de este plan (si los hay, documentados ya en el spec de rendimiento anterior), cero errores nuevos.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin advertencias nuevas relacionadas a los archivos tocados en este plan.

- [ ] **Step 4: Revisar el diff completo antes de decidir integrar**

```bash
git diff --stat
git diff
```
Expected: cambios concentrados en los archivos listados en cada tarea, sin modificaciones accidentales a `proxy.ts`, `memCache.ts`, ni a los módulos no migrados en la Task 7.

**Checkpoint final — el usuario decide cuándo y cómo commitear/pushear este conjunto de cambios.**
