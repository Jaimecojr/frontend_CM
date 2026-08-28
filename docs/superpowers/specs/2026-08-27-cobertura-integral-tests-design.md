# Cobertura Integral de Tests — Spec

**Fecha:** 2026-08-27
**Precede a:** planes de implementación por fase (empezando por
`docs/superpowers/plans/2026-08-27-cobertura-tests-fase-1-affiliates-appointments.md`)

## Contexto

El plan `2026-08-25-retrofit-dev-standards-frontend` cerró las brechas más urgentes de
`dev-standards` (convención de tests, `any` residual, capas domain/application en
`affiliates`/`appointments`) y dejó la cobertura de ~1.7% a ~6.15% líneas, agregando tests solo
para `src/lib/*` (funciones puras) y 2 hooks compartidos (`useRequireAuth`, `useServerTable`). Ese
plan documentó explícitamente que cerrar toda la brecha de testing del frontend era "trabajo de
varias iteraciones" — este spec es esa siguiente iteración.

**Alcance de este spec:** todo `src/` — panel admin (`/4dnn1n`, 12 módulos) y web pública
(`/web`, `src/components/web/`), incluyendo componentes compartidos (`src/components/*`, fuera de
`web/`) y los hooks/lib que quedaron sin cubrir.

**Censo real de archivos** (`.ts`/`.tsx` de producción, sin contar tests):

| Área | Archivos |
|---|---|
| `affiliates` | 11 |
| `appointments` | 9 |
| `agreements` | 7 |
| `counselors` | 8 |
| `franchises` | 8 |
| `doctors` (+ `specialties`) | 14 |
| `membership-forms` | 3 |
| `contacts` | 4 |
| `content` (allies + specialists) | 13 |
| `settings` | 3 |
| `account` | 2 |
| `home` (dashboard) | 11 |
| `src/app/web/*` | 7 |
| `src/components/web/*` | ~10 (incluye `affiliateService.ts`) |
| `src/components/*` (fuera de `web/`) | 74 — mezcla componentes de la librería UI base (botones,
  inputs, tablas genéricas) con componentes propios del proyecto (`LoadingOverlay`, `LegalModal`,
  `SearchableSelect`, `DatePickerWithToday`, `DataTable`) |
| `src/hooks/*` restantes | 7 (algunos ya cubiertos: `useOptimisticToggle`, `useRequireAuth`,
  `useServerTable`) |
| `src/lib/*` restantes | 8 (algunos ya cubiertos: `dates.ts`, `memCache.ts`, `format-number.ts`,
  partes de `api.ts`) |
| **Total** | **204** archivos de producción bajo `src/`, de los cuales ~195 no tienen test propio |

## Objetivo

Que todo archivo bajo `src/` con lógica de negocio o comportamiento en runtime tenga test propio,
siguiendo el árbol de decisión de `dev-standards` (`references/testing.md`):

```
¿El archivo tiene lógica de negocio o comportamiento en runtime?
├─ Sí → escribir tests
└─ No → ¿es utilidad de testing, dato estático o config simple?
    ├─ Sí → no se testea directamente
    └─ No → evaluar según complejidad
```

**No** es objetivo de este spec alcanzar el 100% teórico de cada rama/línea de cada archivo — el
mínimo aceptable de `dev-standards` es 85–90%, y cualquier archivo que se decida dejar por debajo
debe documentarse con la razón (ej. "código de librería de terceros re-exportado sin lógica propia
del proyecto").

## Decisión 1: por qué NO se testea todo `src/components/*` por igual

`src/components/*` (fuera de `web/`) tiene 74 archivos porque el proyecto parte de una plantilla de
admin (`free-nextadmin-nextjs`, ver `package.json`). Muchos de esos archivos son primitivas de UI
(botones, cards, inputs genéricos) sin lógica propia del proyecto — puro JSX + clases de Tailwind,
sin estado, sin efectos, sin decisiones condicionales de negocio. Aplicar el árbol de decisión de
arriba a ciegas produciría tests vacíos ("no revienta al renderizar") que las reglas de
`dev-standards` prohíben explícitamente como anti-patrón ("tests duplicados/triviales que no
verifican comportamiento real").

**Regla operativa para la Fase 4** (que es la que toca esta carpeta): antes de escribir un test,
clasificar cada archivo en:
- **Tiene lógica propia real** (estado, efectos, validación, cálculo condicional, integración con
  hooks/servicios del proyecto) → se testea. Ejemplos ya identificados: `LoadingOverlay` (portal +
  SSR guard), `LegalModal` (portal + scroll lock + Escape/backdrop), `SearchableSelect` (filtrado +
  selección), `DatePickerWithToday` (flatpickr + locale + botón "Hoy"), `DataTable` (paginación,
  filtros, ordenamiento si los maneja internamente).
- **Wrapper puramente presentacional** (recibe props, renderiza JSX, sin lógica condicional de
  negocio) → no se testea directamente; su uso correcto queda cubierto indirectamente por los tests
  de los componentes que lo consumen (page.tsx/forms de las fases 1-3).

Esta clasificación se hace como el primer paso de la Fase 4, no se pre-decide en este spec —
requiere leer cada archivo. El plan de la Fase 4 (cuando se escriba) debe listar el resultado
completo de esa clasificación antes de asignar tareas.

## Decisión 2: fases por riesgo de negocio

Siguiendo `dev-standards` ("priorizar por riesgo — los que más cambian o los que ya causaron bugs en
producción, no por orden alfabético"):

| Fase | Alcance | Justificación |
|---|---|---|
| **1** | `affiliates`, `appointments` | Complejidad de negocio alta (vigencias, renovaciones,
  beneficiarios, comisión / período pending-past, owner calculado, notificación WhatsApp). Ya
  tienen capas `types.ts`/`fetch.ts` separadas (plan 2026-08-25) — la base ya está lista. |
| **2** | `agreements`, `counselors`, `franchises`, `doctors`+`specialties`, `membership-forms`,
  `contacts`, `content` (allies+specialists) | CRUD con catálogos relacionados, sin cálculo de
  negocio complejo. `agreements` incluye el caso especial de `updateAgreementState` (firma
  cambiada en el plan anterior, con verificación manual en navegador todavía pendiente) — un test
  que mockee `apiFetch` y confirme que el payload arma `name`/`amount`/`city_id`/`state` da una red
  de seguridad de regresión, pero no reemplaza la verificación manual contra el backend real. |
| **3** | `settings`, `account`, `home` (dashboard + sus widgets) | Bajo riesgo de negocio, pero el
  dashboard mezcla Server/Client Components de forma particular (ver `CLAUDE.md` — "Client
  Components para datos autenticados") que merece tests dedicados para no romper esa regla sin
  darse cuenta. |
| **4** | Web pública (`src/app/web/*`, `src/components/web/*`) + `src/components/*` restante
  (tras la clasificación de la Decisión 1) + hooks/lib restantes | Menor complejidad de negocio,
  mayor volumen de archivos puramente visuales. Última fase porque tiene el mayor trabajo de
  triaje previo. |

Cada fase es su propio plan de implementación (`docs/superpowers/plans/YYYY-MM-DD-cobertura-tests-fase-N-*.md`),
ejecutado con `superpowers:subagent-driven-development` igual que el plan anterior — un subagente
implementador + un subagente revisor por tarea, ledger de progreso, revisión final de todo el
branch de la fase antes de decidir cómo integrarlo.

## Metodología (aplica a las 4 fases, ya validada en el plan anterior)

- **Ubicación:** carpeta espejo `tests/`, misma ruta que el archivo de origen bajo `src/`
  (`tests/app/4dnn1n/affiliates/fetch.test.ts` para `src/app/4dnn1n/affiliates/fetch.ts`, etc.).
- **Patrón AAA**, nombres `it("descripción del comportamiento en español")` — confirmado como
  convención viva del proyecto incluso después de la migración de comentarios de código a inglés
  (ver `CLAUDE.md` regla 4 y los tests ya existentes).
- **Comentarios en inglés**, sin referenciar documentos internos por nombre (`CLAUDE.md`, specs,
  planes) — deben ser autocontenidos.
- **Mocks tipados** (nunca `any`), factories reutilizables cuando un mismo shape de datos se repite
  entre varios tests del mismo archivo.
- **Por tipo de archivo:**
  - `fetch.ts` → mockear `@/lib/api` (`apiFetch`, `csrf`) y `@/lib/memCache`; verificar URL/método/
    body, invalidación de caché en mutaciones, forma de la respuesta (`data ?? []`, etc.).
  - Hooks propios del módulo → `renderHook` + mocks de sus dependencias (mismo patrón que
    `useAffiliateFormState.test.ts`, `useRequireAuth.test.ts`).
  - `page.tsx` / listados → render completo con `@testing-library/react` + providers reales
    (`AuthContext` cuando aplique), mockeando el módulo `fetch.ts` completo — verificar carga de
    datos, filtros, acciones (crear/editar/eliminar/toggle).
  - Formularios (`XxxForm.tsx`) → validación de campos obligatorios, `canSubmit`, armado del
    payload en modo crear vs. editar, con eventos reales (`fireEvent`/`userEvent`), sin mockear el
    DOM.
  - Componentes compartidos con lógica real → test de comportamiento visible (`screen.getByRole`),
    nunca de detalles de implementación internos.
- **Anti-patrones prohibidos** (ya vigentes): shallow rendering, testear código de librerías
  externas, tests duplicados, re-testear una dependencia ya testeada en quien la consume.

## Umbral de cobertura

Al completar la Fase 4 (última), subir `vitest.config.ts` → `coverage.thresholds` del `{0,0,0,0}`
actual al número real alcanzado, redondeado hacia abajo con un margen razonable (ej. si el resultado
final es 87% líneas, fijar el umbral en 85%) — sirve como piso que impide que la cobertura baje en
el futuro sin que alguien lo note, sin exigir el 100% teórico. Esta decisión se toma en el plan de
la Fase 4 con el número real en mano, no se fija a ciegas en este spec.

## Fuera de alcance de este spec

- Tests end-to-end (Playwright/Cypress) — este spec cubre unit/integration con Vitest + Testing
  Library únicamente, consistente con el stack ya elegido.
- Visual regression / snapshot testing — no mencionado en `dev-standards`, no se introduce aquí.
- Reestructurar código de producción para hacerlo "más testeable" más allá de lo que ya se hizo en
  el plan anterior (capas `types.ts`/`fetch.ts`) — si una fase futura encuentra un archivo
  genuinamente imposible de testear sin refactor, se documenta como hallazgo y se decide caso por
  caso, no se asume de antemano.

## Próximo paso

Escribir el plan de implementación de la **Fase 1** (`affiliates` + `appointments`, ~20 archivos)
usando `superpowers:writing-plans`, y ejecutarlo con `superpowers:subagent-driven-development` en
una rama nueva a partir de `develop` (una vez que la rama `retrofit-dev-standards-frontend` se haya
integrado). Las Fases 2-4 se planifican cuando llegue su turno, con este mismo spec como referencia
de metodología.
