# Cobertura de Tests — Fase 2 (catálogos: agreements, counselors, franchises,
doctors+specialties, membership-forms, contacts, content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tests a los ~51 archivos sin cobertura de los 7 módulos "catálogo" de riesgo medio
del panel admin (`agreements`, `counselors`, `franchises`, `doctors`+`specialties`,
`membership-forms`, `contacts`, `content` allies+specialists), siguiendo la misma metodología ya
validada en la Fase 1 y documentada en el spec de esta iniciativa.

**Architecture:** 35 tareas agrupadas en 7 bloques (uno por módulo), cada bloque siguiendo el mismo
orden de la Fase 1: `fetch.ts` primero (capa de aplicación), luego `columns.tsx` (funciones puras de
definición de columnas), luego el/los formulario(s), y por último las páginas contenedoras
(`page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`), que mockean todo lo anterior
para aislar su propia lógica de permisos/wiring. A diferencia de la Fase 1 (`affiliates`/
`appointments`, que usan `useServerTable` con paginación de servidor), la mayoría de estos módulos
son catálogos pequeños que usan `useClientTable` (carga todo de una vez, sin paginación de servidor)
— ver Global Constraints para el patrón de mock de ese hook. Dos archivos son wrappers puramente
presentacionales sin lógica propia (`counselors/layout.tsx`, `franchises/layout.tsx`) y no se testean,
según el árbol de decisión del spec — se documenta el porqué en su propia tarea.

**Tech Stack:** Vitest + Testing Library (`@testing-library/react`), ya configurado. Carpeta espejo
`tests/`.

**Spec:** `docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`

## Global Constraints

- **Ubicación:** carpeta espejo `tests/`, misma ruta que el archivo de origen (ej.
  `tests/app/4dnn1n/agreements/fetch.test.ts`).
- **Comentarios en inglés**, sin referenciar documentos internos por nombre. `describe()`/`it()` en
  **español**, patrón AAA.
- **Mocks tipados**, nunca `any` salvo en el propio cast del mock (`(alert.confirm as any).mockImplementation(...)`).
- **Patrón de mock para `@/lib/alert`** (reutilizar tal cual de la Fase 1):
  ```ts
  vi.mock("@/lib/alert", () => ({
    alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  }));
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
  ```
  Para el caso de cancelación, usar `mockResolvedValue(false)` sin invocar `onConfirm`.
- **Patrón de mock para `@/context/AuthContext`:**
  ```ts
  vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
  (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 }, loading: false, isLoggingOut: false });
  ```
- **Patrón de mock para `next/navigation`:** `vi.mock("next/navigation", () => ({ useRouter: vi.fn(), useParams: vi.fn(), useSearchParams: vi.fn() }))`, cada uno devuelto por `mockReturnValue` según lo que la página use.
- **Mockear siempre el módulo `fetch.ts` completo** en tests de páginas/formularios (`vi.mock("../fetch")` o la ruta relativa correcta) — nunca dejar pasar una llamada real a `apiFetch`.
- **`DataTable` se mockea en los tests de `page.tsx`** con el mismo stub mínimo de la Fase 1:
  ```tsx
  vi.mock("@/components/data-table/DataTable", () => ({
    DataTable: (props: any) => (
      <div data-testid="data-table">
        <div data-testid="toolbar-actions">{props.toolbarActions}</div>
        {props.data?.map((item: any) => {
          const actionsColumn = props.columns?.find((col: any) => col.id === "actions");
          return (
            <div key={item.id} data-testid={`row-${item.id}`}>
              {actionsColumn?.cell?.({ row: { original: item } })}
            </div>
          );
        })}
      </div>
    ),
  }));
  ```
  El stub invoca directamente la celda de la columna `actions` (construida por el `columns.tsx` ya
  testeado en su propia tarea) porque es la única forma de alcanzar handlers como `onDelete`/
  `onToggleState` sin depender del comportamiento interno real de `DataTable` (que se testea en la
  Fase 4).
- **Patrón de mock para `@/hooks/useClientTable`** (nuevo en esta fase — usado por `agreements`,
  `counselors`, `franchises`, `doctors/specialties`, `content/allies`, `content/specialists`):
  ```ts
  vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));
  (useClientTable as any).mockReturnValue({ data: [mockItem], setData: vi.fn(), loading: false });
  ```
  **Importante:** a diferencia de `useServerTable`/`useOptimisticToggle` (que ya tienen test propio,
  confirmado en `tests/hooks/useServerTable.test.ts` y `tests/hooks/useOptimisticToggle.test.ts`),
  `useClientTable` **todavía no tiene test propio** — pertenece a los "hooks restantes" que el censo
  del spec asigna a la Fase 4. Aquí se mockea exactamente igual (para aislar la lógica propia de cada
  página), pero sin agregar su test en este plan — eso ocurre cuando le toque turno a la Fase 4.
- **Patrón de mock para `@/hooks/useOptimisticToggle`:** `vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn(() => vi.fn()) }))`. Cuando una tarea necesita inspeccionar los
  argumentos con los que la página invocó el hook (caso especial de `agreements`, ver Tarea 4), usar
  `vi.fn()` sin el `mockReturnValue` fijo y leer `(useOptimisticToggle as any).mock.calls[0][0]`.
- **Patrón de mock para `@/hooks/useServerTable`** (usado por `doctors`, `doctors/specialties/[id]`,
  `membership-forms`, `contacts`): igual que en la Fase 1 —
  ```ts
  vi.mock("@/hooks/useServerTable", () => ({
    useServerTable: vi.fn(() => ({
      data: [mockItem], setData: vi.fn(), setMeta: vi.fn(), stadeFilter: "1",
      tableProps: { data: [mockItem], loading: false },
      isInitialLoad: false,
    })),
  }));
  ```
- **Patrón de mock para `fetch.ts` basados en FormData** (nuevo en esta fase — únicamente
  `content/allies/fetch.ts` y `content/specialists/fetch.ts`): estos dos archivos NO usan `apiFetch`
  para las mutaciones (`createAlly`/`updateAlly`/`createSpecialist`/`updateSpecialist`), sino un
  helper interno `apiFetchFormData` que llama a `fetch()` global directamente con
  `credentials: "include"` y el header `X-XSRF-TOKEN` leído de `getXsrfToken()`. `getAllies`/
  `getSpecialists` (listado) y `deleteAlly`/`deleteSpecialist` sí usan `apiFetch` normal. Mock
  necesario en estos dos archivos de test:
  ```ts
  vi.mock("@/lib/api", () => ({
    apiFetch: vi.fn(),
    csrf: vi.fn().mockResolvedValue(undefined),
    getXsrfToken: vi.fn(() => "test-xsrf-token"),
  }));
  vi.mock("@/lib/memCache", () => ({
    memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
    TTL_CATALOG: 300000,
  }));
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  ```
  `API_URL` en ambos archivos cae al default `"http://localhost:8000"` (no hay
  `NEXT_PUBLIC_API_URL` configurado en `vitest.config.ts` ni en un `.env.test`) — usar ese valor
  literal en las aserciones de URL.
- `npm run test` y `npx tsc --noEmit` limpios después de cada tarea.
- Commits por tarea en la rama de esta fase (cada tarea es su propio checkpoint).

---

## Bloque `agreements`

### Tarea 1: Tests de `agreements/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/agreements/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 7 exports de `src/app/4dnn1n/agreements/fetch.ts`: `getAgreements`, `getAgreement`,
  `getDepartments`, `getCitiesByDepartment`, `createAgreement`, `updateAgreement`,
  `updateAgreementState`.

**Contexto verificado:** importa `apiFetch`/`csrf` de `@/lib/api` y `memCache`/`TTL_GEO`/
`TTL_CATALOG` de `@/lib/memCache` (ambos con test propio ya existente — mockear, no re-testear).
Las mutaciones invalidan el prefijo `"agreements:"` (no `"agreements:list:"` como en `affiliates`) —
esto cubre tanto la caché de listado (`"agreements:all"`) como cualquier futura clave con ese
prefijo.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_GEO: 1800000, TTL_CATALOG: 300000,
}));
```

- [ ] **Step 1: Tests de `getAgreements`**

1. `apiFetch` llamado con `/api/agreements` (sin query string, esta función no acepta params).
2. Clave de caché `"agreements:all"`.
3. `apiFetch` resuelve `{ data: undefined }` → retorna `[]` (el `?? []`).
4. `apiFetch` resuelve `{ data: [{...}] }` → retorna ese array tal cual.

- [ ] **Step 2: Tests de `getAgreement`**

1. `getAgreement(5)` → `apiFetch` llamado con `/api/agreements/5`, SIN paso previo por `memCache.get`
   (esta función no cachea, a diferencia de `getAgreements`), retorna `res.data`.

- [ ] **Step 3: Tests de `getDepartments`/`getCitiesByDepartment`**

1. `getDepartments()` → `/api/departments`, clave de caché `"departments"`, TTL `TTL_GEO`.
2. `getCitiesByDepartment(7)` → `/api/departments/7/cities`, clave de caché `"cities:7"`.

- [ ] **Step 4: Tests de `createAgreement` y `updateAgreement`**

1. `createAgreement({ name: "Convenio A", amount: 50000, state: 1, city_id: 3 })` → `csrf()` antes,
   `apiFetch` `POST` a `/api/agreements` con `JSON.stringify(payload)`, luego
   `memCache.invalidatePrefix("agreements:")`.
2. `updateAgreement(5, payload)` → `csrf()` antes, `apiFetch` `PUT` (no `PATCH`) a
   `/api/agreements/5`, misma invalidación de caché.

- [ ] **Step 5: Tests de `updateAgreementState` — la firma real (id, agreement completo, newState)**

**Contexto verificado:** a diferencia de `updateAffiliateState`/`updateCounselorState`, que sólo
reciben `(id, nuevoEstado)`, `updateAgreementState` recibe el **objeto `agreement` completo** como
segundo parámetro y reconstruye el payload entero (`name`, `amount`, `city_id`) a partir de él, no
sólo el campo `state`. Esta es la firma real actual — confirmar exactamente este comportamiento, no
la firma más simple de otros módulos.

1. `updateAgreementState(5, { id: 5, name: "Convenio A", amount: 50000, state: 1, city_id: 3 }, 0)`
   → `csrf()` antes, `apiFetch` `PUT` a `/api/agreements/5` con body
   `JSON.stringify({ name: "Convenio A", amount: 50000, state: 0, city_id: 3 })` (el `state` es el
   `newState` recibido, los demás campos vienen del `agreement` pasado, no de un fetch adicional),
   luego `memCache.invalidatePrefix("agreements:")`.

- [ ] **Step 6: Correr `npm run test` y `npx tsc --noEmit`**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 2: Tests de `agreements/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/agreements/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildAgreementColumns({ onToggleState, canView, canManage })` → `ColumnDef<ApiAgreement>[]`.

- [ ] **Step 1: Test de las columnas `id`, `name`, `amount`, `city`**

1. `amount: 150000` → celda renderiza `"$150.000"` (usa `Number(amount).toLocaleString("es-CO")`
   con prefijo `$` literal, sin espacio).
2. `city: { name: "Cali" }` → columna `city` muestra `"Cali"`; `city: null` → `"-"`.

- [ ] **Step 2: Test de la columna `state`**

1. `state: 1` → texto "Activo", clases verdes.
2. `state: 0` → texto "Inactivo", clases rojas (recordar: `agreements` usa `0` para inactivo, NO `2`
   como `counselors`/`franchises`/`doctors`).

- [ ] **Step 3: Test de la columna `actions` — gate de `canView`/`canManage` independientes**

1. `canView: false` → la columna `id: "actions"` completa NO existe en el array retornado
   (independientemente de `canManage`).
2. `canView: true, canManage: false` → la columna existe, con el link "Ver" (`Eye`) visible, pero
   SIN el link "Modificar" (`Pencil`) ni el botón de toggle (`Power`).
3. `canView: true, canManage: true` → los 3 elementos visibles; click en el botón de toggle invoca
   `onToggleState(agreement)` con el convenio de la fila.
4. El link "Ver" siempre apunta a `/4dnn1n/agreements/{id}` y el de "Modificar" a
   `/4dnn1n/agreements/{id}/edit`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 3: Tests de `agreements/_components/AgreementForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/agreements/_components/AgreementForm.test.tsx` (crear)

**Interfaces:**
- Consume `AgreementForm({ mode, initial?, onSubmit? })` (default export) de
  `src/app/4dnn1n/agreements/_components/AgreementForm.tsx`.
- Mockear `../fetch` (`getDepartments`, `getCitiesByDepartment`) — el resto de exports de `fetch.ts`
  no los usa este componente.

**Contexto verificado:** a diferencia de `AffiliateForm`, este formulario NO usa un hook separado —
toda la lógica de estado vive en el propio archivo. `isCreate` se calcula pero no se usa para
condicionar ninguna sección visual (no hay diferencias de UI entre `create` y `edit`, sólo entre
`isView` y el resto).

- [ ] **Step 1: Test de carga de catálogos y preselección de departamento**

1. Al montar, `getDepartments()` se llama una vez.
2. `initial.city.department_id: 7` presente y `departmentId` aún vacío → se preselecciona
   `departmentId = 7` automáticamente, lo que dispara `getCitiesByDepartment(7)`.
3. Cambiar de departamento manualmente → recarga `getCitiesByDepartment` con el nuevo id y limpia
   `form.city_id` mientras carga.

- [ ] **Step 2: Test de visibilidad por `mode`**

1. `mode="view"` → todos los inputs `disabled`; sin botones "Guardar"/"Limpiar"; input de "Código"
   visible mostrando `initial.id`.
2. `mode="create"` → SIN el input de "Código" (sólo aparece en `view`/`edit`); inputs habilitados;
   botones "Guardar"/"Limpiar" visibles.
3. `mode="edit"` → input de "Código" visible y deshabilitado; inputs de datos habilitados.

- [ ] **Step 3: Test de validación de `amount`**

1. `form.amount: "5000"` (vía `fireEvent.change`) → mensaje "El valor debe ser mayor o igual a
   10.000" visible (sin signo `$`, distinto del mensaje de `DoctorForm`).
2. `form.amount: "10000"` → sin mensaje de error.
3. Escribir letras en el input de "Valor ($)" → se filtran vía `onlyDigits`, sólo quedan los dígitos.

- [ ] **Step 4: Test de `canSubmit` y `submit`**

1. `canSubmit` es `false` si falta `name`, `amount`, `departmentId` o `city_id`, o si
   `Number(amount) < 10000`. `true` sólo cuando todo está completo.
2. Click en "Guardar" con datos válidos → invoca `onSubmit` con
   `{ name, amount: Number(amount), city_id: Number(city_id), state: Number(form.state) === 1 ? 1 : 0 }`.
3. Mientras se resuelve `onSubmit`, el botón muestra "Guardando..." y queda deshabilitado.

- [ ] **Step 5: Test de `clear`**

1. Click en "Limpiar" → resetea `name`/`amount`/`city_id` a vacío, `state` a `1`, `departmentId` a
   `""` y `cities` a `[]` — NO llama `onSubmit`.

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 4: Tests de `agreements/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/agreements/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/agreements/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/agreements/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/agreements/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `AgreementsPage`, `NewAgreementPage`, `ViewAgreementPage`, `EditAgreementPage` (default
  exports).
- Mockear `../fetch` (o profundidad correspondiente), `@/hooks/useClientTable`,
  `@/hooks/useOptimisticToggle`, `@/context/AuthContext`, `next/navigation`, `@/lib/alert`,
  `@/components/data-table/DataTable` (stub).

- [ ] **Step 1: Test de `page.tsx` — gates de `canView`/`canManage` y el botón de crear**

1. `user.type: 3` → `canView: false, canManage: false` → botón "Crear Convenio" no se renderiza
   (`toolbarActions` es `null`).
2. `user.type: 2` → `canView: true, canManage: false` → sigue sin botón "Crear Convenio" (requiere
   `type === 1` exactamente para `canManage`).
3. `user.type: 1` → botón "Crear Convenio" visible con `href="/4dnn1n/agreements/new"`.

- [ ] **Step 2: Test de `page.tsx` — el `updateFn` con resolución por ref (caso especial)**

**Contexto verificado:** el `updateFn` que la página pasa a `useOptimisticToggle` no es un simple
passthrough — busca el convenio completo en `dataRef.current` por `id` y sólo entonces llama
`updateAgreementState(id, agreement, nextState)`. Para testear esta lógica sin mockear todo el
comportamiento interno de `useOptimisticToggle`, capturar el argumento con el que la página invocó
el hook:

```ts
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));
// ...
render(<AgreementsPage />);
const updateFn = (useOptimisticToggle as any).mock.calls[0][0].updateFn;
```

1. `data` mockeada con `[{ id: 5, name: "Convenio A", amount: 50000, state: 1, city_id: 3 }]` →
   invocar `updateFn(5, 0)` → llama `updateAgreementState(5, dataItem, 0)` con el objeto completo de
   la lista.
2. Invocar `updateFn(999, 0)` (id que no existe en `data`) → la promesa retornada rechaza con
   `new Error("Convenio no encontrado en la lista actual")`, y `updateAgreementState` NO se llama.

- [ ] **Step 3: Tests de `new/page.tsx` — gate por `useEffect` + redirect**

1. `user.type: 3` → el componente no renderiza el formulario (retorna `null`); el `useEffect` llama
   `router.replace("/4dnn1n/agreements")`.
2. `user.type: 1` → formulario visible.
3. `onSubmit`: `alert.confirm` → `onConfirm` llama `createAgreement(payload)` → éxito → `alert.success`
   → `router.push("/4dnn1n/agreements")`.
4. Si `createAgreement` rechaza → `alert.error(...)` con `getApiErrorMessage(err)`, sin `router.push`.

- [ ] **Step 4: Tests de `[id]/page.tsx` (vista) — SIN gate de permisos**

**Hallazgo verificado, no es un bug a corregir en este plan:** a diferencia de `new`/`edit`, esta
página NO importa `useAuth` ni verifica ningún permiso — cualquier usuario autenticado que navegue a
la URL puede ver el convenio. Documentar este hallazgo en el reporte de la tarea (para que el
usuario decida si merece revisión aparte) y escribir los tests reflejando el comportamiento real, sin
inventar un gate que no existe.

1. Antes de que `getAgreement` resuelva → `FormPageSkeleton` (verificar por su presencia, no por
   texto).
2. `getAgreement(5)` resuelve → `AgreementForm` se renderiza con `mode="view"`, `initial={data}`.

- [ ] **Step 5: Tests de `[id]/edit/page.tsx`**

1. `user.type: 3` → `useEffect` llama `router.replace("/4dnn1n/agreements")`, retorna `null`.
2. `user.type: 1` mientras `getAgreement` no resuelve → `FormPageSkeleton`.
3. `onSubmit`: `alert.confirm` → `onConfirm` llama `updateAgreement(id, payload)` → éxito →
   `alert.success` → `router.push("/4dnn1n/agreements")`.
4. Si `updateAgreement` rechaza → `alert.error(...)`, sin redirigir.

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint — fin del bloque `agreements`.**

---

## Bloque `counselors`

### Tarea 5: Tests de `counselors/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/counselors/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 9 exports: `getCounselors`, `getCounselor`, `getDepartments`,
  `getCitiesByDepartment`, `createCounselor`, `updateCounselor`, `updateCounselorState`,
  `checkCounselorIdCard`, `getActiveFranchises`.

**Contexto verificado:** mismo patrón de mock de `@/lib/api`/`@/lib/memCache` que en `agreements`.
`checkCounselorIdCard` NO pasa por `memCache` (siempre consulta al backend, sin caché — a diferencia
de todo lo demás en este archivo).

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_GEO: 1800000, TTL_CATALOG: 300000,
}));
```

- [ ] **Step 1: Tests de `getCounselors` y `getCounselor`**

1. `getCounselors()` → `/api/counselors`, clave de caché `"counselors:all"`, retorna `res.data ?? []`.
2. `getCounselor(5)` → `/api/counselors/5`, sin caché, retorna `res.data`.

- [ ] **Step 2: Tests de `getDepartments`/`getCitiesByDepartment`/`getActiveFranchises`**

1. Igual patrón que `agreements/fetch.ts` Step 3: `/api/departments` (clave `"departments"`),
   `/api/departments/{id}/cities` (clave `` `cities:${id}` ``).
2. `getActiveFranchises()` → `/api/users/active`, clave de caché `"franchises:active"`.

- [ ] **Step 3: Tests de `createCounselor`, `updateCounselor`, `updateCounselorState`**

1. `createCounselor(payload)` → `csrf()` antes, `apiFetch` `POST` a `/api/counselors`, luego
   `memCache.invalidatePrefix("counselors:")`.
2. `updateCounselor(5, payload)` → `csrf()` antes, `apiFetch` `PATCH` a `/api/counselors/5` (no
   `PUT`), misma invalidación.
3. `updateCounselorState(5, 2)` → `csrf()` antes, `apiFetch` `PATCH` a `/api/counselors/5` con body
   `JSON.stringify({ state: 2 })`, misma invalidación.

- [ ] **Step 4: Tests de `checkCounselorIdCard`**

1. `checkCounselorIdCard("123")` → `apiFetch` con `/api/counselors/check-id-card?id_card=123`, SIN
   pasar por `memCache.get`.
2. `checkCounselorIdCard("123", 9)` → incluye `&ignore_id=9`.
3. `apiFetch` resuelve `{ exists: true }` → la función retorna ese objeto tal cual (sin transformar).

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 6: Tests de `counselors/layout.tsx` (documentar por qué NO se testea) y
`counselors/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/counselors/_components/columns.test.tsx` (crear)
- **No crear** `tests/app/4dnn1n/counselors/layout.test.tsx`.

**Interfaces:**
- Consume `buildCounselorColumns({ onToggleState, hasAccess })` → `ColumnDef<ApiCounselor>[]`.

**Decisión de no testear `layout.tsx` (árbol de decisión del spec):** `CounselorsLayout` es un
wrapper puramente presentacional — recibe `children` y los envuelve en dos `div` con clases
Tailwind fijas (`max-w-[1400px]`, `mt-4`). No tiene estado, efectos, ni ninguna decisión
condicional. Aplicar el árbol de decisión del spec ("¿tiene lógica de negocio o comportamiento en
runtime? No → ¿es config/wrapper simple? Sí → no se testea") lo clasifica como no-testeable
directamente; su uso correcto queda cubierto indirectamente por cualquier test de una página que
viva bajo esa ruta. Documentar esta decisión en el reporte de la tarea (no crear el archivo de test
es la acción correcta aquí, no un olvido). El mismo razonamiento aplica en la Tarea 10 para
`franchises/layout.tsx` (código idéntico).

- [ ] **Step 1: Test de las columnas `full_name`, `id_card`, `movil`, `city`**

1. `full_name` (`accessorFn`) con `{ name: "María", lastname: "Gómez" }` → `"María Gómez"`.
2. `movil: null` → celda muestra `"-"`; `movil: "3001234567"` → lo muestra tal cual.
3. `city: { name: "Medellín" }` → `"Medellín"`; `city: null` → `"-"`.

- [ ] **Step 2: Test de la columna `state`**

1. `state: 1` → "Activo", clases verdes.
2. `state: 2` → "Inactivo", clases rojas (recordar: `counselors` usa `1`/`2`, no `1`/`0` como
   `agreements`).

- [ ] **Step 3: Test de la columna `actions` — gate único de `hasAccess` (sin sub-gate de
  `canManage`)**

1. `hasAccess: false` → la columna `id: "actions"` completa no existe en el array.
2. `hasAccess: true` → Eye, Pencil y el botón de toggle están TODOS presentes juntos (a diferencia
   de `agreements`, aquí no hay una separación `canView`/`canManage` — es un único gate). Click en el
   botón de toggle invoca `onToggleState(c)`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 7: Tests de `counselors/_components/CounselorForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/counselors/_components/CounselorForm.test.tsx` (crear)

**Interfaces:**
- Consume `CounselorForm({ mode, initial?, onSubmit? })`.
- Mockear `../fetch` (`getCitiesByDepartment`, `getDepartments`, `checkCounselorIdCard`,
  `getActiveFranchises`) y `@/lib/alert` (usado directamente por este formulario para
  `alert.warn`, a diferencia de `AgreementForm`).

**Contexto verificado:** este formulario valida la cédula contra el backend de forma más elaborada
que cualquier otro de esta fase — replica el patrón de `AffiliateForm`/`useAffiliateFormState` de la
Fase 1 pero inline (sin hook separado).

- [ ] **Step 1: Test de carga inicial de catálogos**

1. Al montar, `getActiveFranchises()` y `getDepartments()` se llaman una vez cada uno.

- [ ] **Step 2: Test de `validateIdCard`**

1. Valor vacío → `idCardError`: "La cédula es obligatoria.", retorna `false`.
2. `isEdit: true` y el valor no cambió respecto a `initialIdCard` → NO llama
   `checkCounselorIdCard` (se salta la validación), retorna `true`.
3. Valor nuevo, `checkCounselorIdCard` resuelve `{ exists: true }` → `idCardError`: "Esta cédula ya
   existe en el sistema.", retorna `false`.
4. Valor nuevo, `checkCounselorIdCard` resuelve `{ exists: false }` → `idCardError: null`, retorna
   `true`.
5. `checkCounselorIdCard` rechaza → `idCardError`: "No se pudo validar la cédula (intenta de
   nuevo).", retorna `false`.
6. Mientras la validación está en curso, se muestra el texto "Validando cédula...".
7. `onBlur` del input de cédula dispara `validateIdCard` automáticamente (sólo si `!isView`).

- [ ] **Step 3: Test de `canSubmit`**

1. `false` si falta `name`/`lastname`/`id_card`/`type_contra`/`departmentId`/`city_id`/`user_id`, o
   si `idCardError` no es `null`, o si `movil` está presente pero su longitud no es exactamente 10.
2. `true` cuando todo lo anterior está satisfecho y `movil` está vacío o tiene exactamente 10
   dígitos.

- [ ] **Step 4: Test de `submit` — revalidación forzada de cédula antes de guardar**

**Contexto verificado:** `submit()` SIEMPRE vuelve a llamar `validateIdCard(form.id_card)` antes de
comprobar `canSubmit`, sin importar si ya se había validado en el `onBlur` — si esa revalidación
falla, muestra `alert.warn("Cédula inválida", ...)` y retorna sin llamar `onSubmit`, incluso si
`canSubmit` era `true` en ese momento.

1. `checkCounselorIdCard` resuelve `{ exists: true }` en la revalidación de `submit` → `alert.warn`
   con título "Cédula inválida", `onSubmit` NO se llama.
2. Revalidación exitosa pero `canSubmit` es `false` por otro campo faltante → `alert.warn` con
   título "Faltan datos", `onSubmit` NO se llama.
3. Todo válido → `onSubmit` se llama con el payload exacto:
   `{ name, lastname, id_card: onlyDigits(id_card), address: address||null, date_admission: date_admission||null, type_contra, rol: 0, phone: phone||null, movil: movil||null, city_id: Number(city_id), user_id: Number(user_id), state: Number(state)===2?2:1, email: null, password: null }`
   (`email` y `password` siempre `null` — este formulario nunca los expone en la UI).

- [ ] **Step 5: Test de `clear`**

1. Resetea todos los campos del form, `departmentId`, `cities`, `idCardError` a `null`, y el ref
   `lastCheckedRef` a `""`.

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 8: Tests de `counselors/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/counselors/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/counselors/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/counselors/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/counselors/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `CounselorsPage`, `NewCounselorPage`, `ViewCounselorPage`, `EditCounselorPage`.
- Mockear `../fetch`, `@/hooks/useClientTable`, `@/hooks/useOptimisticToggle`,
  `@/context/AuthContext`, `next/navigation`, `@/lib/alert`, `@/components/data-table/DataTable`
  (stub).

**Hallazgo verificado, no es un bug a corregir en este plan:** a diferencia de `agreements`/
`franchises`, **ninguna** de las páginas `new`, `[id]` (vista) o `[id]/edit` de `counselors`
verifica permisos — ni siquiera importan `useAuth`. El único gate real del módulo es el botón
"Crear Asesor" en `page.tsx` (que sólo se muestra si `hasAccess`), pero la URL `/new` es accesible
directamente sin restricción de rol. Documentar este hallazgo en el reporte de la tarea; escribir
los tests reflejando el comportamiento real (sin gate en esas 3 páginas), no inventar uno.

- [ ] **Step 1: Test de `page.tsx` — gate de `hasAccess` para el botón "Crear Asesor"**

1. `user.type: 3` → botón no se renderiza.
2. `user.type: 1` o `user.type: 2` → botón visible con `href="/4dnn1n/counselors/new"`.
3. Simular click en el botón de toggle vía el stub de `DataTable` → invoca la función retornada por
   `useOptimisticToggle` (mockeada) — verificar que se le pasa el `ApiCounselor` de la fila.

- [ ] **Step 2: Tests de `new/page.tsx` — sin gate**

1. Renderiza el formulario directamente sin verificar `user.type` (no hay mensaje de "sin
   permisos" posible en este archivo).
2. `onSubmit`: `alert.confirm` → `onConfirm` llama `createCounselor(payload)` → éxito →
   `alert.success` → `router.push("/4dnn1n/counselors")`.
3. Si `createCounselor` rechaza → `alert.error(...)`.

- [ ] **Step 3: Tests de `[id]/page.tsx` (vista) — sin gate**

1. Antes de resolver `getCounselor` → `FormPageSkeleton`.
2. Resuelto → `CounselorForm` con `mode="view"`, `initial={data}`.

- [ ] **Step 4: Tests de `[id]/edit/page.tsx` — sin gate**

1. Antes de resolver → `FormPageSkeleton`.
2. `onSubmit`: `alert.confirm` → `onConfirm` llama `updateCounselor(id, payload)` → éxito →
   `alert.success` → `router.push("/4dnn1n/counselors")`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint — fin del bloque `counselors`.**

---

## Bloque `franchises`

### Tarea 9: Tests de `franchises/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/franchises/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 6 exports: `getFranchises`, `getFranchise`, `getDepartments`,
  `getCitiesByDepartment`, `createUser`, `updateFranchise`, `updateFranchiseState`.

**Contexto verificado — este archivo NO usa `memCache` en absoluto** (a diferencia de todos los
demás `fetch.ts` de esta fase): sólo importa `apiFetch`/`csrf` de `@/lib/api`. Sólo mockear
`@/lib/api`; no hace falta mock de `@/lib/memCache` aquí.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
```

- [ ] **Step 1: Tests de `getFranchises` — el filtro de `SuperAdmin` y la normalización de `type`**

**Contexto verificado:** `getFranchises` llama a `/api/users` (endpoint compartido con usuarios en
general, no uno específico de franquicias), convierte `type` a `Number`, y filtra explícitamente
`type !== FranchiseType.SuperAdmin` (`1`) del lado del cliente.

1. `apiFetch` resuelve `{ data: [{ id: 1, type: "1", name: "Root" }, { id: 2, type: "2", name: "F1" }, { id: 3, type: 3, name: "F2" }] }`
   → `getFranchises()` retorna sólo los 2 últimos (excluye el `type: "1"` incluso viniendo como
   string), y `type` queda normalizado como `number` en el resultado (`2`, `3`).
2. `apiFetch` resuelve `{ data: undefined }` → retorna `[]`.

- [ ] **Step 2: Tests de `getFranchise`, `getDepartments`, `getCitiesByDepartment`**

1. `getFranchise(5)` → `/api/users/5`, retorna `res.data`.
2. `getDepartments()` → `/api/departments`, retorna `res.data ?? []` (SIN paso por `memCache`, a
   diferencia de `agreements`/`counselors`).
3. `getCitiesByDepartment(7)` → `/api/departments/7/cities`, retorna `res.data ?? []`.

- [ ] **Step 3: Tests de `createUser`, `updateFranchise`, `updateFranchiseState`**

1. `createUser(payload)` → `csrf()` antes, `apiFetch` `POST` a `/api/users` con
   `JSON.stringify(payload)`. SIN ninguna invalidación de caché (no hay caché que invalidar en este
   archivo).
2. `updateFranchise(5, payload)` → `csrf()` antes, `apiFetch` `PATCH` a `/api/users/5`.
3. `updateFranchiseState(5, 2)` → `csrf()` antes, `apiFetch` `PATCH` a `/api/users/5` con body
   `JSON.stringify({ state: 2 })`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 10: `franchises/layout.tsx` (documentar por qué NO se testea) y tests de
`franchises/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/franchises/_components/columns.test.tsx` (crear)
- **No crear** `tests/app/4dnn1n/franchises/layout.test.tsx`.

**Interfaces:**
- Consume `buildUserColumns({ onToggleState, isSuperAdmin })` → `ColumnDef<ApiFranchise>[]`.

**Decisión de no testear `layout.tsx`:** código idéntico a `counselors/layout.tsx` (mismo wrapper
presentacional sin lógica propia) — mismo razonamiento de la Tarea 6, documentar en el reporte.

- [ ] **Step 1: Test de las columnas `nit`, `name`, `movil`, `address`, `city`**

1. `movil: null` → "-"; `address: null` → "-".
2. `city: { name: "Barranquilla" }` → `"Barranquilla"`; `city: null` → `"-"`.

- [ ] **Step 2: Test de la columna `state`**

1. `state: 1` → "Activo"; `state: 2` → "Inactivo" (mismo `1`/`2` que `counselors`).

- [ ] **Step 3: Test de la columna `actions` — el gate `isSuperAdmin` (Eye siempre visible)**

**Contexto verificado:** a diferencia de `counselors` (un único gate `hasAccess` que oculta TODA la
columna `actions`), en `franchises` la columna `actions` **siempre existe** (no hay gate a nivel de
columna) — el link "Ver" (`Eye`) siempre está presente; sólo "Modificar" (`Pencil`) y el botón de
toggle (`Power`) están condicionados a `isSuperAdmin`.

1. `isSuperAdmin: false` → sólo el link "Ver" visible.
2. `isSuperAdmin: true` → los 3 elementos visibles; click en el toggle invoca `onToggleState(u)`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 11: Tests de `franchises/_components/FranchiseForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/franchises/_components/FranchiseForm.test.tsx` (crear)

**Interfaces:**
- Consume `FranchiseForm({ mode, initial?, onSubmit? })`.
- Mockear `../fetch` (`getCitiesByDepartment`, `getDepartments`) y `@/lib/alert`.

- [ ] **Step 1: Test de carga de catálogos y preselección de departamento**

Mismo patrón que `AgreementForm` Step 1 (preselección desde `initial.city.department_id`, recarga
de ciudades al cambiar departamento).

- [ ] **Step 2: Test de `canSubmit` — reglas de contraseña por modo**

1. `false` si falta `nit`/`name`/`email`/`user`, `departmentId` o `city_id`.
2. `false` si `movil` está presente y su longitud no es 10.
3. **Modo `create`:** `false` si `password` está vacío, tiene menos de 6 caracteres, o
   `password !== password2`. `true` sólo con ambos iguales y de 6+ caracteres.
4. **Modo `edit`:** con `password` vacío, la regla de contraseña NO aplica (`canSubmit` puede ser
   `true` sin tocar la contraseña). Si se llena `password`, aplican las mismas reglas de longitud
   e igualdad que en `create`.
5. **Modo `view`:** siempre `false`.

- [ ] **Step 3: Test de `submit` — el payload de contraseña es condicional**

1. Modo `create`, todo válido → `onSubmit` recibe el payload con `password: form.password` incluido
   siempre, y `state: 1` fijo (`isCreate ? 1 : Number(form.state)`, ignora lo que tenga `form.state`
   en creación).
2. Modo `edit`, `password` vacío → el payload NO incluye la clave `password` en absoluto.
3. Modo `edit`, `password` con valor válido → el payload SÍ incluye `password`, y `state` usa
   `Number(form.state)` (respeta el valor del formulario, a diferencia de `create`).
4. Si `canSubmit` es `false` al momento de `submit()` → `alert.warn("Faltan datos", "Revisa los
   campos obligatorios (y contraseñas).")`, `onSubmit` NO se llama.

- [ ] **Step 4: Test de visibilidad — campos de contraseña ocultos en `view`**

1. `mode="view"` → los inputs "Contraseña"/"Repetir contraseña" NO se renderizan en absoluto (a
   diferencia de otros campos que sólo se deshabilitan).

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 12: Tests de `franchises/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/franchises/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/franchises/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/franchises/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/franchises/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `FranchisePage`, `NewUserPage`, `ViewFranchisePage`, `EditFranchisePage`.
- Mockear `../fetch`, `@/hooks/useClientTable`, `@/hooks/useOptimisticToggle`,
  `@/context/AuthContext`, `next/navigation`, `@/lib/alert`, `@/components/data-table/DataTable`
  (stub).

- [ ] **Step 1: Test de `page.tsx` — gate `isSuperAdmin` para el botón "Crear Franquicia"**

1. `user.type: 2` → botón no se renderiza.
2. `user.type: 1` → botón visible, `href="/4dnn1n/franchises/new"`.

- [ ] **Step 2: Tests de `new/page.tsx` — gate SIN redirect (mensaje inline)**

**Contexto verificado:** a diferencia de `agreements/new` (que redirige con `router.replace` dentro
de un `useEffect`), esta página verifica el permiso de forma síncrona en el cuerpo del componente y
retorna un mensaje de error inline si falla — no hay redirección.

1. `loading: true` (de `useAuth`) → el componente retorna `null` (nada renderizado).
2. `loading: false, user.type: 2` → muestra el texto "No tienes permisos suficientes para acceder a
   esta vista." (SIN llamar a `router.replace`/`router.push` — confirmar que `router` no se invoca).
3. `loading: false, user.type: 1` → formulario visible.
4. `onSubmit`: `alert.confirm` → `onConfirm` llama `createUser(payload)` → éxito → `alert.success` →
   `router.push("/4dnn1n/franchises")`.

- [ ] **Step 3: Tests de `[id]/page.tsx` (vista) — sin gate**

1. Antes de resolver `getFranchise` → `FormPageSkeleton`.
2. Resuelto → `FranchiseForm` con `mode="view"`.

- [ ] **Step 4: Tests de `[id]/edit/page.tsx` — orden de checks: permiso ANTES que el dato**

**Contexto verificado:** el orden real de los `if` en `EditFranchisePage` es
`authLoading → permiso (mensaje inline) → !user (skeleton)` — es decir, si el usuario no tiene el
rol correcto, el mensaje de error se muestra INMEDIATAMENTE aunque `getFranchise` todavía no haya
resuelto (no espera a que cargue el dato para mostrar el error de permisos).

1. `authLoading: true` → `null`.
2. `authLoading: false, authUser.type: 2`, incluso con `getFranchise` sin resolver aún → mensaje de
   permisos visible de inmediato (NO el skeleton).
3. `authUser.type: 1`, dato sin resolver → `FormPageSkeleton`.
4. `authUser.type: 1`, dato resuelto → formulario con `mode="edit"`.
5. `onSubmit` exitoso → `alert.success`, `router.push("/4dnn1n/franchises")`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint — fin del bloque `franchises`.**

---

## Bloque `doctors` + `specialties`

### Tarea 13: Tests de `doctors/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/doctors/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 5 exports: `getDoctors`, `createDoctor`, `getDoctor`, `updateDoctor`,
  `updateDoctorState`, `deleteDoctor`.

**Contexto verificado:** usa `memCache`/`TTL_LIST`/`TTL_CATALOG` (aunque `TTL_CATALOG` no se usa
realmente en este archivo — sólo se importa; no hace falta testear su uso). Las mutaciones
invalidan DOS prefijos siempre: `"doctors:list:"` **y** `"doctors:specialty:"` — este segundo
prefijo pertenece a la caché de `getDoctorsBySpecialty` en `appointments/fetch.ts` (Fase 1); este
archivo la invalida proactivamente para mantener coherencia cruzada entre módulos.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_LIST: 120000, TTL_CATALOG: 300000,
}));
```

- [ ] **Step 1: Tests de `getDoctors`**

1. Sin params → `/api/doctors?page=1&per_page=20` (los defaults `page=1`/`per_page=20` siempre se
   incluyen en el query, a diferencia de `getAppointments` de la Fase 1 que los omite si no se
   pasan).
2. `{ search: "cardio", stade: "1", department_id: 3, city_id: 7, specialty_id: 2 }` → los 5
   aparecen en el query string (`stade` se traduce a `state=1` en el query, no `stade=1`).
3. Retorna `{ data: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, per_page: 20, total: 0 } }`
   (fallback completo de `meta` si el backend no la envía, no sólo `res.meta`).
4. Clave de caché `` `doctors:list:${query}` `` distinta por combinación de params.

- [ ] **Step 2: Tests de `createDoctor`, `updateDoctor`, `deleteDoctor` — doble invalidación**

1. `createDoctor(data)` → `csrf()` antes, `apiFetch` `POST` a `/api/doctors`, retorna `res.data`,
   luego invalida AMBOS prefijos: `memCache.invalidatePrefix("doctors:list:")` y
   `memCache.invalidatePrefix("doctors:specialty:")`.
2. `getDoctor(5)` → `/api/doctors/5`, sin caché, retorna `res.data`.
3. `updateDoctor(5, data)` → `csrf()` antes, `apiFetch` `PUT` a `/api/doctors/5`, misma doble
   invalidación.
4. `deleteDoctor(5)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/doctors/5`, misma doble
   invalidación, sin retorno de valor útil (`Promise<void>`).

- [ ] **Step 3: Test de `updateDoctorState` — delega en `updateDoctor` (compone, no reimplementa)**

**Contexto verificado:** `updateDoctorState(id, state)` llama `csrf()` y luego `updateDoctor(id, { state })`
directamente (no arma su propia llamada a `apiFetch`) — esto significa que `csrf()` termina
llamándose una vez desde `updateDoctorState` y otra vez desde dentro de `updateDoctor` (dos
invocaciones, ambas resueltas por la misma promesa cacheada de `csrf()` real, pero en el mock cada
llamada cuenta por separado).

1. `updateDoctorState(5, 2)` → `apiFetch` termina llamado con `PUT` a `/api/doctors/5` y body
   `JSON.stringify({ state: 2 })` (el mismo camino que `updateDoctor`), confirmando que no hay una
   ruta HTTP separada para el cambio de estado.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 14: Tests de `doctors/specialties/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/doctors/specialties/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 5 exports: `getSpecialties`, `createSpecialty`, `getSpecialty`, `updateSpecialty`,
  `updateSpecialtyState`, `deleteSpecialty`.

**Contexto verificado:** mismo patrón de mock que la Tarea 13, pero el prefijo invalidado es
`"specialties:"` (uno solo, no dos como en `doctors/fetch.ts`).

- [ ] **Step 1: Tests de `getSpecialties` y `getSpecialty`**

1. `getSpecialties()` → `/api/specialties`, clave de caché `"specialties:all"`, retorna
   `res.data ?? []`.
2. `getSpecialty(3)` → `/api/specialties/3`, sin caché, retorna `res.data`.

- [ ] **Step 2: Tests de `createSpecialty`, `updateSpecialty`, `deleteSpecialty`**

1. `createSpecialty({ name: "Pediatría", state: 1 })` → `csrf()` antes, `apiFetch` `POST` a
   `/api/specialties`, retorna `res.data`, luego `memCache.invalidatePrefix("specialties:")`.
2. `updateSpecialty(3, data)` → `csrf()` antes, `apiFetch` `PUT` a `/api/specialties/3`, misma
   invalidación.
3. `deleteSpecialty(3)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/specialties/3`, misma
   invalidación.

- [ ] **Step 3: Test de `updateSpecialtyState` — mismo patrón de composición que `updateDoctorState`**

1. `updateSpecialtyState(3, 0)` → termina llamando `apiFetch` `PUT` a `/api/specialties/3` con body
   `JSON.stringify({ state: 0 })` (delega en `updateSpecialty(id, { state })`, no ruta HTTP propia).

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 15: Tests de `doctors/_components/columns.tsx` (`buildDoctorColumns` +
`buildSpecialtyDoctorColumns`)

**Files:**
- Test: `tests/app/4dnn1n/doctors/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildDoctorColumns({ onToggleState, hasAccess })` y `buildSpecialtyDoctorColumns()` (sin
  parámetros) — ambos exportados por el mismo archivo.

- [ ] **Step 1: Test de `buildDoctorColumns` — columnas `full_name`, `specialty`, `phones`, `city`**

1. `specialty: { name: "Cardiología" }` → `"Cardiología"`; `specialty: undefined` → `"-"`.
2. `phones` (accessorFn compuesto): con `phone`, `movil` y `email` todos presentes, la celda
   muestra las 3 líneas ("Tel: ...", "Cel: ...", el email); con los 3 vacíos, muestra `"-"`.

- [ ] **Step 2: Test de `buildDoctorColumns` — columna `state` y `actions`**

1. `state: 1` → "Activo"; `state: 2` → "Inactivo".
2. `hasAccess: false` → sin columna `actions`.
3. `hasAccess: true` → Eye/Pencil/Power presentes; click en Power invoca `onToggleState(d)`.

- [ ] **Step 3: Test de `buildSpecialtyDoctorColumns` — SIN columna `state` ni `actions`**

**Contexto verificado:** esta función no recibe parámetros y siempre retorna las mismas 5 columnas
(`full_name`, `secretary_name`, `phones`, `city`, `tarifa`) — a diferencia de `buildDoctorColumns`,
NUNCA incluye una columna de estado ni de acciones, sin importar el rol del usuario (se usa
únicamente en la vista de detalle de una especialidad, de sólo lectura).

1. El array retornado tiene exactamente 5 columnas, ninguna con `id: "actions"` ni `id: "state"`.
2. Columna `tarifa`: `value_agreement: 150000` → celda muestra `"$150.000"`; `value_agreement: 0`
   o `undefined` → `"$0"` (usa `Number(row.original.value_agreement || 0)`).

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 16: Tests de `doctors/specialties/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/doctors/specialties/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildSpecialtyColumns({ onToggleState, hasAccess })` → `ColumnDef<ApiSpecialty>[]`.

- [ ] **Step 1: Test de la columna `name` y `state`**

1. `state: 1` → "Activo"; `state: 0` → "Inactivo" (recordar: especialidades usa `1`/`0`, igual que
   `agreements`, distinto de `doctors`/`counselors`/`franchises` que usan `1`/`2`).

- [ ] **Step 2: Test de la columna `actions`**

1. `hasAccess: false` → sin columna `actions`.
2. `hasAccess: true` → Eye apunta a `/4dnn1n/doctors/specialties/{id}`, Pencil a
   `/4dnn1n/doctors/specialties/{id}/edit`; click en Power invoca `onToggleState(s)`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 17: Tests de `doctors/_components/DoctorForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/doctors/_components/DoctorForm.test.tsx` (crear)

**Interfaces:**
- Consume `DoctorForm({ mode, initial?, onSubmit? })`.
- Mockear `../../counselors/fetch` (`getDepartments`, `getCitiesByDepartment` — este componente
  reutiliza el `fetch.ts` de `counselors` para geografía, NO tiene su propio `getDepartments`) y
  `../specialties/fetch` (`getSpecialties`).

- [ ] **Step 1: Test de carga y filtrado de especialidades**

**Contexto verificado:** el filtro es `s.state === 1 || (currentSpecId && s.id === currentSpecId)`
— muestra las especialidades activas MÁS la especialidad actual del médico aunque esté inactiva
(para no perderla de la vista al editar un médico existente).

1. `getSpecialties` resuelve `[{ id: 1, state: 1 }, { id: 2, state: 0 }]`, `initial.specialty_id`
   ausente → sólo la `id: 1` queda en las opciones.
2. `initial.specialty_id: 2` (la inactiva) → AMBAS quedan en las opciones (la inactiva se conserva
   porque coincide con `currentSpecId`).

- [ ] **Step 2: Test de `canSubmit` — todos los campos son obligatorios en este formulario**

**Contexto verificado:** a diferencia de `CounselorForm`/`FranchiseForm` (donde `phone`/`movil`/
`address` son opcionales), en `DoctorForm` **todos** son obligatorios: `name`, `lastname`,
`specialty_id`, `departmentId`, `city_id`, `phone`, `movil`, `address`, `secretary_name`,
`value_agreement`.

1. `false` si falta cualquiera de los 9 campos anteriores.
2. `false` si `Number(value_agreement) < 10000`.
3. `false` si `movil.length !== 10`.
4. `true` sólo con los 9 campos completos, `value_agreement >= 10000` y `movil` de 10 dígitos.

- [ ] **Step 3: Test de mensajes de error (`valueAgreementError`, `movilError`)**

1. `value_agreement: "5000"` → "El valor debe ser mayor o igual a 10.000".
2. `movil: "30012"` → "El celular debe tener exactamente 10 dígitos".

- [ ] **Step 4: Test de `submit`**

1. Payload: `{ name, lastname, email: email||null, phone, movil, address, secretary_name, value_agreement: Number(...)||0, specialty_id: Number(...), city_id: Number(...), state: Number(state)===2?2:1 }`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 18: Tests de `doctors/specialties/_components/SpecialtyForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/doctors/specialties/_components/SpecialtyForm.test.tsx` (crear)

**Interfaces:**
- Consume `SpecialtyForm({ initial?, onSubmit, loading? })`.
- Mockear `@/lib/alert`.

**Contexto verificado — el formulario más simple de esta fase:** no tiene `mode` prop; usa la
PRESENCIA de `initial` para decidir texto del botón ("Crear Especialidad" vs "Guardar Cambios") y
el `state` inicial (`initial ? initial.state : 1`). Es un `<form onSubmit={...}>` real con
`e.preventDefault()`, a diferencia de todos los demás formularios de esta fase que usan un botón
`type="button"` con `onClick`. No tiene botón "Limpiar".

- [ ] **Step 1: Test de texto del botón según `initial`**

1. Sin `initial` → botón "Crear Especialidad".
2. Con `initial` → botón "Guardar Cambios".

- [ ] **Step 2: Test de `canSubmit` y el submit del `<form>`**

1. `name` vacío o sólo espacios (`"   "`) → `canSubmit: false` (usa `form.name.trim().length > 0`).
2. Disparar el evento `submit` del formulario (`fireEvent.submit`, no click en un botón separado)
   con `name` vacío → `alert.warn("Faltan datos", "El nombre de la especialidad es obligatorio.")`,
   `onSubmit` NO se llama.
3. Con `name: "  Cardiología  "` válido → `onSubmit` recibe `{ name: "Cardiología", state: Number(form.state) }`
   (recortado con `.trim()`).

- [ ] **Step 3: Test del estado `loading`**

1. `loading: true` → el botón muestra el ícono `Loader2` (girando) en vez de `Save`, y está
   deshabilitado junto con el input de nombre.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 19: Tests de `doctors/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/doctors/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `DoctorsPage`, `NewDoctorPage`, `ViewDoctorPage`, `EditDoctorPage`.
- Mockear `./fetch` (o profundidad correspondiente), `../counselors/fetch` (`getDepartments`,
  `getCitiesByDepartment`), `./specialties/fetch` (`getSpecialties`), `@/hooks/useServerTable`,
  `@/hooks/useOptimisticToggle`, `@/context/AuthContext`, `next/navigation`, `@/lib/alert`,
  `@/components/data-table/DataTable` (stub).

- [ ] **Step 1: Test de `page.tsx` — filtros avanzados (departamento/ciudad/especialidad)**

1. Al montar, `getDepartments()` y `getSpecialties()` se llaman; las especialidades mostradas en el
   `<datalist>` sólo incluyen las de `state === 1` (filtradas en la propia página, no en
   `getSpecialties`).
2. Seleccionar un departamento en el `<select>` → dispara `getCitiesByDepartment(id)`; sin
   departamento seleccionado, el `<select>` de ciudad está `disabled`.
3. Escribir en el input de especialidad (con `datalist`) un nombre que coincide EXACTAMENTE
   (case-insensitive) con una especialidad de la lista → `filterSpecialtyId` se fija a ese id, que
   se pasa a `useServerTable` como `extraParams.specialty_id`; un texto que no coincide con ninguna
   → `filterSpecialtyId: ""`.
4. `hasAccess: true` → el botón "Gestionar Especialidades" (link a `/4dnn1n/doctors/specialties`) es
   visible; `hasAccess: false` → no se renderiza.
5. `LoadingOverlay` recibe `isLoading = tableProps.loading && isInitialLoad` (verificar ambas
   condiciones combinadas, no sólo `loading`).

- [ ] **Step 2: Tests de `new/page.tsx` — gate inline (mismo patrón que `franchises/new`)**

1. `authLoading: true` → `null`.
2. `authLoading: false, user.type: 3` → mensaje "No tienes permisos suficientes para acceder a esta
   vista." (type 1 y 2 SÍ tienen acceso — confirmar el `!== 1 && !== 2`, distinto del gate
   `type !== 1` estricto de `franchises`).
3. `handleSubmit`: `try/finally` con `loading` state; llama `createDoctor(data)` → éxito →
   `alert.success` → `router.push("/4dnn1n/doctors")`; falla → `alert.error(...)`.

- [ ] **Step 3: Tests de `[id]/page.tsx` — orden de checks: dato ANTES que permiso**

**Contexto verificado — orden real, distinto al de `franchises/[id]/edit`:**
`loading → skeleton; !initialData → error div; authLoading → null; permiso → error div`. El check
de permisos ocurre DESPUÉS de que el dato termine de cargar (o falle), no antes.

1. `loading: true` → `FormPageSkeleton`.
2. `getDoctor` rechaza → tras `loading` terminar, `initialData` sigue `null` → "No se pudo cargar el
   médico." (este mensaje se muestra ANTES de siquiera evaluar `authLoading`/permisos).
3. Dato cargado, `authLoading: true` → `null`.
4. Dato cargado, `user.type: 3` → mensaje de permisos.
5. Dato cargado, `user.type: 1` → `DoctorForm` con `mode="view"`.

- [ ] **Step 4: Tests de `[id]/edit/page.tsx` — mismo orden que `[id]/page.tsx`, sin manejo de
  `loading` en `handleSubmit`**

1. Mismo orden de checks que el Step 3.
2. `handleSubmit`: llama `updateDoctor(id, data)` directo, SIN estado `loading` propio (a diferencia
   de `new/page.tsx`) — sólo `try/catch` simple; éxito → `alert.success` → `router.push`; falla →
   `alert.error(...)`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 20: Tests de `doctors/specialties/page.tsx`, `new/page.tsx`, `[id]/page.tsx`,
`[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/doctors/specialties/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/specialties/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/specialties/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/doctors/specialties/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `SpecialtiesPage`, `NewSpecialtyPage`, `SpecialtyViewPage`, `EditSpecialtyPage`.
- Mockear `./fetch` (o profundidad correspondiente), `../../fetch` (`getDoctors`, para la vista de
  detalle), `../../_components/columns` (`buildSpecialtyDoctorColumns`, ya testeado en la Tarea 15
  — mockear para aislar), `@/hooks/useClientTable`, `@/hooks/useOptimisticToggle`,
  `@/hooks/useServerTable`, `@/context/AuthContext`, `next/navigation`, `@/lib/alert`,
  `@/components/data-table/DataTable` (stub).

- [ ] **Step 1: Test de `page.tsx` — loading sin `LoadingOverlay`**

**Contexto verificado:** esta página NO usa el componente `LoadingOverlay` (a diferencia de todas
las demás páginas de listado de esta fase) — mientras `loading` es `true`, retorna directamente
`<div className="p-6">Cargando especialidades...</div>` en vez del contenido con overlay.

1. `loading: true` → el texto "Cargando especialidades..." es lo único renderizado (sin
   `DataTable`).
2. `loading: false` → `DataTable` visible; el link "Volver a Médicos" siempre está presente
   independientemente de `hasAccess`.
3. `hasAccess: true` → botón "Crear Especialidad" visible.

- [ ] **Step 2: Tests de `new/page.tsx` — mismo gate inline `type !== 1 && !== 2` que `doctors/new`**

1. Igual patrón que la Tarea 19 Step 2 (mensaje inline, sin redirect).
2. `handleSubmit` con `loading` state try/finally, llama `createSpecialty(data)`.

- [ ] **Step 3: Tests de `[id]/page.tsx` (`SpecialtyViewPage`) — orden distinto: skeleton depende
  SÓLO del dato, permiso se evalúa después**

**Contexto verificado:** el orden es `!specialty → skeleton propio (no FormPageSkeleton); !hasAccess → mensaje de permisos`. Esta página además monta un `useServerTable(getDoctors, { defaultStade: "1", extraParams: { specialty_id } })` para mostrar los médicos de esa especialidad, usando
`buildSpecialtyDoctorColumns()` (sin `actions` ni `state`, confirmado en la Tarea 15).

1. `getSpecialty` sin resolver → skeleton (verificar por las clases `animate-pulse`, ya que no usa
   `FormPageSkeleton`).
2. Resuelto, `hasAccess: false` (`user.type: 3`) → "No tienes permisos para acceder a esta página."
3. Resuelto, `hasAccess: true` → título `"DATOS DE LA ESPECIALIZACIÓN"`, descripción con el nombre
   de la especialidad, y la tabla de médicos usa `enableStateFilter={false}` (sin filtro de estado
   en esta vista anidada).

- [ ] **Step 4: Tests de `[id]/edit/page.tsx` — gate SIN `authLoading`**

**Contexto verificado:** a diferencia de `doctors/[id]/edit`, esta página calcula `hasAccess`
directamente desde `useAuth()` sin esperar ningún estado de `authLoading` — el orden es
`loading → FormPageSkeleton(fields=2); !initialData → error div; !hasAccess → error div`.

1. `loading: true` → `FormPageSkeleton` con `fields={2}` (confirmar el número exacto, distinto del
   `fields={10}` de `doctors`).
2. Dato cargado, `hasAccess: false` → "No tienes permisos para acceder a esta página."
3. `handleSubmit` con `saving` state try/finally, llama `updateSpecialty(id, data)`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint — fin del bloque `doctors` + `specialties`.**

---

## Bloque `membership-forms`

### Tarea 21: Tests de `membership-forms/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/membership-forms/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 4 exports: `getMembershipForms`, `getMembershipForm`, `deleteMembershipForm`,
  `markMembershipFormConverted`.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_LIST: 120000,
}));
```

- [ ] **Step 1: Tests de `getMembershipForms` — el parámetro `stade` declarado pero sin efecto**

**Hallazgo verificado, no es un bug a corregir en este plan:** el tipo de parámetros acepta `stade?: string`, pero la función nunca lo lee al construir el query string — sólo usa `search`,
`page`, `per_page`. Escribir un test que confirme esto explícitamente (para que quede documentado
como comportamiento real, no un olvido de quien lea el código después).

1. Sin params → `apiFetch` llamado con `/api/membership-forms` (sin `?`).
2. `{ search: "juan", page: 2, per_page: 10 }` → `/api/membership-forms?search=juan&page=2&per_page=10`.
3. `{ stade: "1" }` (sin otros params) → `apiFetch` llamado con `/api/membership-forms` **sin
   ningún query string** — idéntico al caso sin params, confirmando que `stade` no afecta la URL.
4. Retorna `{ data: res.data ?? [], meta: res.meta }`.
5. Clave de caché `` `membership-forms:list:${query}` `` (con `query` incluyendo el `?` cuando hay
   params, string vacío cuando no hay).

- [ ] **Step 2: Tests de `getMembershipForm`, `deleteMembershipForm`, `markMembershipFormConverted`**

1. `getMembershipForm(5)` → `/api/membership-forms/5`, sin caché, retorna `res.data`.
2. `deleteMembershipForm(5)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/membership-forms/5`, luego
   `memCache.invalidatePrefix("membership-forms:list:")`.
3. `markMembershipFormConverted(5)` → `csrf()` antes, `apiFetch` `PATCH` a
   `/api/membership-forms/5/convert`, misma invalidación de caché.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 22: Tests de `membership-forms/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/membership-forms/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildMembershipFormColumns({ onDelete })` → `ColumnDef<ApiMembershipForm>[]`.

- [ ] **Step 1: Test de las columnas `full_name`, `phone`, `city`, `seller`, `date`**

1. `date: "2026-03-05"` → celda muestra `"05/03/2026"` (split manual sobre el string `"YYYY-MM-DD"`,
   sin usar `Date`/`Intl`).
2. `date: ""` o ausente → celda muestra `"-"`.

- [ ] **Step 2: Test de la columna `actions` — sin gate (siempre visible)**

**Contexto verificado:** a diferencia de todas las columnas `actions` anteriores, esta NO recibe
ningún flag de permisos (`hasAccess`/`canManage`) — siempre incluye ambos botones para cualquier
usuario que vea la tabla.

1. El link `UserPlus` ("Crear afiliado") apunta a `` `/4dnn1n/affiliates/new?from=${form.id}` ``.
2. Click en el botón `Trash2` invoca `onDelete(form)` con la solicitud de la fila.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 23: Tests de `membership-forms/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/membership-forms/page.test.tsx` (crear)

**Interfaces:**
- Consume `MembershipFormsPage` (default export). Este módulo NO tiene `new/page.tsx` ni
  `[id]/page.tsx` — sólo el listado.
- Mockear `./fetch` (`getMembershipForms`, `deleteMembershipForm`), `@/hooks/useServerTable`,
  `@/lib/alert`, `@/components/data-table/DataTable` (stub).

**Contexto verificado:** esta página no verifica `useAuth` en absoluto — no hay gate de permisos.
`useServerTable` se invoca con `{ defaultStade: "all" }`, y el `DataTable` recibe
`enableStateFilter={false}` y `hideSearch` (sin UI de filtro/búsqueda, consistente con el hallazgo
de la Tarea 21 de que `stade`/`search` no se usan realmente para este listado del lado del backend
tampoco vía esta página — aunque `search` sí se soporta en `fetch.ts`, esta página simplemente no
expone la UI para usarlo).

- [ ] **Step 1: Test de `onDelete` — actualización optimista y reversión en error**

1. Confirmar (`alert.confirm` con `onConfirm` ejecutándose) → dentro de `onConfirm`: `setData` filtra
   la solicitud eliminada y `setMeta` decrementa `total` en 1, ANTES de que
   `deleteMembershipForm` resuelva (orden: `setData`/`setMeta` síncronos, luego `await
   deleteMembershipForm(form.id)`).
2. Éxito → `alert.success("Eliminado", "Solicitud eliminada correctamente.")`.
3. `deleteMembershipForm` rechaza → el `catch` externo llama `setData(prev => [...prev, form])` (la
   solicitud eliminada se re-agrega al FINAL de la lista, no se restaura su posición original) y
   `alert.error(...)` con `getApiErrorMessage(err)`.
4. Cancelar la confirmación (`alert.confirm` resuelve `false` sin invocar `onConfirm`) →
   `deleteMembershipForm` NO se llama, `setData`/`setMeta` no se llaman.

- [ ] **Step 2: Correr tests y tsc**

- [ ] **Step 3: Commit**

**Checkpoint — fin del bloque `membership-forms`.**

---

## Bloque `contacts`

### Tarea 24: Tests de `contacts/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/contacts/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 3 exports: `getContacts`, `getContact`, `deleteContact`.

**Contexto verificado (confirmar contra el código real, no asumir del backend):** este `fetch.ts`
admin **no tiene** el mapeo `movil→phone`/`asunto→subject`/`mensaje→comment` documentado para el
endpoint público de contacto (`POST /api/public/contact`) — ese mapeo es exclusivo del formulario
público del sitio web (`src/app/web/contactenos/page.tsx`, fuera de esta fase). Este archivo sólo
lista/ve/borra contactos ya existentes usando los nombres de columna reales (`phone`, `subject`,
`comment`) directamente, sin ningún mapeo de campos.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_LIST: 120000,
}));
```

- [ ] **Step 1: Tests de `getContacts`**

1. Sin params → `/api/contacts` (sin `?`).
2. `{ search: "ana", page: 1, per_page: 20 }` → `/api/contacts?search=ana&page=1&per_page=20` (SIN
   parámetro `stade`/`state` — el tipo de params de esta función no lo declara siquiera, a
   diferencia de `getMembershipForms`).
3. Retorna `{ data: res.data ?? [], meta: res.meta }`.
4. Clave de caché `` `contacts:list:${query}` ``.

- [ ] **Step 2: Tests de `getContact` y `deleteContact`**

1. `getContact(5)` → `/api/contacts/5`, sin caché, retorna `res.data`.
2. `deleteContact(5)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/contacts/5`, luego
   `memCache.invalidatePrefix("contacts:list:")`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 25: Tests de `contacts/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/contacts/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildContactColumns({ onDelete })` → `ColumnDef<ApiContact>[]`.

- [ ] **Step 1: Test de la columna `comment` — truncado a 80 caracteres**

1. `comment` con 90 caracteres → celda muestra los primeros 80 seguidos de `"…"`.
2. `comment` con 50 caracteres → se muestra completo, sin `"…"`.

- [ ] **Step 2: Test de la columna `created_at` — formateo vía `Date`, no split de string**

**Contexto verificado:** a diferencia de `membership-forms` (que hace `split("-")` manual sobre un
string `"YYYY-MM-DD"`), esta columna construye un objeto `Date` real a partir de `created_at`
(un ISO string con hora) y extrae día/mes/año con `getDate()`/`getMonth()`/`getFullYear()`.

1. `created_at: "2026-03-05T14:30:00.000Z"` → celda muestra `"05/03/2026"` (usar el mismo objeto
   `Date` en la aserción del test, no un string literal, para no depender de zona horaria del
   entorno de test — comparar contra `` `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}` `` construido con el mismo `new Date(...)`).
2. `created_at` ausente/falsy → `"-"`.

- [ ] **Step 3: Test de la columna `actions` — sin gate, igual que `membership-forms`**

1. Link `Eye` apunta a `` `/4dnn1n/contacts/${contact.id}` ``.
2. Click en `Trash2` invoca `onDelete(contact)`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 26: Tests de `contacts/page.tsx` y `[id]/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/contacts/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/contacts/[id]/page.test.tsx` (crear)

**Interfaces:**
- Consume `ContactsPage`, `ViewContactPage`.
- Mockear `./fetch` (o `../fetch`), `@/hooks/useServerTable`, `next/navigation`, `@/lib/alert`,
  `@/components/data-table/DataTable` (stub).

- [ ] **Step 1: Test de `page.tsx` — `useServerTable` sin opciones**

**Contexto verificado:** a diferencia de `membership-forms/page.tsx` (que pasa
`{ defaultStade: "all" }`), esta página invoca `useServerTable(getContacts)` sin segundo argumento —
por defecto internamente cae en `defaultStade: "1"`, pero como `enableStateFilter={false}` en el
`DataTable`, el filtro de estado nunca se expone en la UI (mismo efecto visual que
`membership-forms`, distinta configuración de origen — confirmar que la llamada al hook NO incluye
un segundo argumento).

1. `onDelete`: mismo patrón optimista que `membership-forms` Step 1 (filtrar de `setData`,
   decrementar `setMeta`, revertir con `setData(prev => [...prev, contact])` en error).

- [ ] **Step 2: Test de `[id]/page.tsx` — `formatDate` local (duplicado del de `columns.tsx`)**

1. Mientras `loading` → skeleton con clases `animate-pulse` (propio de este archivo, no
   `FormPageSkeleton`).
2. `getContact` resuelve → los 6 `Field` (Nombre, Correo, Teléfono, Ciudad, Asunto, Fecha de envío)
   muestran los valores de `data`; `city: null` → el campo Ciudad muestra `"-"`.
3. `getContact` rechaza → `alert.error(...)`; tras terminar `loading`, `data` sigue `null` →
   "No se pudo cargar el mensaje o no existe."
4. Click en "Eliminar mensaje" → `alert.confirm` → `onConfirm` llama `deleteContact(data.id)`
   directamente (SIN actualización optimista de una lista, ya que esta vista no maneja un array) →
   éxito → `alert.success` → `router.push("/4dnn1n/contacts")`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint — fin del bloque `contacts`.**

---

## Bloque `content` (hub + allies + specialists)

### Tarea 27: Tests de `content/page.tsx` (hub)

**Files:**
- Test: `tests/app/4dnn1n/content/page.test.tsx` (crear)

**Interfaces:**
- Consume `ContentPage` (default export).
- Mockear `@/context/AuthContext`, `next/navigation`.

**Por qué SÍ se testea (a diferencia de `counselors/layout.tsx`/`franchises/layout.tsx`):** aunque
es la página "hub" de sólo navegación entre `allies`/`specialists`, tiene lógica propia real — un
gate de permisos con `useEffect` + `router.replace` condicionado a `user.type !== 1`, igual de real
que el de `agreements/new`. No es un wrapper presentacional puro.

- [ ] **Step 1: Test del gate de permisos**

1. `user.type: 2` → el componente retorna `null`; el `useEffect` llama
   `router.replace("/4dnn1n/home")`.
2. `user.type: 1` → renderiza el título "Administración de Contenido" y los 2 links (`href`
   `/4dnn1n/content/allies` y `/4dnn1n/content/specialists`), cada uno con su copy de límite
   ("Máximo 6"/"Máximo 4" — texto puramente informativo, la validación real vive en
   `allies/page.tsx`/`specialists/page.tsx`, testeada en sus propias tareas).
3. `user: null` (aún no resuelto) → también retorna `null`, sin llamar `router.replace` todavía (el
   `useEffect` sólo actúa cuando `user` es truthy).

- [ ] **Step 2: Correr tests y tsc**

- [ ] **Step 3: Commit**

**Checkpoint.**

---

### Tarea 28: Tests de `content/allies/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/content/allies/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 5 exports: `getAllies`, `createAlly`, `updateAlly`, `deleteAlly`, `reorderAllies`.

**Contexto verificado:** usar el patrón de mock de FormData de Global Constraints
(`@/lib/api` con `getXsrfToken` incluido, `@/lib/memCache`, y `vi.stubGlobal("fetch", fetchMock)`).
`reorderAllies` está exportado pero no se invoca desde ninguna página de este módulo (`allies/page.tsx`
no tiene UI de reordenamiento) — es código sin consumidor actual; documentar este hallazgo en el
reporte de la tarea, pero SÍ testearlo igual (es código de producción real y exportado, con
comportamiento propio).

- [ ] **Step 1: Test de `getAllies` — usa `apiFetch` normal**

1. `apiFetch` llamado con `/api/content-allies`, clave de caché `"content-allies:all"`, retorna
   `res.data ?? []`.

- [ ] **Step 2: Test de `createAlly` — pasa por `fetch()` global, no por `apiFetch`**

1. `fetchMock` resuelve `{ ok: true, json: async () => ({ message: "ok", data: { id: 1, image: "x.jpg", image_filename: "x.jpg", url: "https://a.com", position: 1 } }) }`
   (construir el mock como `{ ok: true, json: vi.fn().mockResolvedValue({...}) }`) → `createAlly(formData)`
   llama `csrf()` primero, luego `fetch("http://localhost:8000/api/content-allies", { method: "POST", credentials: "include", body: formData, headers: { Accept: "application/json", "X-XSRF-TOKEN": "test-xsrf-token" } })`,
   retorna `res.data` (el objeto `ApiAlly`), y llama `memCache.invalidatePrefix("content-allies:")`.
   `apiFetch` (el mock del helper normal) NUNCA se llama en este flujo.
2. `fetchMock` resuelve `{ ok: false, status: 422, json: async () => ({ message: "La imagen es obligatoria" }) }`
   → `createAlly` rechaza con un `Error` cuyo `.message` es `"La imagen es obligatoria"`.
3. `fetchMock` resuelve `{ ok: false, status: 500, json: async () => ({}) }` (sin `message` en el
   body) → el error usa el fallback `` `Error ${res.status}` `` → `.message === "Error 500"`.

- [ ] **Step 3: Test de `updateAlly` — agrega `_method: PUT` al FormData**

1. `updateAlly(3, formData)` → antes de llamar a `fetch`, el `formData` recibe
   `formData.append("_method", "PUT")` (verificar con `formData.get("_method") === "PUT"` sobre el
   objeto pasado, o inspeccionando la llamada real a `fetchMock` con `.mock.calls[0][1].body`); la
   petición real sigue siendo `POST` a `/api/content-allies/3` (Laravel resuelve el método real via
   el campo `_method`, patrón de spoofing estándar). Invalida `"content-allies:"`.

- [ ] **Step 4: Test de `deleteAlly` y `reorderAllies` — usan `apiFetch` normal**

1. `deleteAlly(3)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/content-allies/3`, invalida
   `"content-allies:"`.
2. `reorderAllies([{ id: 1, position: 2 }, { id: 2, position: 1 }])` → `csrf()` antes, `apiFetch`
   `PUT` a `/api/content-allies/reorder` con body `JSON.stringify({ items: [...] })`, invalida
   `"content-allies:"`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 29: Tests de `content/allies/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/allies/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildAllyColumns({ onDelete })` → `ColumnDef<ApiAlly>[]`.

- [ ] **Step 1: Test de las columnas `position`, `image`, `url`**

1. Columna `image`: `src` del `<img>` es `` `http://localhost:8000/storage/${ally.image}` ``.
2. Columna `url`: el `<a>` tiene `target="_blank"`, `rel="noopener noreferrer"`, y muestra
   `ally.url` como texto.

- [ ] **Step 2: Test de la columna `actions`**

1. Link `Pencil` apunta a `` `/4dnn1n/content/allies/${ally.id}/edit` ``.
2. Click en `Trash2` invoca `onDelete(ally)`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 30: Tests de `content/allies/_components/AllyForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/allies/_components/AllyForm.test.tsx` (crear)

**Interfaces:**
- Consume `AllyForm({ mode, initial?, onSubmit })` — este componente sólo tiene modos `"create"` y
  `"edit"`, NO `"view"` (a diferencia de todos los formularios anteriores de esta fase).

- [ ] **Step 1: Test de `canSubmit` — la imagen es obligatoria SÓLO en `create`**

1. `mode="create"`, sin `url` → `false`.
2. `mode="create"`, `url` presente pero SIN archivo de imagen seleccionado → `false`.
3. `mode="create"`, `url` + imagen seleccionada + `position: "1"` → `true`.
4. `mode="edit"`, `url` + `position` válidos pero SIN nueva imagen seleccionada → `true` (en edición
   la imagen es opcional — se conserva la actual si no se sube una nueva).
5. `position: "0"` o vacío → `false` en cualquier modo (`Number(position) < 1`).

- [ ] **Step 2: Test de selección de imagen y preview**

1. Sin archivo seleccionado y `mode="edit"` con `initial.image: "banner.jpg"` → el preview inicial
   es `` `http://localhost:8000/storage/banner.jpg` ``.
2. Seleccionar un archivo (`fireEvent.change` en el input `type="file"` con un `File` de prueba) →
   el preview cambia a una URL `blob:` (usar `vi.spyOn(URL, "createObjectURL")` para no depender de
   la implementación real de jsdom).

- [ ] **Step 3: Test de `submit` — payload como `FormData`, no JSON**

1. Con imagen seleccionada, `url: "https://empresa.com"`, `position: "2"` → `onSubmit` recibe un
   `FormData` con `image` (el `File`), `url`, `position` — verificar con
   `formData.get("url") === "https://empresa.com"` etc. sobre el argumento capturado.
2. En modo `edit` sin nueva imagen → el `FormData` NO incluye la clave `image` en absoluto.

- [ ] **Step 4: Test de `clear`**

1. Resetea `url`, `position` a `"1"`, `imageFile`/`previewSrc` a `null`, y limpia el `value` del
   input de archivo.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 31: Tests de `content/allies/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/allies/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/content/allies/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/content/allies/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `AlliesPage`, `NewAllyPage`, `EditAllyPage`. **No existe** `[id]/page.tsx` (sin vista de
  sólo lectura para aliados — confirmado en el inventario de archivos).
- Mockear `../fetch` (o `../../fetch`), `@/hooks/useClientTable`, `@/context/AuthContext`,
  `next/navigation`, `@/lib/alert`, `@/components/data-table/DataTable` (stub),
  `../_components/AllyForm` (o `../../_components/AllyForm`) con un stub simple (ya testeado en la
  Tarea 30).

- [ ] **Step 1: Test de `page.tsx` — el límite de 6 aliados (`atLimit`)**

1. `data.length: 5` → botón "Agregar aliado" habilitado, como `<Link>`.
2. `data.length: 6` → botón deshabilitado (`disabled`, con `title="Límite de 6 aliados alcanzado"`),
   YA NO es un link (no navega a `/new`).
3. `onDelete`: mismo patrón optimista de las tareas anteriores (`setData` filtra antes de
   `deleteAlly`, revierte agregando al final en error).

- [ ] **Step 2: Tests de `new/page.tsx` — gate por `useEffect` + redirect a `/4dnn1n/content`**

1. `user.type: 2` → `null`, `router.replace("/4dnn1n/content")`.
2. `onSubmit(formData)`: `alert.confirm` → `onConfirm` llama `createAlly(formData)` → éxito →
   `alert.success` → `router.push("/4dnn1n/content/allies")`.

- [ ] **Step 3: Tests de `[id]/edit/page.tsx` — resuelve el aliado buscando en la LISTA completa**

**Contexto verificado:** no existe un `getAlly(id)` individual — esta página llama `getAllies()` (la
función de LISTADO completo) y busca el elemento por id con `.find()`. Si no lo encuentra, redirige
a `/4dnn1n/content/allies`.

1. `getAllies()` resuelve una lista que NO incluye el `id` de la URL → `router.replace("/4dnn1n/content/allies")`,
   el componente retorna `null` (no muestra el formulario).
2. `getAllies()` resuelve una lista que SÍ incluye el `id` → `AllyForm` se renderiza con
   `mode="edit"`, `initial` igual al elemento encontrado.
3. `user.type: 2` → gate de permisos análogo al de `new/page.tsx` (redirect a `/4dnn1n/content`).
4. `onSubmit(formData)` → `updateAlly(ally.id, formData)` → éxito → `alert.success` → `router.push("/4dnn1n/content/allies")`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint — fin de la parte `allies`.**

---

### Tarea 32: Tests de `content/specialists/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/content/specialists/fetch.test.ts` (crear)

**Interfaces:**
- Consume los 5 exports: `getSpecialists`, `createSpecialist`, `updateSpecialist`,
  `deleteSpecialist`, `reorderSpecialists`.

**Contexto verificado:** estructuralmente idéntico a `content/allies/fetch.ts` (Tarea 28) — mismo
patrón `apiFetchFormData` para create/update, mismo `apiFetch` normal para listar/borrar/reordenar,
mismo hallazgo de `reorderSpecialists` sin consumidor en ninguna página. Prefijo de caché
`"content-specialists:"` en vez de `"content-allies:"`.

- [ ] **Step 1: Test de `getSpecialists`**

1. `/api/content-specialists`, clave de caché `"content-specialists:all"`, retorna `res.data ?? []`.

- [ ] **Step 2: Test de `createSpecialist` y `updateSpecialist`**

1. `createSpecialist(formData)` → `csrf()` antes, `fetch("http://localhost:8000/api/content-specialists", { method: "POST", ... })`
   con el mismo header `X-XSRF-TOKEN`, retorna `res.data`, invalida `"content-specialists:"`.
2. `updateSpecialist(3, formData)` → agrega `_method: "PUT"` al `formData`, `POST` a
   `/api/content-specialists/3`, invalida `"content-specialists:"`.
3. Response `{ ok: false, status: 422, json: async () => ({ message: "La foto es obligatoria" }) }`
   → rechaza con `Error("La foto es obligatoria")`.

- [ ] **Step 3: Test de `deleteSpecialist` y `reorderSpecialists`**

1. `deleteSpecialist(3)` → `csrf()` antes, `apiFetch` `DELETE` a `/api/content-specialists/3`,
   invalida `"content-specialists:"`.
2. `reorderSpecialists([{ id: 1, position: 1 }])` → `csrf()` antes, `apiFetch` `PUT` a
   `/api/content-specialists/reorder` con body `JSON.stringify({ items: [...] })`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 33: Tests de `content/specialists/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/specialists/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume `buildSpecialistColumns({ onDelete })` → `ColumnDef<ApiSpecialist>[]`.

- [ ] **Step 1: Test de las columnas `position`, `photo`, `name`, `specialty`**

1. Columna `photo`: `src` del `<img>` es `` `http://localhost:8000/storage/${specialist.photo}` ``,
   `alt` es `specialist.name`.

- [ ] **Step 2: Test de la columna `actions`**

1. Link `Pencil` apunta a `` `/4dnn1n/content/specialists/${specialist.id}/edit` ``.
2. Click en `Trash2` invoca `onDelete(specialist)`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 34: Tests de `content/specialists/_components/SpecialistForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/specialists/_components/SpecialistForm.test.tsx` (crear)

**Interfaces:**
- Consume `SpecialistForm({ mode, initial?, onSubmit })` — mismos 2 modos que `AllyForm`
  (`"create"`/`"edit"`, sin `"view"`).

- [ ] **Step 1: Test de `canSubmit`**

1. `false` si falta `name`, `specialty`, o `position < 1`.
2. `mode="create"` sin foto seleccionada → `false`; con foto → `true` (si el resto es válido).
3. `mode="edit"` sin nueva foto → `true` (si el resto es válido; conserva la foto existente).

- [ ] **Step 2: Test de `submit` — payload `FormData`**

1. Con foto, `name: "Dr. Pérez"`, `specialty: "Cardiología"`, `position: "1"` → `onSubmit` recibe un
   `FormData` con `photo`, `name`, `specialty`, `position`.
2. En modo `edit` sin nueva foto → el `FormData` NO incluye `photo`.

- [ ] **Step 3: Test de `clear`**

1. Resetea `name`, `specialty` a `""`, `position` a `"1"`, `photoFile`/`previewSrc` a `null`, limpia
   el input de archivo.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 35: Tests de `content/specialists/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/content/specialists/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/content/specialists/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/content/specialists/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume `SpecialistsPage`, `NewSpecialistPage`, `EditSpecialistPage`. **No existe** `[id]/page.tsx`
  (mismo caso que `allies` — sin vista de sólo lectura).
- Mockear `../fetch` (o `../../fetch`), `@/hooks/useClientTable`, `@/context/AuthContext`,
  `next/navigation`, `@/lib/alert`, `@/components/data-table/DataTable` (stub),
  `../_components/SpecialistForm` (stub, ya testeado en la Tarea 34).

- [ ] **Step 1: Test de `page.tsx` — el límite de 4 especialistas**

1. `data.length: 3` → botón habilitado (link a `/new`).
2. `data.length: 4` → botón deshabilitado con `title="Límite de 4 especialistas alcanzado"`.
3. `onDelete`: mismo patrón optimista.

- [ ] **Step 2: Tests de `new/page.tsx` — mismo gate que `allies/new`**

1. `user.type: 2` → `null`, `router.replace("/4dnn1n/content")`.
2. `onSubmit(formData)` → `createSpecialist(formData)` → éxito → `router.push("/4dnn1n/content/specialists")`.

- [ ] **Step 3: Tests de `[id]/edit/page.tsx` — resuelve buscando en `getSpecialists()` completo**

1. Mismo patrón que `allies/[id]/edit` (Tarea 31 Step 3): busca por id en la lista completa; si no
   se encuentra, redirige a `/4dnn1n/content/specialists`.
2. `onSubmit(formData)` → `updateSpecialist(specialist.id, formData)` → éxito → `router.push("/4dnn1n/content/specialists")`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint final de la Fase 2.**

---

## Verificación final de la Fase 2

- [ ] Suite completa (`npm run test`) en verde.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run test:coverage`: anotar el % real alcanzado para los 7 módulos de esta fase
  (`agreements`, `counselors`, `franchises`, `doctors`+`specialties`, `membership-forms`, `contacts`,
  `content`), acercándose al 85–90% mínimo aceptable de `dev-standards` en estos módulos.
- [ ] Confirmar que `counselors/layout.tsx` y `franchises/layout.tsx` siguen sin archivo de test
  (decisión documentada en las Tareas 6 y 10, no un olvido).
- [ ] Revisar el diff completo antes de decidir cómo integrar esta fase — el usuario decide cuándo y
  cómo mergear/pushear.

**No se sube el umbral de cobertura global en `vitest.config.ts` en esta fase** — eso se decide en
la Fase 4 (última), con el número final de las 4 fases combinadas, según el spec.
