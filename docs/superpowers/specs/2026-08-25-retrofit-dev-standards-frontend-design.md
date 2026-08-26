# Retrofit completo dev-standards — Frontend (frontend-cm)

**Fecha:** 2026-08-25
**Proyecto:** Contacto Médico — Frontend (frontend-cm)
**Tipo:** Spec de retrofit completo (insumo para un plan de implementación posterior, no es el plan)
**Skill de referencia:** `.claude/skills/dev-standards/` (mismo skill que el spec hermano de
`api-cm`) — cada hallazgo cita la sección exacta de `references/` que aplica.

## Resumen y alcance

El proyecto **no está en producción todavía**, así que este retrofit no sigue el modo incremental
por defecto de `dev-standards` — decisión explícita del usuario: aplicar el estándar completo
ahora, mientras es barato.

**No se repiten aquí los hallazgos ya resueltos** por `2026-08-07-revision-arquitectura-frontend`
(spec/plan previos, commit `6b66cce` y siguientes). Aquel spec fue deliberadamente acotado ("no es
agregar tests a todo el frontend") — ese límite queda **superado** por la decisión de retrofit
completo de este documento, pero lo que sí se hizo no se repite:
- `src/lib/dates.ts` con `addOneYear`/`getTodayString` extraídos de `AffiliateForm.tsx`.
- Hook `useOptimisticToggle` (compartido, `src/hooks/`) reemplazando el patrón duplicado en ~9
  módulos.
- `src/types/geo.ts` como fuente única de `Department`/`City`.
- `AuthContext.user` tipado con `interface AuthUser` (ya no `any`).
- Hook `useAffiliateFormState` (colocado en `affiliates/_hooks/`) extraído de `AffiliateForm.tsx`.
- Vitest + Testing Library instalados, con 4 tests iniciales.

Este spec cubre lo que **queda** de los 5 pilares con alcance completo.

**Verificación de lo "ya resuelto":** antes de excluirlo de este spec, se auditó con evidencia de
código (no solo confiando en el commit) que los 5 cambios de la lista anterior funcionan
correctamente. 3 de 5 quedaron completos (`dates.ts`, `types/geo.ts`, `AuthContext.tsx`); 2 quedaron
**parcialmente** hechos — ver Hallazgo 0.1.

---

## Hallazgo 0.1: migración de `useOptimisticToggle` incompleta — 4 módulos siguen con el patrón viejo duplicado

**Evidencia verificada:** el hook `src/hooks/useOptimisticToggle.ts` existe, funciona bien (revert
correcto en `catch`), y sí lo usan `affiliates/page.tsx` y `doctors/page.tsx`. Pero el hallazgo
original decía "~9 módulos con el patrón duplicado" y solo esos 2 fueron migrados — el patrón
viejo completo (confirmar → `setData` optimista → `updateFn` → catch con revert), prácticamente
idéntico byte a byte al que el hook debía reemplazar, sigue sin migrar en:
- `src/app/4dnn1n/agreements/page.tsx` (función `onToggleState`)
- `src/app/4dnn1n/counselors/page.tsx`
- `src/app/4dnn1n/franchises/page.tsx`
- `src/app/4dnn1n/doctors/specialties/page.tsx`

**Por qué es un problema:** es exactamente el riesgo que motivó el hallazgo original — un bug en la
lógica de revert corregido en un módulo no se corrige en los otros 4 porque el código no está
compartido, solo se copió una vez más.

**Cambio propuesto:** migrar los 4 módulos restantes a `useOptimisticToggle`, mismo patrón ya
usado en `affiliates`/`doctors`.

**Riesgo:** bajo — es una extracción mecánica ya probada en 2 módulos; se migra uno por uno,
probando cada toggle manualmente (o con el test correspondiente del Hallazgo 2.1) antes de seguir
con el siguiente.

### Hallazgo 0.2: `any` residual en `useAffiliateFormState.ts`

**Archivo:** [src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts](../../../src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.ts) línea 41

**Estado actual:** `function FormNumber(val: any, def: number)` — los dos `any` que el hallazgo
original citaba explícitamente (`onSubmit`, `payload`) sí se corrigieron, pero este helper interno
de formateo numérico quedó fuera del alcance de esa migración y no se corrigió.

**Cambio propuesto:** tipar `val` como `unknown` con un type guard (`typeof val === "number"` /
`typeof val === "string"`), consistente con el resto de la regla de tipado estricto del pilar 5.

**Riesgo:** bajo — es un helper pequeño, aislado, con uso acotado dentro del mismo archivo.

---

## Decisión 0 — Cambio de convención de tests: colocación → carpeta espejo

**Estado actual:** los 4 tests existentes están colocados junto al archivo que prueban
(`src/lib/dates.test.ts`, `src/hooks/useOptimisticToggle.test.ts`,
`src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts`, `src/test/setup-smoke.test.tsx`).
Es una convención válida según `testing.md`, y hasta ahora era consistente (no mezclada).

**Decisión explícita del usuario para este retrofit:** cambiar a **carpeta espejo** — un directorio
`tests/` en la raíz que replica la estructura de `src/`, como en el proyecto Next.js de referencia
de `dev-standards` (`testing.md`, sección "Opción recomendada: carpeta espejo").

**Cambio concreto:**
```
src/lib/dates.test.ts                                          → tests/lib/dates.test.ts
src/hooks/useOptimisticToggle.test.ts                          → tests/hooks/useOptimisticToggle.test.ts
src/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts → tests/app/4dnn1n/affiliates/_hooks/useAffiliateFormState.test.ts
src/test/setup-smoke.test.tsx                                  → evaluar: es un smoke test del entorno
                                                                  de test, no de un archivo de src/ —
                                                                  se queda en tests/setup-smoke.test.tsx
                                                                  sin ruta espejo (no tiene un "original"
                                                                  en src/ que reflejar).
```

**Impacto en configuración:** `vitest.config.ts` no declara `include` explícito hoy (usa el default
de Vitest, `**/*.{test,spec}.*`), así que **no requiere cambio** para que los tests bajo `tests/`
se sigan descubriendo. Verificar tras la migración con `npm run test` que los 4 tests corren desde
la nueva ruta.

**Riesgo:** bajo — es mover 4 archivos y ajustar sus imports relativos (`../../src/lib/dates` en vez
de `./dates`); cada uno se corre inmediatamente después de mover para confirmar que sigue en verde.

---

## Pilar 1 — Arquitectura (`references/architecture.md`)

### Hallazgo 1.1: Sin capas domain/application/infrastructure en ningún módulo

**Evidencia:** 19 carpetas bajo `src/app/4dnn1n/`: `account`, `affiliates`, `agreements`,
`appointments`, `calendar`, `charts`, `contacts`, `content`, `counselors`, `doctors`, `forms`,
`franchises`, `home`, `membership-forms`, `pages`, `profile`, `settings`, `tables`, `ui-elements`.
Cada módulo con lógica real mezcla en `fetch.ts` tipos de dominio + llamadas HTTP + caché en un solo
archivo (ej. `affiliates/fetch.ts`, 297 líneas).

**Cambio propuesto — solo para módulos con complejidad real** (criterio de `architecture.md` §3,
no aplicar a los 6 catálogos triviales de la Decisión 0.1 más abajo):

| Módulo | Complejidad de negocio | Capas a introducir |
|---|---|---|
| `affiliates` | Alta (vigencias, renovaciones, beneficiarios, comisión) | domain (tipos `Affiliate`, `Beneficiary`) / application (`affiliateService.ts` con las funciones hoy en `fetch.ts`) / infrastructure (cliente HTTP concreto) |
| `appointments` | Alta (period pending/past, owner calculado) | mismo esquema |
| `renovations` (si existe como módulo propio) / lo relacionado a afiliados | Alta | integrar con `affiliates` |
| `doctors`, `counselors`, `agreements`, `franchises`, `membership-forms`, `contacts` | Media (CRUD con catálogos relacionados, sin cálculo de negocio) | estructura estándar de Next.js — **no** forzar domain/application/infrastructure completos, un `fetch.ts` con tipos+HTTP separados (dos archivos, no tres capas) es suficiente |
| `settings`, `account`, `profile` | Baja | sin cambios estructurales |

**Cambio propuesto — consolidar `src/services/` vs `fetch.ts` por módulo:** hoy coexisten
`src/services/affiliateService.ts` + `src/app/4dnn1n/affiliates/fetch.ts` sin criterio de cuál usar.
Decisión: `fetch.ts` de cada módulo es la capa de aplicación del módulo (ya sigue el patrón de
Screaming Architecture por ruta); `src/services/` se elimina y su contenido se mueve dentro del
módulo correspondiente, salvo que un servicio sea usado por 2+ módulos (en cuyo caso se queda en
`src/services/` como capa compartida explícita — mismo criterio que ya usa el spec del 2026-08-07
para hooks en `src/hooks/`).

**Riesgo:** medio-alto en `affiliates`/`appointments` (son los módulos de mayor tráfico); bajo en el
resto. Se hace módulo por módulo, con tests del pilar 2 escritos **antes** de reestructurar cada uno
(no después) para tener red de seguridad durante el movimiento de código.

### Hallazgo 1.2 (RESUELTO): carpetas de plantilla sin uso real de negocio — eliminadas

**Evidencia verificada:** `calendar/`, `tables/`, `ui-elements/` (alerts/buttons), `forms/`
(form-elements/form-layout con sign-in/sign-up/contact forms genéricos), `pages/settings` (con
`personal-info`/`upload-photo` de plantilla — **no** el módulo real `src/app/4dnn1n/settings/`, que
sí tiene `fetch.ts` y lógica de negocio real y se mantiene intacto), `profile/` (datos hardcodeados:
"Danish Heilium", contador de seguidores falso, texto Lorem ipsum) y `charts/basic-chart/` (gráficas
"Campaign Visitors"/"Used Devices" con datos fake de `src/services/charts.services.ts`, sin relación
con el dashboard real de Contacto Médico en `home/`) eran todas páginas demo del template de admin
base, aunque seguían enlazadas activamente desde el sidebar (`src/components/Layouts/sidebar/data/index.ts`).

**Confirmado con el usuario:** eran ejemplos dejados "por si se necesitaban", sin uso real. Se
eliminaron en esta sesión, junto con sus componentes exclusivos (`src/components/Charts/`,
`src/services/charts.services.ts`, `src/utils/timeframe-extractor.ts` — verificado que ningún otro
archivo del proyecto los importaba) y sus 7 entradas de sidebar (Calendar, Profile, Forms, Tables,
Pages, Charts, UI Elements). `npx tsc --noEmit` corrió limpio tras el borrado, confirmando que nada
del código real dependía de estos archivos.

**Impacto:** reduce el universo real de archivos a retrofitear (deja de contar ~25 archivos de
plantilla sin relación con el producto) antes de medir cobertura o planear el Hallazgo 1.1.

---

## Pilar 2 — Testing (`references/testing.md`)

### Hallazgo 2.1: ~1.7% de cobertura (4 de 229 archivos)

**Evidencia:** framework ya instalado y configurado correctamente (Vitest + Testing Library,
`vitest.config.ts`/`vitest.setup.ts` presentes, scripts `test`/`test:watch` en `package.json`) — el
problema es solo volumen de tests escritos, no configuración.

**Cambio propuesto — orden de prioridad** (`testing.md`: "qué SÍ se testea" primero lógica de
negocio y hooks, luego componentes de UI):

1. **Lógica pura sin JSX** (la más barata y de mayor ROI): funciones en `src/lib/*` no cubiertas
   aún (`api.ts`, `memCache.ts`, `format-number.ts`, `format-message-time.ts`, `alert.ts`).
2. **Hooks compartidos** sin test: `useRequireAuth`, `useServerTable`, `useClientTable` (si existe).
3. **`fetch.ts`/capa de aplicación por módulo** una vez separada del Hallazgo 1.1 — testear con
   mocks de HTTP, sin red real.
4. **Componentes con lógica de negocio real**, no solo presentación: `AffiliateForm.tsx` (tras
   Hallazgo 1.1, con el hook ya extraído esto es testear el hook + el render del formulario por
   separado), `page.tsx` de `affiliates`/`appointments`/`doctors` (toggle optimista, filtros).
5. **Componentes de UI pura** (presentación sin lógica): prioridad más baja — `testing.md` permite
   cobertura menor aquí frente a lógica de negocio.

**No se testean** (regla de `testing.md` "qué NO se testea", aplicada explícitamente): `fetch.ts`
si queda reducido a solo tipos + llamada HTTP directa sin transformación, archivos de configuración
(`vitest.config.ts`, `next.config.ts`), barrel files si existen.

### Hallazgo 2.2: Sin configuración de reporte de cobertura

**Estado actual:** `vitest.config.ts` no tiene bloque `coverage`.

**Cambio propuesto:** agregar `@vitest/coverage-v8` (o `istanbul`) como dependencia de desarrollo y:
```ts
test: {
  // ...existente
  coverage: {
    provider: "v8",
    reporter: ["text", "html"],
    thresholds: { lines: 85, branches: 85, functions: 85, statements: 85 },
  },
},
```
y un script `"test:coverage": "vitest run --coverage"` en `package.json`. El umbral de 85% se activa
como gate una vez que el Hallazgo 2.1 avance lo suficiente — no antes, para no bloquear commits
válidos mientras la cobertura sube gradualmente módulo por módulo.

---

## Pilar 3 — Documentación JSDoc (`references/documentation.md`)

### Hallazgo 3.1: JSDoc casi ausente, y cuando existe no sigue el formato `/** */`

**Evidencia verificada:** de 8 archivos muestreados, solo 3 tienen algo de documentación real
(`useServerTable.ts`, `useOptimisticToggle.ts`, `memCache.ts`), y el más rico en contexto de negocio
(`src/lib/dates.ts`) usa un comentario `//` de 17 líneas — no un bloque JSDoc `/** */`, y excede el
máximo de 8 líneas de `documentation.md` por mucho.

**Cambio propuesto:**
1. Convertir el comentario de `dates.ts` a JSDoc formal, recortado a máximo 8 líneas (mover el
   detalle extenso de la regla de negocio a un enlace al spec/CLAUDE.md si no cabe, según
   `documentation.md` permite un `@see` "absolutamente crítico para entender el código").
2. Pasada de JSDoc sobre exports públicos sin documentación: `affiliateService.ts`,
   `useRequireAuth.ts`, `fetch.ts` de cada módulo (priorizar funciones con lógica, no getters
   triviales).

### Hallazgo 3.2: Idioma — español, no inglés (excepción documentada, no un hallazgo a corregir)

Igual que el spec hermano de `api-cm`: el 100% de los comentarios existentes en este frontend están
en español, de forma consistente. **Decisión:** se mantiene español como convención del proyecto —
no se traduce nada existente ni se exige inglés en código nuevo. Se documenta la excepción para que
el plan de implementación no la contradiga.

---

## Pilar 4 — Dependencias (`references/dependency-management.md`)

### Sin hallazgos

`package-lock.json` committeado, un solo gestor (npm), sin `yarn.lock`/`pnpm-lock.yaml`
simultáneos, sin regeneración sospechosa en el historial. Cumple el estándar.

---

## Pilar 5 — Calidad de código (`references/code-quality-checklist.md`)

### Hallazgo 5.1: ~64 usos de `any`/`as any` restantes

**Evidencia verificada:** 24 `: any` + 40 `as any` en `src/`. El pase del 2026-08-07 ya cubrió
`AuthContext.user`; quedan (verificados con ejemplo concreto): `src/lib/api.ts` (`apiFetch<T = any>`
línea 52, `as any` línea 78), `src/hooks/useServerTable.ts` (`[key: string]: any` y
`Record<string, any>`, línea 10), y el resto disperso en `fetch.ts`/componentes no auditados en la
muestra.

**Cambio propuesto:** archivo por archivo, reemplazar por `unknown` + type guards, o por el tipo de
dominio correcto una vez exista (ej. tras el Hallazgo 1.1, `apiFetch<T>` debería recibir el tipo de
respuesta real del endpoint en vez de defaultear a `any`). `tsconfig.json` ya tiene `strict: true` —
no requiere cambio de configuración, solo eliminar los escapes puntuales.

**Riesgo:** bajo-medio — cada `any` eliminado puede revelar un mismatch de tipos real que el
compilador venía ignorando; se corrige uno por uno, corriendo `npm run build`/`tsc --noEmit` tras
cada archivo.

---

## Fuera de alcance de este spec

- No se reevalúa nada ya resuelto por el spec/plan de arquitectura del 2026-08-07 (ver Resumen).
- No se propone adoptar React Query/SWR — sigue fuera de alcance, es una decisión de mayor
  envergadura que merece su propia discusión (mismo criterio que el spec previo).
- El Hallazgo 1.2 (páginas de plantilla) ya se resolvió durante la redacción de este spec — ver
  arriba.

## Siguiente paso

Este documento es el spec de hallazgos. El plan de implementación se escribe en un documento
separado en `docs/superpowers/plans/`, en este orden: Decisión 0 (migración de tests a carpeta
espejo) y Hallazgo 1.2 (confirmar/eliminar páginas de plantilla) primero — son prerequisitos baratos
que afectan el alcance de todo lo demás — luego Hallazgo 2.1 (tests) módulo por módulo antes de
reestructurar ese módulo (Hallazgo 1.1), y el pilar 5 (tipado) en paralelo a medida que cada archivo
ya tiene test.
