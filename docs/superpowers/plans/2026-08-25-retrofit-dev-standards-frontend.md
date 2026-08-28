# Retrofit dev-standards Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar las brechas de `dev-standards` que quedan en el frontend tras la ronda de
arquitectura del 2026-08-07: migrar la convención de tests a carpeta espejo, completar la
migración de `useOptimisticToggle` a los 4 módulos que quedaron con el patrón viejo duplicado,
corregir el `any` residual, consolidar `src/services/` vs `fetch.ts`, introducir capas de
dominio/aplicación en los módulos con lógica real, subir la cobertura de tests desde ~1.7%
priorizando lógica pura y hooks, y eliminar los `any` restantes.

**Architecture:** Las Tareas 1-4 (migración de tests, fix de `any`, migración del hook de toggle)
son independientes y de bajo riesgo — van primero porque son baratas y no bloquean nada. Las
Tareas 5-8 (consolidar servicios, configurar coverage, tests de lógica pura y hooks) preparan la
red de seguridad antes de las Tareas 9-11 (separación de capas en `affiliates`/`appointments`,
que mueven código real y necesitan tests que confirmen que no cambia el comportamiento).

**Tech Stack:** Next.js/TypeScript, Vitest + Testing Library, `npx tsc --noEmit` para verificar
tipos tras cada cambio.

**Spec:** `docs/superpowers/specs/2026-08-25-retrofit-dev-standards-frontend-design.md`

## Global Constraints

- Comentarios y nombres de variables en **español** — convención ya establecida del proyecto
  (excepción documentada frente al estándar genérico de `dev-standards`, ver Hallazgo 3.2 del
  spec). No traducir nada existente.
- **No hacer `git commit` dentro de las tareas.** Cada tarea termina en un checkpoint de
  verificación. El usuario decide cuándo integrar.
- Correr `npm run test` (Vitest) y `npx tsc --noEmit` después de cada tarea — ambos deben quedar
  limpios antes de pasar a la siguiente.
- Las 7 carpetas de plantilla del admin template (`calendar/`, `tables/`, `ui-elements/`, `forms/`,
  `pages/`, `profile/`, `charts/`) y sus componentes exclusivos ya se eliminaron en la sesión
  donde se escribió este plan — no reaparecen en ninguna tarea.
- No se reabre nada del spec/plan `2026-08-07-revision-arquitectura-frontend` salvo los 2
  hallazgos reales encontrados al verificarlo (Tareas 3-4 de este plan).

---

### Tarea 1: Migrar los 4 tests existentes de colocación a carpeta espejo `tests/`

**Files:**
- Move: `src/lib/dates.test.ts` → `tests/lib/dates.test.ts`
- Move: `src/hooks/useOptimisticToggle.test.ts` → `tests/hooks/useOptimisticToggle.test.ts`
- Move: `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts` →
  `tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`
- Move: `src/test/setup-smoke.test.tsx` → `tests/setup-smoke.test.tsx`

**Interfaces:** ninguna — es reubicación de archivos, sin cambio de comportamiento.

**Contexto verificado:** `vitest.config.ts` no declara `include` explícito (usa el default de
Vitest `**/*.{test,spec}.*`), así que los tests se seguirán descubriendo desde `tests/` sin cambiar
la config. Los imports relativos actuales dejan de funcionar al mover el archivo — se reemplazan
por el alias `@/` (ya configurado en `vitest.config.ts` → `resolve.alias["@"] = "./src"`).

- [x] **Step 1: Mover los 4 archivos**

```bash
mkdir -p tests/lib tests/hooks tests/app/4dnn1n/affiliates/_hooks
git mv src/lib/dates.test.ts tests/lib/dates.test.ts
git mv src/hooks/useOptimisticToggle.test.ts tests/hooks/useOptimisticToggle.test.ts
git mv src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts
git mv src/test/setup-smoke.test.tsx tests/setup-smoke.test.tsx
```

- [x] **Step 2: Corregir los imports en `tests/lib/dates.test.ts`**

Cambiar el import relativo (`./dates` o similar) por:
```ts
import { addOneYear, getTodayString } from "@/lib/dates";
```

- [x] **Step 3: Corregir los imports en `tests/hooks/useOptimisticToggle.test.ts`**

Cambiar:
```ts
import { useOptimisticToggle } from "./useOptimisticToggle";
```
por:
```ts
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
```

- [x] **Step 4: Corregir los imports en `tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`**

Cambiar:
```ts
import { useAffiliateFormState } from "./useAffiliateFormState";
...
vi.mock("../fetch", () => ({ ... }));
```
por:
```ts
import { useAffiliateFormState } from "@/app/4dnn1n/affiliates/_hooks/useAffiliateFormState";
...
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({ ... }));
```
y el `import { checkAffiliateIdCard } from "../fetch";` posterior por
`from "@/app/4dnn1n/affiliates/fetch"`.

- [x] **Step 5: Revisar `tests/setup-smoke.test.tsx`**

Si tiene algún import relativo a `src/`, ajustarlo al alias `@/`. Si es puramente un smoke test de
configuración sin imports de `src/`, no necesita cambios más allá de la ubicación.

- [x] **Step 6: Verificar que si `vitest.setup.ts` referencia la carpeta `src/test/`, se actualice**

Run: `grep -rn "src/test\|src/lib/dates.test\|src/hooks/useOptimisticToggle.test" vitest.config.ts vitest.setup.ts package.json`
Expected: sin coincidencias que rompan, o corregir la referencia si aparece alguna ruta hardcodeada.

- [x] **Step 7: Correr los tests**

Run: `npm run test`
Expected: los mismos 4 archivos, mismos 17 casos, todos en verde, ahora descubiertos desde `tests/`.

- [x] **Step 8: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

**Checkpoint — no hacer commit.**

---

### Tarea 2: Fix del `any` residual en `useAffiliateFormState.ts`

**Files:**
- Modify: `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts` (línea ~41)

**Interfaces:** ninguna — cambio de tipo interno, sin cambio de comportamiento.

**Contexto verificado:**
```ts
function FormNumber(val: any, def: number) {
  if (val !== undefined && val !== null) return Number(val);
  return def;
}
```
Único uso: línea 109, `commission: FormNumber(initial?.commission, 0)` dentro del `useState`
inicial. `Number()` acepta `unknown` sin problema de tipos porque `val` solo se compara contra
`undefined`/`null` antes de pasarse — no se accede a ninguna propiedad de `val`.

- [x] **Step 1: Aplicar el fix**

```ts
function FormNumber(val: unknown, def: number): number {
  if (val !== undefined && val !== null) return Number(val);
  return def;
}
```

- [x] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores (el cambio es compatible, `Number()` acepta `unknown`).

- [x] **Step 3: Correr el test existente de este hook**

Run: `npm run test -- useAffiliateFormState`
Expected: los 7 tests migrados en la Tarea 1 siguen en verde.

**Checkpoint — no hacer commit.**

---

### Tarea 3: Migrar `counselors`, `franchises` y `doctors/specialties` a `useOptimisticToggle`

**Files:**
- Modify: `src/app/4dnn1n/counselors/page.tsx`
- Modify: `src/app/4dnn1n/franchises/page.tsx`
- Modify: `src/app/4dnn1n/doctors/specialties/page.tsx`

**Interfaces:**
- Consume: `useOptimisticToggle` (ya existe en `src/hooks/useOptimisticToggle.ts`).
- No produce interfaz nueva.

**Contexto verificado:** los 3 módulos usan `useClientTable`, que no expone `setMeta`/`stadeFilter`
(confirmado leyendo `src/hooks/useClientTable.ts` — solo retorna `{ data, setData, loading }`). El
hook `useOptimisticToggle` exige ambos parámetros para la rama de "quitar de la lista si hay
filtro de estado activo". Como estos 3 módulos muestran todos los registros sin filtrar por
servidor, la rama nunca debe activarse — se pasa `setMeta: () => {}` y `stadeFilter: "all"` como
valores fijos (no dummies incorrectos: es exactamente el comportamiento actual, que nunca quita
filas de la lista al togglear).

**`updateFn` de cada módulo (firma ya compatible directa con `(id, nextValue) => Promise<unknown>`,
confirmado leyendo cada `fetch.ts`):** `updateCounselorState(id: number, state: 1 | 2)`,
`updateFranchiseState(id: number, state: 1 | 2)`, `updateSpecialtyState(id: number, state: 0 | 1)`.

- [x] **Step 1: Migrar `counselors/page.tsx`**

Agregar el import:
```ts
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
```
Reemplazar la función `onToggleState` completa (el bloque `try { const ok = await alert.confirm({...}) } catch (err) {...}`) por:
```tsx
const onToggleState = useOptimisticToggle<ApiCounselor, "state", 1 | 2>({
  field: "state",
  activeValue: 1,
  inactiveValue: 2,
  setData,
  setMeta: () => {},
  stadeFilter: "all",
  updateFn: updateCounselorState,
  confirmTitle: (isActive) => (isActive ? "¿Inactivar asesor?" : "¿Activar asesor?"),
  confirmText: (isActive) =>
    isActive
      ? "El asesor quedará inactivo y no podrá usarse hasta reactivarlo."
      : "El asesor quedará activo y podrá usarse nuevamente.",
  successMessage: (isActive) => (isActive ? "Asesor inactivado." : "Asesor activado."),
});
```
Eliminar los imports que queden sin uso (`alert`, `getApiErrorMessage`) si ningún otro punto del
archivo los sigue usando — confirmar con `grep -n "alert\.\|getApiErrorMessage" src/app/4dnn1n/counselors/page.tsx`
antes de borrar el import.

- [x] **Step 2: Migrar `franchises/page.tsx`**

Mismo patrón exacto, cambiando el genérico y las opciones:
```tsx
const onToggleState = useOptimisticToggle<ApiFranchise, "state", 1 | 2>({
  field: "state",
  activeValue: 1,
  inactiveValue: 2,
  setData,
  setMeta: () => {},
  stadeFilter: "all",
  updateFn: updateFranchiseState,
  confirmTitle: (isActive) => (isActive ? "¿Inactivar franquicia?" : "¿Activar franquicia?"),
  confirmText: (isActive) =>
    isActive
      ? "La franquicia quedará inactiva y no podrá usarse hasta reactivarla."
      : "La franquicia quedará activa y podrá usarse nuevamente.",
  successMessage: (isActive) => (isActive ? "Franquicia inactivada." : "Franquicia activada."),
});
```

- [x] **Step 3: Migrar `doctors/specialties/page.tsx`**

Nota: este módulo usa `0`/`1` (no `1`/`2`) y un solo texto de botón de confirmación fijo:
```tsx
const onToggleState = useOptimisticToggle<ApiSpecialty, "state", 0 | 1>({
  field: "state",
  activeValue: 1,
  inactiveValue: 0,
  setData,
  setMeta: () => {},
  stadeFilter: "all",
  updateFn: updateSpecialtyState,
  confirmTitle: (isActive) => (isActive ? "¿Inactivar especialidad?" : "¿Activar especialidad?"),
  confirmText: (isActive) =>
    isActive
      ? "No aparecerá en los selectores al crear un médico."
      : "Estará disponible nuevamente.",
  confirmButtonText: () => "Sí, continuar",
  successMessage: (isActive) => `La especialidad ha sido ${isActive ? "inactivada" : "activada"}.`,
});
```

- [x] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores en los 3 archivos.

- [x] **Step 5: Probar manualmente los 3 módulos**

Iniciar el dev server (`npm run dev`) y en el panel: togglear el estado de un asesor, una
franquicia y una especialidad — confirmar que el modal, el cambio optimista y el mensaje de éxito
se ven igual que antes de migrar. Confirmar también el caso de error (desconectar la red o forzar
un 500 en el endpoint correspondiente) para ver que revierte visualmente.

- [x] **Step 6: Correr la suite de tests**

Run: `npm run test`
Expected: sin regresiones (estos 3 módulos no tenían test propio antes, y esta tarea no les agrega
uno todavía — eso es la Tarea 9).

**Checkpoint — no hacer commit.**

---

### Tarea 4: Migrar `agreements` a `useOptimisticToggle` (caso especial)

**Files:**
- Modify: `src/app/4dnn1n/agreements/page.tsx`
- Modify: `src/app/4dnn1n/agreements/fetch.ts`

**Interfaces:**
- Consume: `useOptimisticToggle`.
- Modifica la firma de `updateAgreementState` — confirmar que ningún otro archivo la llama antes
  de cambiarla (`grep -rn "updateAgreementState" src`).

**Contexto verificado:** a diferencia de los otros 3 módulos, `updateAgreementState(agreement: ApiAgreement, newState: 1 | 0)`
recibe el **objeto completo** (no solo el `id`) porque el `PUT` real reconstruye `name`, `amount`,
`city_id` además de `state` (la validación de `AgreementController::update()` exige esos 4 campos
completos, no solo `state` — ver Hallazgo del backend). `useOptimisticToggle.updateFn` solo pasa
`(id, nextValue)` — hay que cambiar la firma de `updateAgreementState` para que reciba el `id` y
resuelva el resto de los campos desde otro lado, o envolverla.

- [x] **Step 1: Cambiar la firma de `updateAgreementState` para aceptar `(id, agreement, newState)`**

En `src/app/4dnn1n/agreements/fetch.ts`, cambiar:
```ts
export async function updateAgreementState(agreement: ApiAgreement, newState: 1 | 0) {
```
por:
```ts
export async function updateAgreementState(id: ApiAgreement["id"], agreement: ApiAgreement, newState: 1 | 0) {
```
y usar `id` (no `agreement.id`) en la URL del `apiFetch`, dejando el resto del cuerpo igual
(sigue construyendo el payload con `agreement.name`, `agreement.amount`, `agreement.city_id`).

- [x] **Step 2: Migrar `agreements/page.tsx` envolviendo `updateFn`**

Agregar el import:
```ts
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
```
Reemplazar `onToggleState` por:
```tsx
const onToggleState = useOptimisticToggle<ApiAgreement, "state", 1 | 0>({
  field: "state",
  activeValue: 1,
  inactiveValue: 0,
  setData,
  setMeta: () => {},
  stadeFilter: "all",
  updateFn: (id, nextState) => {
    const agreement = data.find((a) => a.id === id);
    if (!agreement) return Promise.reject(new Error("Convenio no encontrado en la lista actual"));
    return updateAgreementState(id, agreement, nextState);
  },
  confirmTitle: (isActive) => (isActive ? "¿Inactivar convenio?" : "¿Activar convenio?"),
  confirmText: (isActive) =>
    isActive ? "El convenio quedará inactivo." : "El convenio quedará activo nuevamente.",
  successMessage: (isActive) => (isActive ? "Convenio inactivado." : "Convenio activado."),
});
```

- [x] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [x] **Step 4: Probar manualmente**

Togglear un convenio en el panel y confirmar que el `PUT` sigue enviando `name`/`amount`/`city_id`
correctos (revisar la pestaña Network del navegador) y que el estado visual se actualiza igual que
antes.

- [x] **Step 5: Correr la suite**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Tarea 5: Consolidar `src/services/` dentro de los módulos que lo usan

**Files:**
- Move: `src/services/affiliateService.ts` → integrarlo o eliminarlo (ver Step 1)
- Modify: los archivos que importan desde `src/services/affiliateService.ts`

**Interfaces:** depende de confirmar en el Step 1 qué exporta realmente `affiliateService.ts` y
quién lo consume — no se transcribió su contenido en la investigación previa.

**Contexto verificado:** `src/services/charts.services.ts` ya se eliminó (era 100% demo). Queda
solo `affiliateService.ts` en esa carpeta — el criterio del spec (Hallazgo 1.1) es: si solo lo usa
el módulo `affiliates`, se mueve dentro de `src/app/4dnn1n/affiliates/`; si lo usan 2+ módulos, se
queda en `src/services/` como capa compartida explícita.

- [x] **Step 1: Identificar consumidores**

Run: `grep -rln "from \"@/services/affiliateService\"\|from '@/services/affiliateService'" src`
Expected: lista de archivos que lo importan.

- [x] **Step 2: Decidir destino según el resultado**

Si **todos** los consumidores están dentro de `src/app/4dnn1n/affiliates/`: mover el archivo a
`src/app/4dnn1n/affiliates/affiliateService.ts` (o fusionarlo con `fetch.ts` si su contenido se
superpone con lo que ya hace `fetch.ts` — leer ambos archivos para decidir si son complementarios
o duplicados antes de fusionar). Si hay consumidores en 2+ módulos, dejarlo en `src/services/` y
solo actualizar el `README`/comentario del archivo aclarando por qué vive ahí (capa compartida).

- [x] **Step 3: Actualizar los imports de los consumidores** (solo si se movió el archivo)

Cambiar `from "@/services/affiliateService"` por la nueva ruta en cada consumidor identificado en
el Step 1.

- [x] **Step 4: Eliminar la carpeta `src/services/` si quedó vacía**

Run: `ls src/services` — si está vacía, `rmdir src/services`.

- [x] **Step 5: Verificar tipos y tests**

Run: `npx tsc --noEmit`
Run: `npm run test`
Expected: sin errores, sin regresiones.

**Checkpoint — no hacer commit.**

---

### Tarea 6: Configurar reporte de cobertura en Vitest

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json` (scripts)

**Interfaces:** ninguna — configuración, no código de producción.

- [x] **Step 1: Instalar el proveedor de cobertura**

Run: `npm install --save-dev @vitest/coverage-v8`

- [x] **Step 2: Agregar el bloque `coverage` a `vitest.config.ts`**

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: { lines: 0, branches: 0, functions: 0, statements: 0 },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```
(Umbrales en `0` por ahora — se suben en la Tarea 13, verificación final, con el número real que
deje este plan. Subirlos antes bloquearía checkpoints sin necesidad.)

- [x] **Step 3: Agregar script a `package.json`**

```json
"test:coverage": "vitest run --coverage"
```

- [x] **Step 4: Verificar que corre**

Run: `npm run test:coverage`
Expected: genera el reporte (carpeta `coverage/`) sin error de configuración.

**Checkpoint — no hacer commit.**

---

### Tarea 7: Tests de lógica pura en `src/lib/*`

**Files:**
- Test: `tests/lib/api.test.ts` (crear)
- Test: `tests/lib/memCache.test.ts` (crear)
- Test: `tests/lib/format-number.test.ts` (crear, si el archivo existe con ese nombre exacto)

**Interfaces:** ninguna — solo tests sobre código existente, sin tocar producción.

**Contexto verificado:** `src/lib/memCache.ts` ya tiene JSDoc explicando el patrón ("funciona como
una nevera", según la auditoría previa) — usar esa documentación existente para entender el
contrato exacto (`get`/`set`/`invalidatePrefix`) antes de escribir los tests, en vez de adivinar la
API por el nombre.

- [ ] **Step 1: Leer los 3 archivos para confirmar su API pública exacta**

Run: `cat src/lib/api.ts src/lib/memCache.ts src/lib/format-number.ts` (o el nombre real del
archivo de formateo numérico — confirmar con `ls src/lib/`).

- [ ] **Step 2: Escribir tests para `memCache`**

Crear `tests/lib/memCache.test.ts` cubriendo al menos: `set` seguido de `get` devuelve el valor
cacheado antes de que expire el TTL; `get` devuelve `undefined`/`null` tras `invalidatePrefix` con
un prefijo que coincide; `get` sigue devolviendo el valor si `invalidatePrefix` no coincide con la
clave. Usar `vi.useFakeTimers()` si el TTL depende de tiempo real, para no depender de esperas
reales en el test.

- [ ] **Step 3: Escribir tests para el helper de formateo numérico**

Crear el test correspondiente cubriendo: formato con miles/decimales según el patrón real de
`CLAUDE.md` (`'$ ' . number_format(...)` es el patrón del backend — confirmar el equivalente real
en TS antes de escribir las aserciones), y el caso de valor `0`/`null`/`undefined` si la función lo
maneja explícitamente.

- [ ] **Step 4: Escribir tests para las funciones puras de `api.ts` que no dependan de red**

Si `api.ts` mezcla funciones puras (ej. construcción de headers, manejo de CSRF token en memoria)
con las que sí hacen `fetch` real, testear solo las puras aquí; las que hacen red se cubren con
mocks en la Tarea 11 (cuando se elimine el `any` de `apiFetch`).

- [ ] **Step 5: Correr los tests**

Run: `npm run test`
Expected: los nuevos tests pasan, sin afectar los 17 casos existentes.

**Checkpoint — no hacer commit.**

---

### Tarea 8: Tests de hooks compartidos (`useRequireAuth`, `useServerTable`)

**Files:**
- Test: `tests/hooks/useRequireAuth.test.ts` (crear)
- Test: `tests/hooks/useServerTable.test.ts` (crear)

**Interfaces:** ninguna — solo tests.

- [ ] **Step 1: Leer ambos hooks para confirmar su contrato exacto**

Run: `cat src/hooks/useRequireAuth.ts src/hooks/useServerTable.ts`

- [ ] **Step 2: Escribir tests para `useRequireAuth`**

Cubrir al menos: redirige (o marca `isReady`/`isAllowed` según la firma real) cuando no hay usuario
autenticado; permite continuar cuando sí hay usuario; espera la hidratación de Zustand/localStorage
antes de decidir (mencionado en la auditoría de documentación previa) — mockear el store de auth
según corresponda.

- [ ] **Step 3: Escribir tests para `useServerTable`**

Cubrir al menos: carga inicial dispara el fetch con la página/filtro por defecto; cambiar de página
dispara un nuevo fetch con los parámetros correctos; el filtro de estado (`stadeFilter`) se
propaga al fetch. Mockear la función de fetch inyectada, no hacer red real.

- [ ] **Step 4: Correr los tests**

Run: `npm run test`
Expected: todo en verde.

**Checkpoint — no hacer commit.**

---

### Tarea 9: Eliminar `any` en `src/lib/api.ts`

**Files:**
- Modify: `src/lib/api.ts`

**Interfaces:** cambia la firma de `apiFetch` — revisar callers si el genérico por defecto cambia
de comportamiento observable en tipos (no en runtime).

**Contexto verificado:** `apiFetch<T = any>` (línea 52) y un `as any` (línea 78).

- [ ] **Step 1: Cambiar el default del genérico**

```ts
export async function apiFetch<T = unknown>(...)
```
Esto obliga a que cada caller que no especifique `T` reciba `unknown` en vez de `any` — es
intencional: revela en el Step 3 qué callers no estaban tipando su respuesta.

- [ ] **Step 2: Reemplazar el `as any` de la línea 78**

Leer el contexto exacto de esa línea (probablemente un cast sobre el body de la respuesta antes de
parsear JSON) y sustituirlo por un type guard o por el tipo real esperado en ese punto, según lo
que el código haga ahí — no forzar `unknown` si eso rompe una operación necesaria más abajo.

- [ ] **Step 3: Compilar y corregir los callers que queden en rojo**

Run: `npx tsc --noEmit`
Expected: aparecerán errores en callers de `apiFetch(...)` sin genérico explícito, donde el
resultado ahora es `unknown` en vez de `any`. Para cada uno, agregar el genérico explícito con el
tipo real de la respuesta (ej. `apiFetch<ApiAffiliate[]>(...)`) — esto es trabajo real de tipado,
no solo silenciar el error.

- [ ] **Step 4: Correr la suite completa**

Run: `npm run test`
Expected: sin regresiones de comportamiento (solo cambios de tipos).

**Checkpoint — no hacer commit.**

---

### Tarea 10: Eliminar `any` en `src/hooks/useServerTable.ts`

**Files:**
- Modify: `src/hooks/useServerTable.ts`

**Interfaces:** cambia el tipo interno del hook — no debería cambiar su firma pública si ya usa
genéricos (`useServerTable<T>`).

**Contexto verificado:** línea 10, `[key: string]: any` y `Record<string, any>` (probablemente el
tipo de los filtros/query params adicionales que acepta el hook).

- [ ] **Step 1: Leer el uso real de ese índice/record**

Run: `grep -n "any" src/hooks/useServerTable.ts` y leer el contexto de cada ocurrencia.

- [ ] **Step 2: Reemplazar por un tipo más preciso**

Si es un diccionario de query params arbitrarios, `Record<string, string | number | boolean>` es
casi siempre suficiente para filtros de URL (evita `any` sin necesitar tipar cada filtro posible
por módulo). Si algún módulo pasa un valor que no calza (ej. un array), ajustar la unión según lo
que el compilador señale en el Step 3.

- [ ] **Step 3: Compilar y corregir callers**

Run: `npx tsc --noEmit`
Expected: revisar cada módulo que use `useServerTable` con un filtro no cubierto por el nuevo tipo
y ajustar el tipo del hook (no forzar un cast en el caller para silenciar el error).

- [ ] **Step 4: Correr la suite**

Run: `npm run test`
Expected: sin regresiones.

**Checkpoint — no hacer commit.**

---

### Tarea 11: Pasada de JSDoc WHY — `dates.ts` y exports sin documentar

**Files:**
- Modify: `src/lib/dates.ts`
- Modify: `src/services/affiliateService.ts` o su nueva ubicación tras la Tarea 5
- Modify: `src/hooks/useRequireAuth.ts`

**Interfaces:** ninguna — solo documentación.

**Contexto verificado:** `dates.ts` tiene un comentario `//` de 17 líneas explicando la regla de
negocio de vigencia — excede el máximo de 8 líneas de `documentation.md` y no es un bloque JSDoc
formal.

- [ ] **Step 1: Convertir el comentario de `dates.ts` a JSDoc de máximo 8 líneas**

Leer el comentario actual completo, resumir la regla de negocio a lo esencial (qué decide, por qué
se usa fecha local y no UTC) en un bloque `/** ... */` de máximo 8 líneas sobre la función
`addOneYear`. Si el detalle extendido es valioso, moverlo a un comentario inline junto a la línea
específica que lo necesita, no en el header.

- [ ] **Step 2: Agregar JSDoc a los exports públicos de `affiliateService.ts` (o su nueva ubicación)**

Para cada función exportada sin documentación, agregar un bloque JSDoc explicando el WHY solo si
hay una decisión no obvia — si el método es un CRUD directo sin lógica, no forzar un comentario
(`documentation.md`: "si el código es obvio, no lo comentes").

- [ ] **Step 3: Agregar JSDoc a `useRequireAuth.ts`**

Documentar por qué espera la hidratación antes de decidir redirigir (mencionado en la auditoría de
documentación previa como ejemplo ya existente de buen WHY en otro hook — replicar ese nivel de
detalle, no más).

- [ ] **Step 4: Verificar tipos y tests**

Run: `npx tsc --noEmit`
Run: `npm run test`
Expected: sin cambios de comportamiento.

**Checkpoint — no hacer commit.**

---

### Tarea 12: Separar capas en `affiliates/fetch.ts` (domain/application/infrastructure)

**Files:**
- Create: `src/app/4dnn1n/affiliates/types.ts` (capa de dominio: `ApiAffiliate`,
  `CreateAffiliatePayload`, y demás tipos hoy en `fetch.ts`)
- Modify: `src/app/4dnn1n/affiliates/fetch.ts` (queda como capa de aplicación: solo las funciones,
  importando los tipos desde `./types`)
- Modify: todos los archivos del módulo `affiliates` que importan tipos desde `fetch.ts`

**Interfaces:**
- Produce: `src/app/4dnn1n/affiliates/types.ts` con los mismos nombres de tipo ya usados
  (`ApiAffiliate`, `CreateAffiliatePayload`, etc.) — los consumidores actuales que hacen
  `import type { ApiAffiliate } from "./fetch"` deben poder seguir importando desde `./fetch` (que
  re-exporta) o migrar a `./types`, decisión del Step 3.

**Contexto verificado:** `affiliates/fetch.ts` tiene 297 líneas mezclando tipos, llamadas HTTP y
uso de `memCache`. No se transcribió su contenido completo en la investigación previa — el
ejecutor debe leer el archivo real antes de dividirlo.

- [ ] **Step 1: Leer el archivo completo y listar sus tipos vs sus funciones**

Run: `grep -n "^export type\|^export interface\|^export async function\|^export function" src/app/4dnn1n/affiliates/fetch.ts`

- [ ] **Step 2: Mover los tipos a `types.ts`**

Crear `src/app/4dnn1n/affiliates/types.ts` con todos los `export type`/`export interface`
encontrados en el Step 1, tal cual (sin cambiar su forma).

- [ ] **Step 3: Dejar `fetch.ts` como capa de aplicación**

En `fetch.ts`, eliminar las definiciones de tipo movidas y agregar:
```ts
import type { ApiAffiliate, CreateAffiliatePayload /* ...resto */ } from "./types";
export type { ApiAffiliate, CreateAffiliatePayload /* ...resto */ } from "./types";
```
(El re-export mantiene compatibilidad con cualquier consumidor que siga importando desde
`./fetch` — no hace falta tocar esos archivos en esta tarea.)

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores — el re-export desde `fetch.ts` preserva todos los imports existentes.

- [ ] **Step 5: Correr la suite**

Run: `npm run test`
Expected: sin regresiones (incluye el test de `useAffiliateFormState`, que consume tipos de este
módulo).

**Checkpoint — no hacer commit.**

---

### Tarea 13: Separar capas en `appointments/fetch.ts` (domain/application/infrastructure)

**Files:**
- Create: `src/app/4dnn1n/appointments/types.ts`
- Modify: `src/app/4dnn1n/appointments/fetch.ts`

**Interfaces:** mismo patrón exacto de la Tarea 12, aplicado a `appointments`.

- [ ] **Step 1: Leer el archivo completo y listar sus tipos vs sus funciones**

Run: `grep -n "^export type\|^export interface\|^export async function\|^export function" src/app/4dnn1n/appointments/fetch.ts`

- [ ] **Step 2: Mover los tipos a `types.ts`**

Mismo procedimiento que la Tarea 12, Step 2.

- [ ] **Step 3: Dejar `fetch.ts` como capa de aplicación con re-export de tipos**

Mismo procedimiento que la Tarea 12, Step 3.

- [ ] **Step 4: Verificar tipos y tests**

Run: `npx tsc --noEmit`
Run: `npm run test`
Expected: sin errores, sin regresiones.

**Checkpoint — no hacer commit.**

---

### Tarea 14: Verificación final integrada

**Files:** ninguno.

**Interfaces:** consume el resultado combinado de las Tareas 1-13.

- [ ] **Step 1: Suite completa en verde**

Run: `npm run test`
Expected: cero fallos.

- [ ] **Step 2: Tipos limpios**

Run: `npx tsc --noEmit`
Expected: cero errores.

- [ ] **Step 3: Reporte de cobertura final**

Run: `npm run test:coverage`
Expected: cobertura visiblemente mayor que el ~1.7% inicial. Anotar el % real logrado por este
plan — no se espera llegar a 85% con este alcance (el spec ya documenta que cerrar toda la brecha
de testing del frontend es trabajo de varias iteraciones), pero sí debe haber una mejora medible
en `src/lib/`, `src/hooks/`, y los módulos `affiliates`/`appointments`.

- [ ] **Step 4: Confirmar `any`/`as any` restantes**

Run: `grep -rc ": any\|as any" src | awk -F: '{sum+=$2} END {print sum}'`
Expected: número visiblemente menor a los ~64 originales (las Tareas 2, 9 y 10 cubren los casos de
mayor impacto; el resto disperso en `fetch.ts`/componentes no auditados queda documentado como
trabajo pendiente, no oculto).

- [ ] **Step 5: Revisar el diff completo antes de decidir integrar**

```bash
git diff --stat
git diff
```
Expected: cambios concentrados en los archivos de este plan, sin modificaciones accidentales a
`proxy.ts`, `AuthContext.tsx` (ya resuelto en 2026-08-07), ni a los módulos ya eliminados
(carpetas de plantilla).

**Checkpoint final — el usuario decide cuándo y cómo commitear/pushear este conjunto de cambios.**
