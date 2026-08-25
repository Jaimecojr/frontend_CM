# Revisión de arquitectura y buenas prácticas — Frontend (frontend-cm)

**Fecha:** 2026-08-07
**Proyecto:** Contacto Médico — Frontend (frontend-cm)
**Tipo:** Spec de hallazgos (insumo para un plan de implementación posterior, no es el plan)

## Resumen

Auditoría de diseño de código (SOLID aplicado a React, separación de responsabilidades, type-safety) sobre el frontend, aparte de la revisión de rendimiento ya resuelta. No se reportan aquí las decisiones ya documentadas como deliberadas en `CLAUDE.md` (duplicación intencional de `csrf()`/`apiFetch()` entre `lib/api.ts` y cada `fetch.ts` de módulo, `memCache` con invalidación manual por prefijo, middleware `proxy.ts` con `auth_hint`).

## Convención: dónde viven los hooks nuevos que salgan de este spec

Varios hallazgos proponen extraer hooks. Regla a seguir (consistente con el patrón ya existente de `_components/` colocado por módulo):

- **Un solo módulo lo usa → colocado dentro del módulo**, en una carpeta `_hooks/` hermana de `_components/` (ej. `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts`).
- **Lo usan 2 o más módulos → va en `src/hooks/`** (el mismo lugar donde ya viven `useRequireAuth`, `useServerTable`, `useClientTable` — hooks genuinamente transversales). No colocarlo en el primer módulo que lo necesitó "porque fue el primero" — eso es arbitrario y difícil de encontrar para el resto de módulos que lo consumen después.

Esta regla aplica a los hallazgos #1 y #2 de abajo, y a cualquier hook nuevo que salga del plan de implementación.

---

## 1. `AffiliateForm.tsx` mezcla 5 responsabilidades en un solo archivo de 961 líneas

**Archivo:** [src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx](../../../src/app/4dnn1n/affiliates/_components/AffiliateForm.tsx)

**Estado actual (verificado):** en el mismo archivo conviven fetch de catálogos (departamentos/ciudades/convenios), cálculo de fechas de negocio (vigencia a un año), validación async de cédula contra la API, construcción del payload con reglas de renovación, y ~500 líneas de JSX. Además, el punto de mayor riesgo de negocio es el menos tipado del sistema:
```ts
// línea 32
onSubmit?: (payload: any) => Promise<void>;
// línea 365
const payload: any = { ... }
```

**Por qué es un problema:** este es el formulario que maneja dinero, vigencias y renovaciones — el módulo con más reglas de negocio del panel. Un cambio en la regla de "sumar un año a la vigencia" obliga a tocar el mismo archivo que renderiza los inputs, con 961 líneas de contexto alrededor y sin tipos que avisen si el payload quedó mal armado.

**Cambio propuesto:** extraer la lógica no-visual a hooks/helpers puros:
- `src/lib/dates.ts` (o similar) para `addOneYear`, `getTodayString` y cualquier cálculo de fecha de negocio — son funciones puras, fáciles de testear de forma aislada.
- Un hook `useAffiliateFormState` en `src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts` (colocado — solo lo usa este módulo) que encapsule estado, validación async y construcción del payload, dejando el componente con solo JSX + el hook.
- Tipar el payload con la interfaz ya existente en `affiliates/fetch.ts` en vez de `any`.

**Riesgo:** medio — es el formulario más usado del panel, cualquier refactor necesita probarse contra los flujos de creación, edición y renovación antes de mergear.

---

## 2. Patrón "toggle de estado optimista" duplicado en ~9 módulos

**Evidencia verificada:** `grep -rln "setData((prev)" src/app/4dnn1n` → 11 archivos.

**Estado actual:** el flujo `alert.confirm()` → actualizar estado local de forma optimista → `apiFetch` → revertir en el `catch` si falla, está repetido casi idéntico en `affiliates/page.tsx`, `doctors/page.tsx` y el resto de módulos con toggle de estado. Solo cambia el campo (`stade` vs `state`) y los textos del modal de confirmación.

**Por qué es un problema:** a diferencia de la duplicación de `csrf()`/`apiFetch()` (esa sí está documentada como intencional en `CLAUDE.md`), esta no tiene ninguna nota de que sea a propósito — es simplemente el mismo bloque copiado. Si aparece un bug en la lógica de revert (ej. una condición de carrera si el usuario hace doble clic), corregirlo en un módulo no lo corrige en los otros 10.

**Cambio propuesto:** un hook `useOptimisticToggle(items, setData, updateFn, field)` en `src/hooks/useOptimisticToggle.ts` (compartido — lo consumen ~9 módulos, no tiene sentido colocarlo dentro de uno solo) que encapsule el patrón completo (confirmar → optimista → revertir en catch), parametrizado por el campo a cambiar y la función de update a llamar.

**Riesgo:** bajo — es una extracción de un patrón ya estable y probado en producción en varios módulos; el riesgo principal es de regresión mecánica (hay que probar cada módulo migrado, uno por uno).

---

## 3. Tipos `Department`/`City` redefinidos en 11 archivos distintos

**Evidencia verificada:** aparecen definiciones o usos de tipo `Department`/`City` en 11 archivos: `affiliates/fetch.ts`, `affiliates/_components/AffiliateForm.tsx`, `doctors/page.tsx`, `franchises/_components/FranchiseForm.tsx`, `counselors/_components/CounselorForm.tsx`, `appointments/fetch.ts`, `agreements/fetch.ts`, `counselors/fetch.ts`, `doctors/_components/DoctorForm.tsx`, `agreements/_components/AgreementForm.tsx`, `franchises/fetch.ts`. Algunos módulos redefinen el tipo localmente; `doctors/page.tsx`, en cambio, lo importa desde `counselors/fetch.ts` — no hay un criterio uniforme.

**Por qué es un problema:** son datos geográficos (nunca cambian, según el propio `CLAUDE.md` de performance — por eso tienen TTL largo en `memCache`), pero su *tipo* no tiene una única fuente de verdad. Si el backend agrega un campo a `City` (ej. un código DANE), hay que encontrar y actualizar N definiciones, con riesgo de que alguna quede desincronizada.

**Cambio propuesto:** mover `Department`/`City` a `src/types/geo.ts` (o similar) y que todos los módulos importen de ahí.

**Riesgo:** bajo — es un cambio de tipos, el compilador de TypeScript señala cualquier import roto.

---

## 4. `AuthContext.user` tipado como `any`

**Archivo:** [src/context/AuthContext.tsx:8,18](../../../src/context/AuthContext.tsx#L8-L18)

**Estado actual (verificado):**
```ts
interface AuthContextType {
  user: any;   // línea 8
  ...
}
...
const [user, setUser] = useState<any>(null);  // línea 18
```

**Por qué es un problema:** `useAuth().user` es el contexto más consumido del panel — el control de acceso de casi todos los módulos depende de `user?.type === 1` (ver `stade`/RBAC en `CLAUDE.md`). Con `any`, un typo como `user?.tyep === 1` no lo marca el compilador ni el editor, y solo se descubre en runtime (o ni se descubre, si el caso nunca se prueba manualmente).

**Cambio propuesto:**
```ts
interface AuthUser {
  id: number;
  type: number;
  name: string;
  // ... resto de campos que devuelve GET /user
}
```
y usar `AuthUser | null` en el contexto.

**Riesgo:** bajo — cambio de tipos puro; TypeScript señala cualquier acceso a un campo que no exista.

---

## 5. Cero tests automatizados en todo el frontend

**Evidencia:** no hay archivos `*.test.ts(x)`, carpetas `__tests__`, ni configuración de Jest/Vitest en el proyecto (fuera de `node_modules`).

**Por qué es un problema:** la lógica de negocio pura que sí existe (cálculo de fechas de vigencia/renovación en `AffiliateForm.tsx`, normalización de payloads) es fácilmente testeable de forma aislada una vez extraída (ver hallazgo #1), pero hoy no hay ninguna red de seguridad — un cambio en `addOneYear` solo se detecta probando manualmente el formulario de afiliados.

**Cambio propuesto:** no es "agregar tests a todo el frontend" — para un panel administrativo de este tamaño, tests end-to-end de cada pantalla sería sobre-inversión. Empezar por tests unitarios de las funciones puras que se extraigan del hallazgo #1 (fechas, construcción de payload), que son las de mayor riesgo de negocio y las más baratas de testear.

**Riesgo:** ninguno — es pura adición, no toca comportamiento existente.

---

## Fuera de alcance de este spec

- No se reevalúa el rendimiento (ya resuelto: `auth_hint`, `memCache`).
- No se propone adoptar React Query/SWR ni ninguna librería de data-fetching nueva — es un cambio de mayor alcance que merece su propia discusión (ver también la pregunta sobre Server Components, tratada aparte).
- No se propone tocar `useServerTable`/`useClientTable` — ya son hooks compartidos bien diseñados, no boilerplate copiado.

## Siguiente paso

Este documento es el spec de hallazgos. El plan de implementación (orden de ejecución, qué se hace en qué PR, cómo se prueba cada paso) se escribe en un documento separado en `docs/superpowers/plans/`.
