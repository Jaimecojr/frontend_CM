# Cobertura de Tests — Fase 1 (affiliates + appointments) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tests a los ~17 archivos sin cobertura de los módulos `affiliates` y `appointments`
(los dos módulos de mayor complejidad de negocio del panel admin), siguiendo la metodología ya
validada en el plan `2026-08-25-retrofit-dev-standards-frontend` y documentada en el spec de esta
iniciativa.

**Architecture:** 11 tareas independientes, agrupadas por archivo/componente dentro de cada módulo.
`fetch.ts` primero en cada módulo (capa de aplicación, sin dependencias de UI), luego `columns.tsx`
(funciones puras de definición de columnas), luego componentes de nota/modal, luego los formularios
(la lógica más compleja), y por último las páginas contenedoras (`page.tsx`, `new/page.tsx`,
`[id]/page.tsx`, `[id]/edit/page.tsx`), que mockean todo lo anterior para aislar su propia lógica de
permisos/wiring. `types.ts` de ambos módulos NO se testea (tipos puros, sin comportamiento en
runtime) y `useAffiliateFormState.ts` ya tiene test propio (`tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`,
7 casos) — no se retoca en este plan.

**Tech Stack:** Vitest + Testing Library (`@testing-library/react`), ya configurado. Carpeta espejo
`tests/`.

**Spec:** `docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`

## Global Constraints

- **Ubicación:** carpeta espejo `tests/`, misma ruta que el archivo de origen (ej.
  `tests/app/4dnn1n/affiliates/fetch.test.ts`).
- **Comentarios en inglés**, sin referenciar documentos internos por nombre. `describe()`/`it()` en
  **español**, patrón AAA.
- **Mocks tipados**, nunca `any` salvo en el propio cast del mock (`(alert.confirm as any).mockImplementation(...)`,
  patrón ya establecido en `tests/hooks/useOptimisticToggle.test.ts` — reutilizar tal cual, no
  reinventar).
- **Patrón de mock para `@/lib/alert`** (ya usado en `useOptimisticToggle.test.ts`):
  ```ts
  vi.mock("@/lib/alert", () => ({
    alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  }));
  // En el test que ejercita una confirmación:
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
  ```
  Para el caso de cancelación, usar `mockResolvedValue(false)` sin invocar `onConfirm`.
- **Patrón de mock para `@/context/AuthContext`** (ya usado en `tests/hooks/useRequireAuth.test.ts`):
  ```ts
  vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
  (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 }, loading: false, isLoggingOut: false });
  ```
- **Patrón de mock para `next/navigation`:** `vi.mock("next/navigation", () => ({ useRouter: vi.fn(), useParams: vi.fn(), useSearchParams: vi.fn() }))`, cada uno devuelto por `mockReturnValue` según lo que la página use.
- **Mockear siempre el módulo `fetch.ts` completo** en tests de páginas/formularios (`vi.mock("../fetch")` o la ruta relativa correcta) — nunca dejar pasar una llamada real a `apiFetch`.
- **`DataTable` se mockea en los tests de `page.tsx`** con un stub mínimo que renderiza los datos
  recibidos como texto plano y expone las props relevantes para aserciones (ej.
  `vi.mock("@/components/data-table/DataTable", () => ({ DataTable: (props: any) => <div data-testid="data-table" data-props={JSON.stringify({ total: props.data?.length })} /> })` — ajustar
  según lo que cada test necesite verificar). **Por qué:** `DataTable` es un componente compartido
  que se testea en la Fase 4 de esta iniciativa; mockearlo aquí aísla la lógica que SÍ es
  responsabilidad de esta fase (permisos, construcción de filtros, wiring de callbacks) sin
  acoplar cada test de página al comportamiento interno de la tabla.
- `npm run test` y `npx tsc --noEmit` limpios después de cada tarea.
- Commits por tarea en la rama de esta fase (mismo criterio que el plan anterior: cada tarea es su
  propio checkpoint).

---

### Tarea 1: Tests de `affiliates/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/fetch.test.ts` (crear)

**Interfaces:**
- Consume: los 17 exports de `src/app/4dnn1n/affiliates/fetch.ts` (`getAffiliates`, `getAffiliate`,
  `updateAffiliateState`, `getDepartments`, `getCitiesByDepartment`, `getActiveFranchises`,
  `getActiveCounselors`, `getActiveAgreements`, `checkAffiliateIdCard`, `createAffiliate`,
  `updateAffiliate`, `createRenovation`, `getExpiringToday`, `getAffiliateNotes`,
  `createAffiliateNote`, `deleteAffiliateNote`, `sendCarnet`, `markMembershipFormConverted`).

**Contexto verificado:** el archivo importa `apiFetch`/`csrf` de `@/lib/api` y
`memCache`/`TTL_GEO`/`TTL_CATALOG`/`TTL_LIST` de `@/lib/memCache`. Ambos módulos ya tienen test
propio (`tests/lib/api.test.ts`, `tests/lib/memCache.test.ts`) — mockearlos aquí, no re-testear su
lógica interna.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_GEO: 1800000, TTL_CATALOG: 300000, TTL_LIST: 120000,
}));
```
Con `memCache.get` delegando directo a `fn()`, cada test de una función cacheada verifica que
`apiFetch` se llamó con la URL correcta, sin necesitar probar el cacheo en sí (eso ya lo cubre
`memCache.test.ts`).

- [ ] **Step 1: Tests de `getAffiliates`**

Casos:
1. Sin params → `apiFetch` llamado con `/api/affiliates` (sin query string).
2. `{ stade: "1", search: "juan", page: 2, per_page: 10 }` → `apiFetch` llamado con
   `/api/affiliates?stade=1&search=juan&page=2&per_page=10`.
3. `{ stade: "all" }` → el query string NO incluye `stade` (la función lo omite explícitamente
   cuando vale `"all"`).
4. `apiFetch` resuelve `{ message, data: [...], meta: {...} }` → la función retorna
   `{ data, meta }` (sin `message`).
5. `apiFetch` resuelve `{ data: undefined }` → la función retorna `{ data: [] }` (el `?? []`).
6. Verificar que `memCache.get` fue llamado con la clave `affiliates:list:${query}` correspondiente
   a cada combinación de params (para confirmar que params distintos generan claves distintas).

- [ ] **Step 2: Tests de `getAffiliate` y `updateAffiliateState`**

- `getAffiliate(5)` → `apiFetch` llamado con `/api/affiliates/5`, retorna `res.data`.
- `updateAffiliateState(5, 2)` → llama `csrf()` antes, `apiFetch` con método `PATCH`, body
  `JSON.stringify({ stade: 2 })`, y `memCache.invalidatePrefix("affiliates:list:")`.

- [ ] **Step 3: Tests de los catálogos (`getDepartments`, `getCitiesByDepartment`,
  `getActiveFranchises`, `getActiveCounselors`, `getActiveAgreements`)**

Para cada uno: `apiFetch` llamado con la URL exacta (`/api/departments`,
`/api/departments/7/cities`, `/api/users/active`, `/api/counselors/active`,
`/api/agreements/active`), retorna `res.data ?? []`, y `memCache.get` usa la clave esperada
(`"departments"`, `` `cities:${departmentId}` ``, `"franchises:active"`, `"counselors:active"`,
`"agreements:active"`).

- [ ] **Step 4: Tests de `checkAffiliateIdCard`**

- `checkAffiliateIdCard("123")` → `apiFetch` con `/api/affiliates/check-id-card?id_card=123`.
- `checkAffiliateIdCard("123", 9)` → incluye `&ignore_id=9`.

- [ ] **Step 5: Tests de `createAffiliate` y `updateAffiliate`**

- `createAffiliate(payload)` → `csrf()` antes, `apiFetch` `POST` a `/api/affiliates` con
  `JSON.stringify(payload)`, luego `memCache.invalidatePrefix("affiliates:list:")`.
- `updateAffiliate(5, partialPayload)` → `apiFetch` `PATCH` a `/api/affiliates/5`, misma
  invalidación de caché.

- [ ] **Step 6: Tests de `createRenovation` y `getExpiringToday`**

- `createRenovation(payload)` → `csrf()` antes, `apiFetch` `POST` a `/api/renovations` con el
  payload serializado. (No invalida caché — confirmar que NO se llama `invalidatePrefix` aquí, es
  el comportamiento real actual.)
- `getExpiringToday()` → `apiFetch` a `/api/affiliates/expiring-today`, retorna
  `{ data: res.data ?? [], date: res.date }`, clave de caché `"affiliates:expiring-today"`.

- [ ] **Step 7: Tests de notas (`getAffiliateNotes`, `createAffiliateNote`, `deleteAffiliateNote`)**

- `getAffiliateNotes(5)` → `apiFetch` a `/api/affiliates/5/notes`, retorna `res.data ?? []`.
- `createAffiliateNote(5, "texto")` → `csrf()` antes, `apiFetch` `POST` con
  `JSON.stringify({ body: "texto" })`, retorna `res.data`.
- `deleteAffiliateNote(5, 9)` → `csrf()` antes, `apiFetch` `DELETE` a
  `/api/affiliates/5/notes/9`.

- [ ] **Step 8: Tests de `sendCarnet` y `markMembershipFormConverted`**

- `sendCarnet(5)` → `csrf()` antes, `apiFetch` `POST` a `/api/affiliates/5/carnet`.
- `markMembershipFormConverted(5)` → `csrf()` antes, `apiFetch` `PATCH` a
  `/api/membership-forms/5/convert`, luego `memCache.invalidatePrefix("membership-forms:list:")`.

- [ ] **Step 9: Correr `npm run test` y `npx tsc --noEmit`**

Expected: todos los tests nuevos en verde, sin regresiones a los 40 existentes, 0 errores de tipos.

- [ ] **Step 10: Commit**

**Checkpoint.**

---

### Tarea 2: Tests de `affiliates/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume: `buildAffiliateColumns({ onToggleState, onSendCarnet, onAddNote, hasAccess, canToggle })`
  de `src/app/4dnn1n/affiliates/_components/columns.tsx`, que retorna `ColumnDef<ApiAffiliate>[]`.

**Contexto verificado:** es una función pura que arma definiciones de columnas para
`@tanstack/react-table`. No requiere `render()` de Testing Library — se testea invocando la función
directamente y ejercitando las funciones `cell`/`accessorFn` de cada columna con un objeto
`ApiAffiliate` de prueba (usando `flexRender` o invocando la función `cell` con un objeto `row`
mínimo `{ original: affiliateMock }`, según lo que el `ColumnDef` type exija — revisar cómo lo
resuelve `columns.tsx` real y adaptar).

- [ ] **Step 1: Test de la columna `id_card`, `full_name`, `movil`**

- `full_name`: `accessorFn` con `{ name: "Juan", lastname: "Pérez" }` → `"Juan Pérez"`.
- `movil`: `accessorFn` con `{ movil: "3001234567", phone: null }` → `"3001234567"`; con
  `{ movil: null, phone: "6011234567" }` → `"6011234567"`; con ambos `null` → `"-"`.

- [ ] **Step 2: Test de la columna `state` (badge Activo/Inactivo)**

- `stade: 1` → texto "Activo", clases verdes (`bg-green-100`).
- `stade: 2` → texto "Inactivo", clases rojas (`bg-red-100`).

- [ ] **Step 3: Test de la columna `actions` — gates de `hasAccess`/`canToggle`/carnet**

- `hasAccess: false` → `buildAffiliateColumns(...)` NO incluye la columna `id: "actions"` en el
  array retornado.
- `hasAccess: true, canToggle: false` → la columna existe pero el botón de toggle (`Power` icon) no
  se renderiza.
- `hasAccess: true, canToggle: true` → el botón de toggle existe y, al hacer click, invoca
  `onToggleState(c)` con el afiliado de la fila.
- `carnet: "no"`, `movil: "3001234567"` (10 dígitos) → botón de enviar carnet visible, click invoca
  `onSendCarnet(c)`.
- `carnet: "si"` → botón de carnet NO visible.
- `carnet: "no"`, `movil: "300123"` (no cumple `/^\d{10}$/`) → botón de carnet NO visible.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 3: Tests de `NoteModal.tsx` y `AffiliateNotes.tsx`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/_components/NoteModal.test.tsx` (crear)
- Test: `tests/app/4dnn1n/affiliates/_components/AffiliateNotes.test.tsx` (crear)

**Interfaces:**
- Consume: `NoteModal({ affiliateId, affiliateName, onClose })`,
  `AffiliateNotes({ affiliateId, affiliateName? })` — ambos en
  `src/app/4dnn1n/affiliates/_components/`.
- Mockear `../fetch` (`createAffiliateNote`, `getAffiliateNotes`, `deleteAffiliateNote`) y
  `@/context/AuthContext` (para `isSuperAdmin` en `AffiliateNotes`).

**Contexto verificado:** `NoteModal` usa `createPortal(..., document.body)` y solo monta tras un
`useEffect` (`mounted` state) — usar `render()` de Testing Library normalmente, funciona con
portals sin configuración extra (RTL ya adjunta `document.body`). El botón "Guardar nota" está
`disabled` mientras `saving || !body.trim()`.

- [ ] **Step 1: Tests de `NoteModal`**

1. Render inicial: botón "Guardar nota" deshabilitado (body vacío).
2. Escribir texto en el textarea (`fireEvent.change`) → botón habilitado.
3. Escribir solo espacios (`"   "`) → botón sigue deshabilitado (`body.trim()` vacío).
4. Click en "Guardar nota" con texto válido → llama `createAffiliateNote(affiliateId, textoTrim)`,
   luego `alert.success(...)`, luego `onClose(true)`.
5. Si `createAffiliateNote` rechaza → llama `alert.error(...)` con el mensaje de
   `getApiErrorMessage(err)`, NO llama `onClose`.
6. Click en "Cancelar" o en la X → llama `onClose()` (sin argumento, o `undefined`).
7. Click en el backdrop (`e.target === e.currentTarget`) → llama `onClose()`; click dentro del
   modal no lo hace.

- [ ] **Step 2: Tests de `AffiliateNotes`**

1. Al montar, llama `getAffiliateNotes(affiliateId)`; muestra "Cargando notas..." mientras
   resuelve.
2. Lista vacía tras resolver → muestra "No hay notas registradas para este afiliado."
3. Lista con 2 notas → renderiza ambas, con el contador (`notes.length`) junto al título.
4. `user.type === 1` (super admin) → botón de eliminar (`Trash2`) visible en cada nota;
   `user.type !== 1` → NO visible.
5. Click en eliminar (super admin) + confirmar → llama `deleteAffiliateNote(affiliateId, note.id)`,
   la nota desaparece de la lista local (`setNotes` filtrado).
6. Abrir el modal (botón "Nueva nota") y cerrarlo con `onClose(true)` → vuelve a llamar
   `getAffiliateNotes` (recarga); cerrarlo con `onClose()`/`onClose(false)` → NO recarga.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 4: Tests de `AffiliateForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/_components/AffiliateForm.test.tsx` (crear)

**Interfaces:**
- Consume: `AffiliateForm({ mode, initial?, onSubmit? })` de
  `src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx`.
- Mockear `../_hooks/useAffiliateFormState` COMPLETO — ya tiene su propio test
  (`tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`, 7 casos cubriendo
  `canSubmit`/`submit`/`clear`/`validateIdCard`). Este test es solo de RENDERIZADO: qué se muestra
  según `mode` y según los valores que el mock del hook retorna — no se re-testea la lógica del
  hook.

**Contexto verificado:** el componente desestructura ~25 valores del hook
(`isView`, `isEdit`, `departments`, `cities`, `departmentId`, `franchises`, `agreements`, `saving`,
`idCardError`, `checkingIdCard`, `searchCounselor`, `showCounselors`, `wantsRenovation`,
`renovationType`, `renovationDateIni`, `renovationValue`, `renovationDatePayment`, `form`, `setForm`,
`validateIdCard`, `addBeneficiary`, `removeBeneficiary`, `updateBeneficiaryName`,
`filteredCounselors`, `canSubmit`, `submit`, `clear`) — el mock debe proveer un valor razonable para
cada uno en cada test (usar una factory `createMockFormState(overrides)` que devuelva defaults
completos y permita sobreescribir solo lo relevante por test).

- [ ] **Step 1: Factory de mock del hook**

```ts
function createMockFormState(overrides: Partial<ReturnType<typeof useAffiliateFormState>> = {}) {
  return {
    isView: false, isEdit: false,
    departments: [], cities: [], departmentId: "", setDepartmentId: vi.fn(),
    franchises: [], agreements: [],
    saving: false, idCardError: null, checkingIdCard: false,
    searchCounselor: "", setSearchCounselor: vi.fn(),
    showCounselors: false, setShowCounselors: vi.fn(),
    wantsRenovation: "no", setWantsRenovation: vi.fn(),
    renovationType: "vencimiento", setRenovationType: vi.fn(),
    renovationDateIni: "", setRenovationDateIni: vi.fn(),
    renovationValue: 0, renovationDatePayment: "", setRenovationDatePayment: vi.fn(),
    form: { id_card: "", name: "", lastname: "", bithdate: "", phone: "", movil: "",
      email: "", address: "", city_id: "", user_id: "", agreement_id: "", company: "",
      counselor_id: "", validity: "", validity_end: "", payment_date: "", balance: 0,
      commission: 0, payment_commission: "no", carnet: "no", beneficiaries: [{ name: "" }] },
    setForm: vi.fn(),
    validateIdCard: vi.fn(), addBeneficiary: vi.fn(), removeBeneficiary: vi.fn(),
    updateBeneficiaryName: vi.fn(), filteredCounselors: [],
    canSubmit: true, submit: vi.fn(), clear: vi.fn(),
    ...overrides,
  };
}
```
(Ajustar los tipos exactos leyendo `AffiliateFormState`/el tipo de retorno real de
`useAffiliateFormState` en `../_hooks/useAffiliateFormState.ts` antes de finalizar la factory — el
listado de arriba es la fuente de verdad de qué valores existen, confirmar tipos exactos al
implementar.)

- [ ] **Step 2: Tests de visibilidad por `mode`**

1. `mode="view"` (`isView: true` en el mock) → todos los inputs `disabled`, sin botones "Guardar"/"Limpiar".
2. `mode="create"` (`isEdit: false, isView: false`) → sección "Fecha de Venta" visible; sección de
   renovación NO existe (solo aparece cuando `isEdit || isView`); radios "Carnet Entregado" NO
   existen (`isEdit &&` los envuelve).
3. `mode="edit"` (`isEdit: true`) → sección "Fecha de Venta" NO visible (`!isEdit &&` la envuelve);
   radios "Renovar" visibles; radios "Carnet Entregado" visibles.

- [ ] **Step 3: Tests de la sección de renovación (solo relevante en `isEdit`)**

1. `wantsRenovation: "no"` → NO se muestra el bloque "Nueva vigencia".
2. `wantsRenovation: "si"` → se muestra el bloque, con los inputs de fecha inicial/valor/fecha de
   venta.

- [ ] **Step 4: Tests de beneficiarios**

1. `form.beneficiaries` con 7 elementos, `isView: false` → botón "Añadir beneficiario" NO visible
   (límite alcanzado), mensaje "Haz alcanzado el límite máximo de 7 beneficiarios." visible.
2. `form.beneficiaries` con 1 elemento → botón de eliminar (`Trash2`) por beneficiario NO visible
   (solo aparece si `form.beneficiaries.length > 1`).
3. `form.beneficiaries` con 2 elementos → botón de eliminar visible en ambos; click invoca
   `removeBeneficiary(index)` con el índice correcto.
4. Escribir en el input de un beneficiario → invoca `updateBeneficiaryName(index, valor)`.

- [ ] **Step 5: Tests de botones de acción**

1. `canSubmit: false` → botón "Guardar" deshabilitado.
2. `canSubmit: true, saving: false` → habilitado, texto "Guardar"; click invoca `submit()`.
3. `saving: true` → botón deshabilitado, texto "Guardando...".
4. Click en "Limpiar" → invoca `clear()`.

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 5: Tests de `affiliates/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/page.test.tsx` (crear)

**Interfaces:**
- Consume: `AffiliatesPage` (default export) de `src/app/4dnn1n/affiliates/page.tsx`.
- Mockear: `../fetch` (`getAffiliates`, `updateAffiliateState`, `sendCarnet`),
  `@/hooks/useServerTable`, `@/hooks/useOptimisticToggle`, `@/context/AuthContext`, `@/lib/alert`,
  `@/components/data-table/DataTable` (stub, ver Global Constraints).

**Contexto verificado:** `useServerTable` y `useOptimisticToggle` YA tienen test propio — mockearlos
aquí (no re-testear su lógica), retornando valores de control directos para que el test de la
página se enfoque en SU lógica: el gate de `hasAccess`/`canToggle`, `onSendCarnet`, y el wiring del
`NoteModal`.

- [ ] **Step 1: Mock de `useServerTable`**

```ts
vi.mock("@/hooks/useServerTable", () => ({
  useServerTable: vi.fn(() => ({
    data: [mockAffiliate], setData: vi.fn(), setMeta: vi.fn(), stadeFilter: "1",
    tableProps: { data: [mockAffiliate], loading: false },
    isInitialLoad: false,
  })),
}));
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn(() => vi.fn()) }));
```

- [ ] **Step 2: Test de permisos**

1. `user.type: 3` (sin acceso) → `hasAccess: false` → botón "Crear Afiliado"
   (`CreateToolbarButton`) NO se renderiza.
2. `user.type: 1` → botón visible, con `href="/4dnn1n/affiliates/new"`.

- [ ] **Step 3: Test de `onSendCarnet`**

1. Simular click en el botón de carnet (a través del stub de `DataTable`, exponer `onSendCarnet` en
   las props del stub para invocarlo directamente en el test, ya que el mock de `DataTable` no
   renderiza columnas reales) → confirma con `alert.confirm`, dentro de `onConfirm` llama
   `sendCarnet(c.id)`.
2. Tras confirmar y que `sendCarnet` resuelva → `setData` se llama actualizando `carnet: "si"` para
   ese afiliado, y `alert.success(...)`.
3. Si `sendCarnet` rechaza → `alert.error(...)` con `getApiErrorMessage(err)`.

- [ ] **Step 4: Test del `NoteModal`**

1. Sin `noteTarget` seleccionado → `NoteModal` no se renderiza.
2. Nota: el botón que dispara `onAddNote` está actualmente comentado en `columns.tsx` (dead code),
   así que este caso solo es alcanzable invocando `onAddNote` directamente si el stub de columnas lo
   expone — si no es razonablemente alcanzable sin simular una interacción que no existe en la UI
   real, documentar esto en el reporte de la tarea como hallazgo (código muerto/wiring sin
   trigger) y omitir este caso puntual, no inventar una forma artificial de dispararlo.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 6: Tests de `affiliates/new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/affiliates/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/affiliates/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/affiliates/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume: `NewAffiliatePage`, `ViewAffiliatePage`, `EditAffiliatePage` (default exports).
- Mockear `../fetch` (o `../../fetch` según profundidad), `@/context/AuthContext`,
  `next/navigation` (`useRouter`, `useParams`, `useSearchParams`), `@/lib/alert`,
  `../_components/AffiliateForm` (o `../../_components/AffiliateForm`) con un stub simple que
  renderiza un botón "submit-stub" invocando `onSubmit` con un payload fijo de prueba — para no
  depender del `AffiliateForm` real (ya testeado en la Tarea 4).

- [ ] **Step 1: Tests de `new/page.tsx` — permisos y prefill**

1. `user.type: 3` → mensaje "No tienes permisos suficientes...".
2. Sin `?from=` en la URL (`useSearchParams().get("from")` → `null`) → `AffiliateForm` se renderiza
   con `mode="create"`, `initial={undefined}`.
3. Con `?from=42` → llama `apiFetch<{ data: MembershipFormData }>("/api/membership-forms/42")`
   (mockear `@/lib/api`'s `apiFetch` para este archivo específico), y una vez resuelve, pasa
   `initial` a `AffiliateForm` con los campos mapeados: `name`, `lastname`, `id_card`,
   `movil: data.phone`, `email`, `bithdate: data.bithdate ?? undefined`, `address`, `city_id`,
   `city`, `beneficiaries: data.membership_form_beneficiaries?.map(b => ({ name: b.name })) ?? []`.
4. Si el fetch de prefill rechaza → continúa con el formulario vacío (`prefill` queda `undefined`),
   sin lanzar error visible.
5. `handleCreate`: confirma con `alert.confirm`, dentro de `onConfirm` llama
   `createAffiliate(payload)`; si vino de `?from=42`, además llama
   `markMembershipFormConverted(42)` (con `.catch(() => {})`, verificar que un rechazo de esta
   llamada NO rompe el flujo); redirige a `/4dnn1n/membership-forms` si vino de `from`, o a
   `/4dnn1n/affiliates` si no.

- [ ] **Step 2: Tests de `[id]/page.tsx` (vista)**

1. Mientras `authLoading || loading` → renderiza `FormPageSkeleton`.
2. `user.type: 3` → mensaje de permisos.
3. `getAffiliate` resuelve → `AffiliateForm` se renderiza con `mode="view"`, `initial={data}`; y
   `AffiliateNotes` se renderiza con el `affiliateId`/`affiliateName` correctos.
4. `getAffiliate` rechaza → `alert.error(...)`, y tras terminar `loading`, `data` sigue `null` →
   mensaje "No se pudo cargar el afiliado o no existe."

- [ ] **Step 3: Tests de `[id]/edit/page.tsx` — el caso especial de `handleUpdate`**

1. Estados de carga/permisos análogos a la Tarea 6 Step 2.
2. `handleUpdate` SIN `payload.renovation` → llama `updateAffiliate(id, payload)` con `validity`
   eliminado del payload (`delete payload.validity`), SIN llamar `createRenovation`.
3. `handleUpdate` CON `payload.renovation = { date_ini, date_end, date_payment, value }` → el
   payload final a `updateAffiliate` tiene `validity_end = renovationData.date_end`, `stade: 1`, y
   NO tiene las claves `renovation` ni `validity`; después de que `updateAffiliate` resuelva, se
   llama `createRenovation({ ...renovationData, affiliate_id: id })`.
4. Tras éxito → `alert.success(...)`, redirige a `/4dnn1n/affiliates`.
5. Si `updateAffiliate` rechaza → `alert.error(...)`, NO redirige.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint — fin de la parte `affiliates` de esta fase.**

---

### Tarea 7: Tests de `appointments/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/appointments/fetch.test.ts` (crear)

**Interfaces:**
- Consume: los 9 exports de `src/app/4dnn1n/appointments/fetch.ts` (`getAppointments`,
  `getAppointment`, `createAppointment`, `updateAppointment`, `deleteAppointment`,
  `getAffiliateForEdit`, `searchAffiliateByIdCard`, `getActiveSpecialties`,
  `getDoctorsBySpecialty`, `getDepartments`, `getCitiesByDepartment`).

**Contexto verificado:** mismo patrón de mock de `@/lib/api`/`@/lib/memCache` que la Tarea 1.

- [ ] **Step 1: Tests de `getAppointments`**

1. Sin params → `/api/appointments` sin query.
2. `{ search, page, per_page, date, period }` todos presentes → los 5 en el query string.
3. Retorna `{ data: res.data ?? [], meta: res.meta }`.
4. Clave de caché `` `appointments:list:${query}` `` distinta por combinación de params.

- [ ] **Step 2: Tests de `getAppointment`, `createAppointment`, `updateAppointment`,
  `deleteAppointment`**

1. `getAppointment(3)` → `/api/appointments/3`, retorna `res.data`.
2. `createAppointment(payload)` → `csrf()` antes, `POST` a `/api/appointments`, retorna
   `res.data`, luego `invalidatePrefix("appointments:list:")`.
3. `updateAppointment(3, payload)` → `csrf()` antes, `PUT` (no `PATCH`) a `/api/appointments/3`,
   retorna `res.data`, invalida caché.
4. `deleteAppointment(3)` → `csrf()` antes, `DELETE` a `/api/appointments/3`, invalida caché.

- [ ] **Step 3: Tests de `getAffiliateForEdit` y `searchAffiliateByIdCard`**

1. `getAffiliateForEdit(7)` → `/api/affiliates/7`, retorna `res.data`.
2. `searchAffiliateByIdCard("123")` → `/api/affiliates/by-id-card?id_card=123` (con
   `encodeURIComponent`), retorna `res.data`.

- [ ] **Step 4: Tests de `getActiveSpecialties` — el filtro `state === 1`**

1. `apiFetch` resuelve `{ data: [{ id: 1, name: "Cardio", state: 1 }, { id: 2, name: "Derma", state: 0 }] }`
   → `getActiveSpecialties()` retorna SOLO el primero (filtro `state === 1` aplicado del lado del
   cliente, no del servidor — este es el comportamiento real, confirmar que se testea el filtro,
   no solo el fetch).
2. Clave de caché `"specialties:active"`.

- [ ] **Step 5: Tests de `getDoctorsBySpecialty`, `getDepartments`, `getCitiesByDepartment`**

1. `getDoctorsBySpecialty(4)` → `/api/doctors/by-specialty?specialty_id=4`, retorna
   `res.data ?? []`, clave `` `doctors:specialty:${specialtyId}` ``.
2. `getDepartments`/`getCitiesByDepartment` — mismo patrón que la Tarea 1 Step 3 (idéntico a
   `affiliates/fetch.ts`, confirmar que el comportamiento es el mismo).

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 8: Tests de `appointments/_components/columns.tsx`

**Files:**
- Test: `tests/app/4dnn1n/appointments/_components/columns.test.tsx` (crear)

**Interfaces:**
- Consume: `buildAppointmentColumns({ onDelete, hasAccess })`.

- [ ] **Step 1: Test de la columna `tipo` y `name`**

1. `type: 1` → badge "Titular", clases azules.
2. `type: 2` → badge "Beneficiario", clases moradas.
3. `owner: { name: "Ana", lastname: "Ruiz" }` → columna "name" muestra "Ana Ruiz" (usa `owner`, no
   `row.name`).
4. `owner: null/undefined` → columna "name" muestra `row.original.name` (el nombre plano de la
   fila).

- [ ] **Step 2: Test de las columnas `doctor`, `city`, `date`**

1. `doctor: { name: "Carlos", lastname: "Pérez" }` → `"Carlos Pérez"`; `doctor: null` → `"-"`.
2. `city: { name: "Bogotá" }` → `"Bogotá"`; `city: null` → `"-"`.
3. `date: "2026-05-14"` → celda renderiza `"14/05/2026"`.

- [ ] **Step 3: Test de la columna `actions` — `isPast` gating**

Usar `vi.useFakeTimers()` y `vi.setSystemTime(new Date("2026-06-15T12:00:00"))` para fijar "hoy".

1. `date: "2026-06-10"` (pasada) → `isPast: true` → botones de editar/eliminar NO se renderizan
   (solo "Ver" visible), independientemente de `hasAccess`.
2. `date: "2026-06-20"` (futura), `hasAccess: false` → solo "Ver" visible.
3. `date: "2026-06-20"` (futura), `hasAccess: true` → los 3 botones (Ver/Editar/Eliminar) visibles;
   click en eliminar invoca `onDelete(c)`.
4. `date: "2026-06-15"` (exactamente hoy) → confirmar el comportamiento real de
   `apptDate < today` con horas en cero (`isPast: false` porque `today` también tiene
   `setHours(0,0,0,0)` — una cita de HOY no cuenta como pasada).

- [ ] **Step 4: Correr tests y tsc (restaurar `vi.useRealTimers()` en `afterEach`)**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 9: Tests de `AppointmentForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/appointments/_components/AppointmentForm.test.tsx` (crear)

**Interfaces:**
- Consume: `AppointmentForm({ onSubmit, userId })`.
- Mockear `../fetch` (`searchAffiliateByIdCard`, `getActiveSpecialties`, `getDoctorsBySpecialty`).

**Contexto verificado:** a diferencia de `AffiliateForm`, este componente NO usa un hook separado
— toda la lógica (búsqueda, validaciones, `canSubmit`, construcción del payload) vive en el propio
archivo. Se testea con el componente completo montado (no hay hook que mockear para aislar lógica).

- [ ] **Step 1: Tests de búsqueda de afiliado**

1. Al montar, `getActiveSpecialties` se llama una vez (`useEffect` de carga inicial).
2. Escribir un documento y click en "Buscar" → llama `searchAffiliateByIdCard(idCardInput.trim())`.
3. Búsqueda exitosa → se muestran las tarjetas de "Titular" y cada beneficiario de
   `affiliate.beneficiaries`.
4. Búsqueda fallida → se muestra el mensaje de error (`getApiErrorMessage(err)`).
5. Input vacío (solo espacios) → el botón "Buscar" está deshabilitado (`!idCardInput.trim()`).

- [ ] **Step 2: Tests de selección de paciente y carga de médicos**

1. Click en la tarjeta del titular → `selectedPatient` se fija con `{ afiCode: affiliate.id, type: 1, name }`,
   y el campo `phone` del form se autocompleta desde `affiliate.movil` (o `.phone` si `movil` es
   null), recortado a 10 dígitos con solo números.
2. Click en un beneficiario → `selectedPatient` se fija con `{ afiCode: b.id, type: 2, name: b.name }`.
3. Seleccionar una especialidad → dispara `getDoctorsBySpecialty(id)`; mientras carga, el selector
   de médico muestra "Cargando médicos...".
4. Cambiar de especialidad → resetea médico seleccionado y los campos `address`/`city_id`/`value`.

- [ ] **Step 3: Tests de selección de médico (autocompletado)**

1. Seleccionar un médico → `form.address`, `form.city_id`, `form.value` se autocompletan desde
   `doctor.address`/`doctor.city_id`/`doctor.value_agreement`; el campo "Ciudad" se muestra
   read-only con `doctor.city?.name`.

- [ ] **Step 4: Tests de validaciones (`valueError`, `phoneError`, `canSubmit`)**

1. `form.value: "5000"` → `valueError`: "El valor debe ser mayor o igual a $10.000"; `form.value: "10000"` → sin error.
2. `form.phone: "12345"` (5 dígitos) → `phoneError`: "El teléfono debe tener exactamente 10 dígitos"; `"3001234567"` (10) → sin error.
3. `canSubmit` es `false` si falta `selectedPatient`, `selectedDoctor`, `date`, `hour`, `address`,
   `city_id`, o si `value < 10000`, o si `phoneError` existe. `true` solo cuando TODO está
   completo y válido.

- [ ] **Step 5: Test de `handleSubmit` y `handleClear`**

1. Con todos los campos válidos, click en "Guardar Cita" → llama `onSubmit` con el payload exacto:
   `{ afi_code, type, name, doctor_id, date, hour, address, city_id: Number(...), phone, value: Number(...), user_id }`.
2. Click en "Limpiar" → resetea `idCardInput`, `affiliate`, `selectedPatient`, especialidad,
   médicos, y el formulario completo.

- [ ] **Step 6: Correr tests y tsc**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 10: Tests de `AppointmentEditForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/appointments/_components/AppointmentEditForm.test.tsx` (crear)

**Interfaces:**
- Consume: `AppointmentEditForm({ initial, onSubmit })`.
- Mockear `../fetch` (`getActiveSpecialties`, `getDoctorsBySpecialty`).

**Contexto verificado — diferencias clave respecto a `AppointmentForm` (Tarea 9), no confundir:**
- No hay paso de búsqueda de afiliado — el paciente viene fijo de `initial` (solo lectura).
- `canSubmit` NO valida teléfono (no hay `phoneError` en este archivo) — solo
  `selectedDoctor`/`date`/`hour`/`address`/`city_id`/`value >= 10000`.
- Auto-selecciona el médico inicial (`initial.doctor_id`) la PRIMERA vez que carga la lista de
  médicos de la especialidad inicial, usando un `useRef` (`initialDoctorId`) que se resetea a `0`
  tras usarse — para no volver a auto-seleccionar si el usuario cambia de especialidad después.

- [ ] **Step 1: Test del estado inicial derivado de `initial`**

1. `form` se inicializa con `date/hour/address/phone/value` de `initial`, `city_id: String(initial.city_id)`.
2. `specialtyId` inicial es `String(initial.doctor?.specialty_id ?? "")`.

- [ ] **Step 2: Test del auto-select del médico inicial**

1. Mock `getDoctorsBySpecialty` resolviendo una lista que incluye un médico con
   `id === initial.doctor_id` → tras el efecto, `selectedDoctor` queda fijado a ese médico
   automáticamente (sin click del usuario).
2. Cambiar de especialidad manualmente después → NO se re-auto-selecciona nada (el `ref` ya se
   reseteó a `0` tras el primer uso) — el usuario debe elegir médico manualmente en la nueva lista.

- [ ] **Step 3: Test de `canSubmit` (sin validación de teléfono)**

1. Con `selectedDoctor`/`date`/`hour`/`address`/`city_id`/`value >= 10000` completos pero
   `form.phone` vacío o con cualquier longitud → `canSubmit: true` igual (confirmar que NO se
   bloquea por teléfono, a diferencia de `AppointmentForm`).

- [ ] **Step 4: Test de `handleSubmit`**

1. Click en "Guardar Cambios" → llama `onSubmit` con
   `{ afi_code: initial.afi_code, type: initial.type, name: initial.name, doctor_id: selectedDoctor.id, date, hour, address, city_id: Number(...), phone, value: Number(...), user_id: initial.user_id }`
   (reutiliza `afi_code`/`type`/`name`/`user_id` de `initial`, no del formulario — confirmar que
   estos 4 campos no son editables en esta vista).

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 11: Tests de `appointments/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/appointments/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/appointments/new/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/appointments/[id]/page.test.tsx` (crear)
- Test: `tests/app/4dnn1n/appointments/[id]/edit/page.test.tsx` (crear)

**Interfaces:**
- Consume: `AppointmentsPage`, `NewAppointmentPage`, `ViewAppointmentPage`, `EditAppointmentPage`.
- Mockear `../fetch` (o profundidad correspondiente), `@/hooks/useServerTable`,
  `@/context/AuthContext`, `next/navigation`, `@/lib/alert`, `@/components/data-table/DataTable`
  (stub), y `../_components/AppointmentForm`/`AppointmentEditForm` con stubs simples (mismo
  criterio que la Tarea 6 — ya testeados en las Tareas 9-10).

- [ ] **Step 1: Tests de `page.tsx` — mutua exclusión de filtros fecha/período**

1. Estado inicial: `defaultStade: "all"`, `extraParams: { date: undefined, period: "pending" }`
   (default `filterPeriod`).
2. Seleccionar una fecha (`DatePickerWithToday.onChange`) → `extraParams` pasa a
   `{ date: "2026-06-01", period: undefined }` (el `period` se omite cuando hay fecha).
3. Limpiar la fecha (botón "×") → vuelve a `{ date: undefined, period: filterPeriod }`.
4. Cambiar el `<select>` de período mientras hay una fecha activa → el select está `disabled`
   (`disabled={!!filterDate}`), no debería poder cambiarse.
5. `onDelete`: confirma con `alert.confirm`, dentro de `onConfirm` llama `deleteAppointment(c.id)`;
   tras éxito, `setData` filtra la cita eliminada y `setMeta` decrementa `total` en 1.

- [ ] **Step 2: Tests de `new/page.tsx`**

1. `user.type: 3` → mensaje de permisos.
2. `handleSubmit`: llama `createAppointment(payload)`, `alert.success(...)`, redirige a
   `/4dnn1n/appointments`.
3. Si `createAppointment` rechaza → `alert.error(...)` con `getApiErrorMessage(err)`, NO redirige.

- [ ] **Step 3: Tests de `[id]/page.tsx` (vista)**

1. Mientras `loading` → muestra el skeleton (verificar por un elemento con la clase
   `animate-pulse`, no por texto).
2. `getAppointment` resuelve → verifica `formatDate("2026-05-14")` → `"14/05/2026"`;
   `formatCurrency(50000)` → el resultado de
   `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(50000)`
   (usar ese mismo `Intl.NumberFormat` en la aserción para no hardcodear un string de locale
   frágil); `owner` presente → usa su nombre; `owner: null` → usa `data.name`.
3. `getAppointment` rechaza → `alert.error(...)`, mensaje "No se pudo cargar la cita o no existe."

- [ ] **Step 4: Tests de `[id]/edit/page.tsx`**

1. Estados de carga/permisos análogos.
2. `handleSubmit`: llama `updateAppointment(id, payload)` directo (SIN `alert.confirm` — a
   diferencia de `affiliates/[id]/edit/page.tsx`, esta página actualiza sin modal de confirmación
   previo), luego `alert.success(...)`, redirige a `/4dnn1n/appointments`.
3. **Hallazgo verificado, no es un bug a arreglar en este plan:** `handleSubmit` de esta página NO
   tiene `try/catch` — si `updateAppointment` rechaza, la promesa se propaga sin manejar (el
   `try/finally` de `AppointmentEditForm.handleSubmit` solo resetea `saving`, no atrapa el error).
   Escribir el test de este caso confirmando que la promesa retornada por `onSubmit` efectivamente
   rechaza (`await expect(onSubmitProp(payload)).rejects.toThrow()` o equivalente) — NO forzar una
   aserción de `alert.error(...)` que no ocurre en este flujo. Documentar este hallazgo en el
   reporte de la tarea (falta de manejo de errores real en producción) para que el usuario decida
   si amerita un fix aparte — no corregirlo en este plan de tests.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint final de la Fase 1.**

---

### Verificación final de la Fase 1

- [ ] Suite completa (`npm run test`) en verde.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run test:coverage`: anotar el % real alcanzado para `affiliates`/`appointments`
  específicamente (debería acercarse al 85-90% mínimo aceptable de `dev-standards` en estos dos
  módulos, ya que esta fase los cubre exhaustivamente).
- [ ] Revisar el diff completo antes de decidir cómo integrar esta fase — el usuario decide cuándo
  y cómo mergear/pushear.

**No se sube el umbral de cobertura global en `vitest.config.ts` en esta fase** — eso se decide en
la Fase 4 (última), con el número final de las 4 fases combinadas, según el spec.
