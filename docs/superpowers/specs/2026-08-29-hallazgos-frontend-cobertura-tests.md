# Hallazgos de Funcionamiento — Frontend (detectados al planificar cobertura de tests)

**Fecha:** 2026-08-29
**Origen:** hallazgos documentados por los agentes que redactaron los planes de las 4 fases de
`docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`, al leer el código fuente real
para diseñar los casos de test.

Ninguno de estos ítems se corrige dentro de esos planes — son comportamiento real ya en producción
(o código muerto ya en el repo), capturado como nota al margen mientras se escribían los tests. Este
documento existe para que se revisen y prioricen aparte, cuando el usuario lo decida. No se asume
severidad ni se prescribe una solución para cada uno — eso es parte del triage pendiente.

## Cómo leer este documento

Cada hallazgo indica archivo(s), qué pasa hoy, y en qué plan de fase se detectó (para ver el contexto
completo si hace falta ir al plan original).

---

## 1. Código muerto heredado de la plantilla `free-nextadmin-nextjs`

Confirmado vía Grep de importadores: ningún archivo en `src/` referencia estos componentes. Son
demos/ejemplos de la plantilla base que nunca se conectaron al proyecto real.

- **27 archivos en `src/components/*`** (fuera de `web/`), detectados al clasificar esta carpeta para
  la Fase 4 (tabla completa en
  `docs/superpowers/plans/2026-08-29-cobertura-tests-fase-4-web-shared.md`):
  `CalenderBox/index.tsx`; `FormElements/Checkboxes/CheckboxOne.tsx` a `CheckboxFive.tsx`;
  `FormElements/Switchers/SwitcherOne.tsx` a `SwitcherFour.tsx`;
  `FormElements/DatePicker/DatePickerOne.tsx` y `DatePickerTwo.tsx`; `FormElements/MultiSelect.tsx`;
  `FormElements/radio.tsx`, `FormElements/select.tsx`, `FormElements/switch.tsx`;
  `period-picker.tsx`; y todo el grupo `Tables/*` (`fetch.ts`, `invoice-table.tsx`,
  `top-channels/*`, `top-products/*`) con datos de ejemplo hardcodeados.
- **`src/app/4dnn1n/home/_components/region-labels/index.tsx` + `map.tsx`** — un widget de mapa de
  EE.UU. que nunca se importa desde `home/page.tsx` ni desde ningún otro archivo (detectado al
  planificar la Fase 3).
- **`reorderAllies`/`reorderSpecialists`** en `content/allies/fetch.ts` y
  `content/specialists/fetch.ts` — funciones exportadas y funcionales (confirmado que existen), pero
  sin ningún botón/interacción en la UI real que las invoque (detectado en la Fase 2).

**Decisión pendiente:** el plan de la Fase 4 ya documenta el primer grupo como "sin test, código
muerto" para no bloquear la cobertura con tests vacíos. La limpieza real (borrar estos archivos o
justificar por qué se quedan) es una decisión de producto/arquitectura aparte — sugerida para
después de cerrar la Fase 4, cuando ya no queda ninguna fase de tests pendiente que dependa de ellos.

---

## 2. Inconsistencias y posibles bugs de comportamiento

### 2.1 `counselors` — sin gate de permisos en frontend (Fase 2)
`src/app/4dnn1n/counselors/new/page.tsx`, `[id]/page.tsx` y `[id]/edit/page.tsx` no verifican el rol
del usuario — solo el listado (`page.tsx`) oculta el botón "Crear Asesor". Cualquier usuario
autenticado puede navegar directamente a esas URLs. Los módulos equivalentes (`agreements`,
`franchises`, `doctors`) sí gatean las 3 rutas por rol.

### 2.2 `settings/page.tsx` — sin gate de permisos en frontend (Fase 3)
No hay verificación de rol (`useAuth`/similar) en el componente; el control de "solo super admin"
vive únicamente en el backend (403 en la respuesta). El enlace del sidebar tampoco está condicionado
por rol.

### 2.3 Orden de guards inconsistente entre páginas casi idénticas (Fase 2)
`doctors/[id]/page.tsx` verifica fallo de carga de datos antes que permisos;
`franchises/[id]/edit/page.tsx` verifica permisos antes que el skeleton de carga;
`doctors/specialties/[id]/edit/page.tsx` no tiene chequeo de `authLoading` en absoluto. Son páginas
estructuralmente equivalentes que no siguen un patrón compartido.

### 2.4 `membership-forms` — parámetro `stade` sin uso real (Fase 2)
`getMembershipForms` declara un parámetro `stade` en su tipo pero nunca lo usa al construir el query
string — el filtro que aparenta existir en la firma no filtra nada en la práctica.

### 2.5 `franchises/fetch.ts` no usa `memCache` (Fase 2)
A diferencia de todos los demás módulos "catálogo" de la Fase 2 (`agreements`, `counselors`,
`doctors`, etc.), este archivo no cachea ninguna consulta. Podría ser intencional o un descuido —
vale la pena confirmar.

### 2.6 `content/allies` y `content/specialists` — bypass de `apiFetch` (Fase 2)
Sus `fetch.ts` no usan el wrapper `apiFetch`/`csrf` de `@/lib/api` para crear/actualizar — llaman
`fetch()` crudo con `FormData` y adjuntan `X-XSRF-TOKEN` manualmente vía `getXsrfToken()`. Es el
único lugar del proyecto que resuelve las mutaciones así (probablemente por el manejo de archivos en
`FormData`, pero no reusa nada del cliente HTTP común).

### 2.7 `home/fetch.ts` duplica su propio cliente HTTP (Fase 3)
En vez de reusar `@/lib/api`, define su propio `csrf`/`apiFetch`/`getXsrfToken`, y lanza un objeto
plano `{status, data}` en error en vez de la clase `ApiError` que usa `src/lib/api.ts` en el resto del
proyecto — cualquier `catch` que asuma `ApiError` sobre este módulo se comporta distinto sin avisar.

### 2.8 `tests/lib/api.test.ts` — comentario que apunta a un archivo que no existe (Fase 4)
El archivo tiene el comentario "`csrf()` y `apiFetch()` ... están cubiertos por separado (tests de
red mockeada)" — pero ese archivo de tests de red mockeada **no existe**. `apiFetch` tiene lógica real
no trivial (reintento automático en `419` invalidando el CSRF cacheado, armado condicional de
headers, construcción de `ApiError`) que hoy no tiene ningún test — el comentario es lo único que
sugiere lo contrario. Confirmado leyendo `src/lib/api.ts` y `tests/lib/api.test.ts` directamente.

### 2.9 Endpoints públicos usados por el frontend pero no documentados (Fase 4)
`src/components/web/affiliateService.ts` llama `POST /api/public/affiliate-status` y
`src/components/web/Footer.tsx` llama `GET /api/public/franchises` (confirmados por grep) — ninguno
de los dos aparece en la lista de "Rutas Públicas" del `CLAUDE.md` del backend (`api-cm`). Vale la
pena actualizar esa documentación o confirmar que son rutas intencionales y ya contempladas del lado
del backend.

### 2.10 `guia-medica/page.tsx` — búsqueda sin debounce (Fase 4)
Cada tecla en el buscador dispara un fetch inmediato, a diferencia del `DataTable` del panel admin
(que sí tiene debounce de 300ms).

### 2.11 `appointments/[id]/edit/page.tsx` — `handleSubmit` sin `try/catch` (Fase 1)
Si `updateAppointment` rechaza, la promesa se propaga sin manejar (el `try/finally` de
`AppointmentEditForm.handleSubmit` solo resetea `saving`, no atrapa el error) — a diferencia de
`affiliates/[id]/edit/page.tsx`, que sí maneja el error con `alert.error(...)`.

### 2.12 `affiliates` — botón de `onAddNote` comentado en `columns.tsx` (Fase 1)
El wiring hacia `NoteModal` existe en `affiliates/page.tsx`, pero el botón que debería dispararlo
desde la tabla está comentado en `columns.tsx` — hoy no hay forma de abrir el modal de nueva nota
desde la UI real.

### 2.13 `agreements` — firma distinta de `updateAgreementState` + lookup silencioso (Fase 2)
A diferencia del resto de módulos (`update*State(id, state)`), esta función recibe la entidad
completa y reconstruye el payload. Además, `agreements/page.tsx` busca el registro con
`dataRef.current.find(...)` contra la página actualmente cargada en memoria — si el ítem no está en
esa página (por ejemplo, tras un cambio de filtro), la actualización falla silenciosamente en vez de
recargar la lista o avisar al usuario.

---

## Siguiente paso sugerido

Triage manual de cada punto: decidir cuáles ameritan un fix (y de qué tamaño), cuáles son
intencionales y solo faltaba documentarlos, y cuáles se dejan así a propósito. Ninguno de los 4 planes
de cobertura de tests (`docs/superpowers/plans/2026-08-28-cobertura-tests-fase-1-*.md` y
`2026-08-29-cobertura-tests-fase-{2,3,4}-*.md`) depende de que esto se resuelva primero.
