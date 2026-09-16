# Retrofit dev-standards — Frontend (frontend-cm) — seguimiento

**Fecha:** 2026-09-16
**Proyecto:** Contacto Médico — Frontend (frontend-cm)
**Tipo:** Spec de seguimiento (insumo para un plan de implementación posterior, no es el plan)
**Skill de referencia:** `.claude/skills/dev-standards/` (actualizado) — mismo skill que el spec
hermano de `api-cm`.
**Spec anterior:** [2026-08-25-retrofit-dev-standards-frontend-design.md](2026-08-25-retrofit-dev-standards-frontend-design.md)

## Resumen y alcance

Desde el spec del 2026-08-25 el proyecto completó la iniciativa de cobertura de tests en 4 fases
(mergeada a `develop`, última pieza el 2026-09-12), además de refactors de unificación (orden de
permission-guards, `apiFetch`/`memCache` compartidos en varios módulos, eliminación de la plantilla
nextadmin sin uso). Este documento es una segunda pasada de auditoría para medir qué quedó resuelto
y qué apareció de nuevo — no repite hallazgos ya cerrados.

**Verificado como resuelto — no se repite aquí:**
- Decisión 0 (migración de tests a carpeta espejo `tests/`) — confirmado, es la convención vigente y
  consistente en todo el repo.
- Hallazgo 1.2 (páginas de plantilla sin uso) — sigue eliminado.
- Hallazgo 2.1 (cobertura ~1.7%) — superado ampliamente por las 4 fases de la iniciativa de
  cobertura; `affiliates/page.tsx` y `appointments/page.tsx` ya delegan su lógica a
  `useServerTable`/`useOptimisticToggle` y tienen tests.
- Hallazgo 0.1 (`useOptimisticToggle` sin migrar en 4 módulos) — el hook sigue existiendo y
  funcionando (revert correcto en `catch`), y ya no se encontró el patrón duplicado viejo en la
  muestra revisada.

**Parcialmente resuelto — matiz importante:**
- Hallazgo 3.1 (JSDoc casi ausente): `useServerTable.ts` y `useOptimisticToggle.ts` **sí tienen**
  un bloque JSDoc `/** */` (verificado leyendo el archivo completo), a diferencia de lo que sugería
  la muestra anterior. El problema que queda no es ausencia total, sino que el JSDoc de
  `useOptimisticToggle.ts` no cubre el comportamiento menos obvio de la función — ver Hallazgo 3
  abajo, con la corrección precisa frente a lo reportado en una primera revisión superficial de esta
  misma ronda.
- Hallazgo 5.1 (`any`/`as any`): bajó en los archivos ya tocados por la iniciativa de cobertura
  (`AuthContext`, `api.ts` core), pero sigue presente y concentrado en los formularios de catálogos
  que no tuvieron ese trabajo — ver Hallazgo 2 abajo.

---

## Hallazgo 1 (Pilar 5 — Calidad de código / Arquitectura): `getDepartments`/`getCitiesByDepartment` duplicados 5 veces

**Archivos (verificado, mismo cuerpo en los 5):**
[affiliates/fetch.ts:77-92](../../../src/app/4dnn1n/affiliates/fetch.ts#L77-L92),
`agreements/fetch.ts:31-45`, `appointments/fetch.ts:124-137`, `counselors/fetch.ts:51-65`,
`franchises/fetch.ts:48-61`.

**Estado actual (verificado):**
```ts
export async function getDepartments(): Promise<Department[]> {
  return memCache.get("departments", TTL_GEO, async () => {
    const res = await apiFetch<ApiResponse<Department[]>>(`/api/departments`);
    return res.data ?? [];
  });
}
```
repetido palabra por palabra en los 5 archivos, junto con su par `getCitiesByDepartment`.

**Por qué es un problema:** `architecture.md` §4 — "Sin dependencias cruzadas entre
módulos/dominios. Si dos dominios necesitan lo mismo, ese código va a una capa compartida explícita
— nunca un import directo de un dominio a otro." Esto ya se manifestó como violación real: `doctors/
_components/DoctorForm.tsx:16` importa `getDepartments`/`getCitiesByDepartment` desde
`"../../counselors/fetch"` — el módulo `doctors` depende de `counselors` porque no existe un lugar
neutral de donde importar.

**Cambio propuesto:** extraer ambas funciones a `src/lib/geo.ts` (o `src/services/geo.ts`, siguiendo
el mismo criterio que `architecture.md` ya usa para `src/hooks/` compartidos: código usado por 2+
módulos va a una capa común explícita). Los 5 `fetch.ts` y `DoctorForm.tsx` pasan a importar desde
ahí. Esto resuelve simultáneamente la duplicación y la dependencia cruzada `doctors` → `counselors`.

**Riesgo:** bajo — es una extracción mecánica de funciones puras ya usadas de forma idéntica en 5
lugares; se mueve, se ajustan los 6 imports, y se corre `npx tsc --noEmit` para confirmar.

---

## Hallazgo 2 (Pilar 5 — Calidad de código): `as any` innecesario en 3 formularios de catálogo

**Archivos (verificado):** `CounselorForm.tsx` (13 ocurrencias, ej. líneas 65-98, 127, 240, 364),
`FranchiseForm.tsx` (líneas 56-64, 162, 319), `AgreementForm.tsx` (líneas 56-58, 75, 137, 174, 229).

**Estado actual (verificado en `CounselorForm.tsx`):**
```ts
const counselorId = Number((initial as any)?.id ?? 0) || undefined;
const initialIdCard = String((initial as any)?.id_card ?? "");
...
lastname: (initial as any)?.lastname ?? "",
```
La prop `initial` ya llega tipada (`Partial<ApiCounselor>` o equivalente) en la firma del
componente — el `as any` es un escape innecesario que rompe `strict` de TypeScript sin necesidad,
ya que el tipo correcto está disponible.

**Por qué es un problema:** `code-quality-checklist.md` — "nunca `any` en TypeScript". Al forzar
`any`, el compilador deja de avisar si un campo se renombra o se elimina del tipo `ApiCounselor` en
el futuro — exactamente el tipo de bug que el tipado estricto existe para prevenir.

**Cambio propuesto:** quitar el `as any` en los tres archivos; si `initial` ya está tipado
correctamente en la firma del componente, el acceso directo (`initial?.id`, `initial?.lastname`)
debería tipar bien sin el cast. También revisar `onSubmit?: (payload: any)` en los tres forms y en
`doctors/[id]/edit/page.tsx:47`, `doctors/new/page.tsx:31`, `specialties/*/page.tsx` — mismo patrón,
reemplazar `any` por el DTO de creación/actualización correspondiente.

**Riesgo:** bajo-medio — quitar un `any` puede revelar un mismatch de tipos real que el compilador
venía ignorando (mismo criterio que el spec anterior aplicó al Hallazgo 5.1 de `api.ts`); se corrige
archivo por archivo, corriendo `npx tsc --noEmit` después de cada uno.

---

## Hallazgo 3 (Pilar 3 — Documentación JSDoc): comportamiento no obvio sin documentar en 2 archivos

### 3.1: `useOptimisticToggle.ts` — el JSDoc existe pero no cubre el `stadeFilter`

**Archivo:** [useOptimisticToggle.ts:23-28](../../../src/hooks/useOptimisticToggle.ts#L23-L28)

**Estado actual (verificado, corrección respecto a una primera lectura superficial):** el hook **sí
tiene** un header JSDoc de 5 líneas explicando el patrón general (confirm → update optimista → API →
revert). Lo que falta es la explicación del bloque líneas 51-54:
```ts
if (opts.stadeFilter !== "all") {
  opts.setData((prev) => prev.filter((x) => x.id !== item.id));
  opts.setMeta((m) => ({ ...m, total: m.total - 1 }));
}
```
que quita la fila de la lista visible (en vez de solo actualizar su estado) cuando hay un filtro de
`stade` activo distinto de "all" — comportamiento no obvio: evita que una fila que ya no matchea el
filtro (ej. se inactivó mientras el filtro mostraba "solo activos") se quede visualmente en la tabla
hasta el siguiente refetch.

**Cambio propuesto:** extender el JSDoc existente (o agregar un comentario inline en ese bloque
específico) explicando ese WHY — sigue el patrón que ya usa `documentation.md` para
"comentarios inline solo para lógica de negocio no obvia".

### 3.2: `getApiErrorMessage.ts` — sin JSDoc y con `err: any`

**Archivo:** [getApiErrorMessage.ts:1](../../../src/lib/getApiErrorMessage.ts#L1)

**Estado actual (verificado):** `export function getApiErrorMessage(err: any)` sin ningún JSDoc. El
archivo maneja 3 formatos de error distintos (`ApiError` propio con `.data`, un formato tipo Axios
con `.response.data`, y un `Error` genérico con `.message`) mediante comentarios `//` sueltos
(`// Our ApiError (fetch)`, `// Axios (in case you use it elsewhere)`) en vez de un header formal.

**Cambio propuesto:** agregar JSDoc explicando por qué existen 3 ramas de parseo (qué caller usa
cada formato), y tipar `err: unknown` con los type guards correspondientes en vez de `any` — mismo
criterio del Hallazgo 2.

---

## Hallazgo 4 (Pilar 2 — Testing): componentes transversales sin test

**Archivos (verificado, sin archivo de test bajo `tests/` correspondiente):**
1. **`src/app/4dnn1n/auth-layout.tsx`** — envuelve TODO el panel `/4dnn1n` (gating de sesión vía
   `useRequireAuth`). Riesgo alto por ser el único guard de acceso a nivel de layout.
2. **`src/components/ui-elements/alert/index.tsx`** y **`src/components/Breadcrumbs/Breadcrumb.tsx`**
   — uso transversal en todo el panel, con lógica de render condicional.

**Hallazgo adicional encontrado al verificar 4.1:** `auth-layout.tsx:13,15` renderiza
`<LoadingOverlay />` sin la prop `message` tanto para `isLoggingOut` como para `loading` — ambos
casos muestran el mismo texto por defecto del componente. El `CLAUDE.md` de este proyecto (sección
Loading Overlay, según memoria de proyecto) documenta mensajes distintos por caso
("Validando sesión…" / "Cerrando sesión…") que no están implementados en el código actual. Esto no
es solo un gap de test — es una discrepancia real entre lo documentado y el comportamiento, que un
test hoy dejaría pasar como "correcto" sin capturar la intención original.

**Cambio propuesto:**
1. Decidir primero si la intención de mensajes distintos sigue vigente (si sí, pasar `message="Cerrando sesión…"` / `message="Validando sesión…"` en cada rama) o si se descarta y se actualiza `CLAUDE.md` para reflejar el comportamiento actual (un solo mensaje genérico).
2. Escribir el test de `auth-layout.tsx` **después** de esa decisión, para que el test valide el
   comportamiento correcto y no congele el bug.
3. Tests de `alert/index.tsx` y `Breadcrumb.tsx` — sin dependencias previas, se pueden hacer en
   paralelo.

---

## Hallazgo 5 (Pilar 1 — Arquitectura): componentes con lógica fuera de hook

### 5.1: `account/page.tsx` (285 líneas) — único módulo del panel sin `_hooks/`

**Archivo:** `src/app/4dnn1n/account/page.tsx` (confirmado, 285 líneas)

**Estado actual:** `updateUsername`/`changePassword` (fetch), validación inline y manejo de errores
de campo por regex de respuesta API viven directo en el componente de página — mismo criterio de
`architecture.md` §3.5 ("un componente solo contiene JSX/props... toda lógica va a un archivo
dedicado") que ya se aplicó en `affiliates` (`useAffiliateFormState`) pero no en este módulo.

**Cambio propuesto:** extraer `useAccountForm` (o `_hooks/useAccountForm.ts`) siguiendo el mismo
patrón ya usado en `affiliates`. Menor prioridad que los Hallazgos 1-4 porque `account` es de bajo
tráfico (un usuario editando su propia cuenta, no un listado con muchos usuarios concurrentes).

### 5.2: `doctors/page.tsx:31-63` — filtros avanzados fuera de hook

**Archivo:** `src/app/4dnn1n/doctors/page.tsx`

**Estado actual:** la carga de `departments`/`specialties`/`cities` y el matching texto→id de
especialidad (`handleSpecialtyChange`) vive en la página en vez de un hook `useDoctorFilters`.

**Cambio propuesto:** extraer a `doctors/_hooks/useDoctorFilters.ts`. Igual prioridad que 5.1 — no
urgente, pero es el mismo tipo de deuda que el estándar pide evitar en módulos nuevos.

---

## Pilar 4 — Dependencias

### Sin hallazgos

`package-lock.json` sigue committeado, un solo gestor (npm), sin regeneración sospechosa. Cumple el
estándar.

---

## Fuera de alcance de este spec

- No se propone adoptar React Query/SWR — sigue fuera de alcance (mismo criterio del spec anterior).
- No se re-evalúa la reestructuración domain/application/infrastructure de `affiliates`/`appointments`
  (Hallazgo 1.1 del spec del 2026-08-25) — sigue siendo una decisión de mayor envergadura que no
  cambió de estado en esta ronda; se puede retomar en un spec dedicado si se decide priorizarla.
- No se re-mide el umbral de cobertura global (`vitest.config.ts` ya tiene `coverage.thresholds`
  desde la iniciativa de 4 fases) — verificar el número actual es tarea del plan de implementación,
  no de este spec de hallazgos cualitativos.

## Siguiente paso

Este documento es el spec de hallazgos de seguimiento. El plan de implementación se escribe en
`docs/superpowers/plans/`, en este orden sugerido: Hallazgo 1 (extraer `geo.ts`, resuelve duplicación
+ dependencia cruzada) primero por ser barato y desbloquear el Hallazgo 2 en `DoctorForm.tsx`; luego
Hallazgo 4.1 (decisión sobre mensajes de `LoadingOverlay` antes de escribir el test de
`auth-layout.tsx`, para no congelar el comportamiento actual como "correcto"); Hallazgo 2 y 3 pueden
ir en paralelo por archivo; Hallazgo 5 queda de menor prioridad, se aborda cuando se toque cada
módulo por otra razón (regla de retrofit incremental de `architecture.md` §5).
