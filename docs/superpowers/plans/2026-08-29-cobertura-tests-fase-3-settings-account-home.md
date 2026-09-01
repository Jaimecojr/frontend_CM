# Cobertura de Tests — Fase 3 (settings + account + home) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tests a los 16 archivos sin cobertura de los módulos `settings`, `account` y `home`
(dashboard + sus widgets), siguiendo la metodología validada en las Fases 1-2 y documentada en el
spec de esta iniciativa, incluyendo una verificación explícita y automatizada de la regla
arquitectónica "Client Components para datos autenticados" del dashboard.

**Architecture:** 12 tareas independientes, agrupadas por módulo. `settings` primero (singleton más
simple: `fetch.ts` → `SettingForm.tsx` → `page.tsx`), luego `account` (`fetch.ts` → `page.tsx`, dos
secciones independientes en el mismo archivo), y por último `home` — el módulo más grande: primero
`fetch.ts` (que NO reutiliza `@/lib/api`, sino que reimplementa su propio cliente HTTP — ver Tarea 6),
luego cada widget cliente en el orden en que aparecen en `page.tsx` (`stats-cards`,
`expiring-today-card`, `today-appointments-card`, `charts-section`), luego `region-labels` (hallazgo
de código muerto, sin tests), y por último `page.tsx`, que es donde se verifica la regla
Server/Client Components de forma concreta y automatizada.

**Tech Stack:** Vitest + Testing Library (`@testing-library/react`), ya configurado. Carpeta espejo
`tests/`.

**Spec:** `docs/superpowers/specs/2026-08-27-cobertura-integral-tests-design.md`

## Global Constraints

- **Ubicación:** carpeta espejo `tests/`, misma ruta que el archivo de origen (ej.
  `tests/app/4dnn1n/settings/fetch.test.ts`).
- **Comentarios en inglés**, sin referenciar documentos internos por nombre. `describe()`/`it()` en
  **español**, patrón AAA.
- **Mocks tipados**, nunca `any` salvo en el propio cast del mock (`(alert.confirm as any).mockImplementation(...)`).
- **Mockear módulos por su alias `@/...`, no por ruta relativa** — es el patrón real usado en los
  tests ya existentes de las Fases 1-2 (ej. `vi.mock("@/app/4dnn1n/affiliates/fetch", ...)` dentro de
  `tests/app/4dnn1n/affiliates/page.test.tsx`), incluso cuando el archivo de producción importa con
  ruta relativa (`./fetch`) — Vitest resuelve el mock por el módulo final, no por el string literal
  del import.
- **Patrón de mock para `@/lib/alert`:**
  ```ts
  vi.mock("@/lib/alert", () => ({
    alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  }));
  ```
- **Patrón de mock para `@/context/AuthContext`:**
  ```ts
  vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
  (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 }, loading: false, isLoggingOut: false, refreshUser: vi.fn(), logoutUser: vi.fn() });
  ```
- **Patrón de mock para `next/navigation`:** `vi.mock("next/navigation", () => ({ useRouter: vi.fn() }))` — `account/page.tsx` es el único archivo de esta fase que lo usa (solo `useRouter`, sin `useParams`/`useSearchParams`).
- **`getApiErrorMessage` NO se mockea** — es un util puro (`src/lib/getApiErrorMessage.ts`), ya
  cubierto conceptualmente al usarse tal cual en las aserciones (`getApiErrorMessage(err)`), igual
  que en las Fases 1-2.
- **No hay `DataTable` en esta fase** — ninguno de los 3 módulos usa tablas paginadas ni catálogos en
  tabla, así que el stub de `DataTable` de las Fases 1-2 no aplica aquí.
- **Componentes `*-skeleton.tsx`:** se verifican por lectura antes de decidir. Los 3 de esta fase
  (`stats-cards-skeleton.tsx`, `expiring-today-card-skeleton.tsx`, `today-appointments-card-skeleton.tsx`)
  son confirmadamente puramente presentacionales — sin props, sin condicionales, solo arreglos fijos
  de `<Skeleton>` de `@/components/ui/skeleton` (componente compartido, fuera de alcance, se testea en
  la Fase 4). **Decisión:** no se testean directamente; su renderizado correcto se verifica
  indirectamente en el test del widget que los consume (verificando que aparecen mientras
  `loading === true` y desaparecen al resolver).
- `npm run test` y `npx tsc --noEmit` limpios después de cada tarea.
- Commits por tarea en la rama de esta fase (mismo criterio que las fases anteriores: cada tarea es su
  propio checkpoint).

---

### Tarea 1: Tests de `settings/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/settings/fetch.test.ts` (crear)

**Interfaces:**
- Consume: `getSetting(): Promise<ApiSetting>` y `updateSetting(id: number, payload: Omit<ApiSetting, "id">)` de `src/app/4dnn1n/settings/fetch.ts`.

**Contexto verificado:** el archivo importa `apiFetch`/`csrf` de `@/lib/api` (sin `memCache` — es un
singleton, no hay lista que cachear). `getSetting()` retorna `res.data` directamente; `updateSetting()`
retorna la respuesta **completa** (`{ message, data }`, sin desestructurar) — asimetría real entre
ambas funciones, confirmada porque `settings/page.tsx` hace `const res = await updateSetting(...); setSetting(res.data);`.

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
```

- [ ] **Step 1: Test de `getSetting`**

```ts
it("retorna res.data directamente", async () => {
  const setting = { id: 1, wa_api_version: "v18.0", wa_phone_number_id: "123", wa_bearer_token: "tok", wa_template_name: "carnet_tpl", wa_appointment_template_name: null };
  (apiFetch as any).mockResolvedValue({ message: "ok", data: setting });

  const result = await getSetting();

  expect(apiFetch).toHaveBeenCalledWith("/api/settings");
  expect(result).toEqual(setting);
});
```

- [ ] **Step 2: Test de `updateSetting`**

1. Llama `csrf()` antes de `apiFetch`.
2. `apiFetch` se llama con `/api/settings/3`, método `PATCH`, `body: JSON.stringify(payload)`.
3. El valor retornado es la respuesta **completa** (`{ message, data }`), no solo `data`.

```ts
it("actualiza vía PATCH y retorna la respuesta completa", async () => {
  const payload = { wa_api_version: "v19.0", wa_phone_number_id: "999", wa_bearer_token: "nuevo-tok", wa_template_name: "carnet_v2", wa_appointment_template_name: "cita_tpl" };
  const apiResponse = { message: "Configuración actualizada.", data: { id: 3, ...payload } };
  (apiFetch as any).mockResolvedValue(apiResponse);

  const result = await updateSetting(3, payload);

  expect(csrf).toHaveBeenCalled();
  expect(apiFetch).toHaveBeenCalledWith("/api/settings/3", { method: "PATCH", body: JSON.stringify(payload) });
  expect(result).toEqual(apiResponse);
});
```

- [ ] **Step 3: Correr `npm run test` y `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 2: Tests de `settings/_components/SettingForm.tsx`

**Files:**
- Test: `tests/app/4dnn1n/settings/_components/SettingForm.test.tsx` (crear)

**Interfaces:**
- Consume: `SettingForm({ initial, onSubmit })` (default export) de `src/app/4dnn1n/settings/_components/SettingForm.tsx`.

**Contexto verificado:** componente sin dependencias externas de fetch — toda la lógica (`canSubmit`,
`submit`) vive en el propio archivo, con estado local `form` inicializado desde `initial`. `canSubmit`
requiere `wa_api_version`, `wa_phone_number_id`, `wa_bearer_token` y `wa_template_name` no vacíos
(`.trim() !== ""`); **`wa_appointment_template_name` NUNCA es requerido** (no participa en `canSubmit`).
El campo `wa_bearer_token` es `type="password"` por defecto con un botón de alternar visibilidad
(`Eye`/`EyeOff`).

- [ ] **Step 1: Test de prellenado inicial**

1. Con `initial.wa_appointment_template_name: null` → el input correspondiente se renderiza con valor
   `""` (por el `?? ""` del `useState` inicial), no `"null"`.
2. Los otros 4 campos se prellenan tal cual vienen de `initial`.

- [ ] **Step 2: Tests de `canSubmit` — los 4 campos obligatorios**

Parametrizado sobre `["wa_api_version", "wa_phone_number_id", "wa_bearer_token", "wa_template_name"]`:
al vaciar (`fireEvent.change(input, { target: { value: "" } })`) cualquiera de los 4, el botón
"Guardar" queda `disabled`. Con los 4 completos y `wa_appointment_template_name` vacío, "Guardar" está
habilitado (confirma que el 5º campo no es requerido).

- [ ] **Step 3: Test de `submit()` y el estado `saving`**

1. Click en "Guardar" con `canSubmit: true` → invoca `onSubmit(form)` con el objeto `form` actual
   completo (los 5 campos, sin `id`).
2. Mientras la promesa de `onSubmit` está pendiente → botón deshabilitado, texto "Guardando...".
3. Tras resolver → botón vuelve a "Guardar", habilitado de nuevo (usa `finally` para resetear `saving`).
4. Click en "Guardar" con `canSubmit: false` → `submit()` retorna temprano, `onSubmit` NO se invoca
   (verificar directamente disparando el click aunque el botón esté disabled es redundante con RTL —
   basta confirmar que el botón está `disabled` y que un `fireEvent.click` sobre un botón
   `disabled` no dispara el handler).

- [ ] **Step 4: Test del toggle de visibilidad del token**

1. Input de token inicia con `type="password"`.
2. Click en el botón del ojo → `type="text"`, ícono cambia a `EyeOff`.
3. Click de nuevo → vuelve a `type="password"`, ícono `Eye`.

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 3: Tests de `settings/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/settings/page.test.tsx` (crear)

**Interfaces:**
- Consume: `SettingsPage` (default export) de `src/app/4dnn1n/settings/page.tsx`.
- Mockear: `./fetch` (`getSetting`, `updateSetting`), `@/lib/alert`, y
  `./_components/SettingForm` con un stub simple (ya testeado en la Tarea 2) que expone un botón
  "submit-stub" para invocar `onSubmit` con un payload fijo de prueba.

**Contexto verificado — hallazgo importante, documentarlo, no "corregirlo" en este plan:**
`settings/page.tsx` **no tiene ningún gate de permisos en el frontend** (a diferencia de
`affiliates`/`appointments`, que sí verifican `user?.type` antes de renderizar). No importa
`useAuth`, no hay chequeo de rol. El acceso exclusivo a super admin que exige el backend
(`CLAUDE.md` del backend: "Solo accesible para super administrador") se aplica **únicamente en el
servidor** — si un usuario sin permiso navega a `/4dnn1n/settings`, `getSetting()` recibirá un 403 de
la API y la página simplemente mostrará el error vía `alert.error(...)` sin renderizar el formulario
(`setting` nunca deja de ser `null`). El link del sidebar (`src/components/Layouts/sidebar/data/index.ts`)
tampoco condiciona la visibilidad del ítem "Configuración" por rol — está fuera de alcance de esta
fase (componente compartido, Fase 4), pero es la misma causa raíz. No agregar un gate de permisos en
este plan: es un cambio de producción, no de tests: documentarlo en el reporte de la tarea para que
el usuario decida si amerita un fix aparte.

```ts
vi.mock("./fetch", () => ({ getSetting: vi.fn(), updateSetting: vi.fn() }));
vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock("./_components/SettingForm", () => ({
  default: ({ onSubmit }: any) => (
    <button data-testid="submit-stub" onClick={() => onSubmit({ wa_api_version: "v20.0", wa_phone_number_id: "1", wa_bearer_token: "t", wa_template_name: "tpl", wa_appointment_template_name: "" })}>
      submit-stub
    </button>
  ),
}));
```

- [ ] **Step 1: Test del ciclo de carga**

1. Mientras `getSetting()` está pendiente → el título "Configuración Global" NO está en el DOM
   (el bloque `{!loading && setting && (...)}` no se renderiza).
2. `getSetting()` resuelve → título "Configuración Global", descripción "Parámetros de integración
   con la API de WhatsApp Business." y el stub de `SettingForm` visibles.
3. `getSetting()` rechaza → `alert.error("Error", getApiErrorMessage(err))`; el título y el stub
   nunca aparecen (`setting` permanece `null`).

- [ ] **Step 2: Test de `handleSubmit`**

1. Tras cargar exitosamente, click en "submit-stub" → llama
   `updateSetting(setting.id, payloadDelStub)`.
2. `updateSetting` resuelve `{ message, data: nuevoSetting }` → el estado local se actualiza a
   `res.data` (verificable si el test vuelve a exponer algún campo del stub que dependa de `initial`,
   o simplemente confirmando que no lanza y que se llama `alert.success("Guardado", "Configuración actualizada exitosamente.")`).
3. `updateSetting` rechaza → `alert.error("Error", getApiErrorMessage(err))`.

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint — fin del módulo `settings`.**

---

### Tarea 4: Tests de `account/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/account/fetch.test.ts` (crear)

**Interfaces:**
- Consume: `updateUsername(userId: number, username: string): Promise<void>` y
  `changePassword(currentPassword: string, newPassword: string): Promise<void>` de
  `src/app/4dnn1n/account/fetch.ts`.

**Contexto verificado:** mismo patrón de mock de `@/lib/api` que la Tarea 1 — sin `memCache` (no hay
lista ni catálogo que cachear en este módulo).

```ts
vi.mock("@/lib/api", () => ({ apiFetch: vi.fn(), csrf: vi.fn().mockResolvedValue(undefined) }));
```

- [ ] **Step 1: Test de `updateUsername`**

```ts
it("llama csrf antes y hace PATCH con el body { user: username }", async () => {
  await updateUsername(7, "nuevo_user");

  expect(csrf).toHaveBeenCalled();
  expect(apiFetch).toHaveBeenCalledWith("/api/users/7", { method: "PATCH", body: JSON.stringify({ user: "nuevo_user" }) });
});
```

- [ ] **Step 2: Test de `changePassword`**

```ts
it("llama csrf antes y hace POST con current_password y new_password", async () => {
  await changePassword("actual123", "nueva456");

  expect(csrf).toHaveBeenCalled();
  expect(apiFetch).toHaveBeenCalledWith("/api/user/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: "actual123", new_password: "nueva456" }),
  });
});
```

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint.**

---

### Tarea 5: Tests de `account/page.tsx`

**Files:**
- Test: `tests/app/4dnn1n/account/page.test.tsx` (crear)

**Interfaces:**
- Consume: `AccountPage` (default export) de `src/app/4dnn1n/account/page.tsx`.
- Mockear: `./fetch` (`updateUsername`, `changePassword`), `@/context/AuthContext` (`useAuth`),
  `next/navigation` (`useRouter`), `@/lib/alert`.

**Contexto verificado:** el archivo tiene dos secciones independientes en el mismo componente —
sección A (nombre de usuario, siempre visible) y sección B (contraseña, colapsada por defecto detrás
de `showPasswordSection`). Ninguna usa un hook propio; toda la lógica vive inline en `AccountPage`.

```ts
vi.mock("./fetch", () => ({ updateUsername: vi.fn(), changePassword: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as any).mockReturnValue({
    user: { id: 5, name: "Ana", email: "ana@test.com", user: "ana_admin", type: 1 },
    loading: false, isLoggingOut: false,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    logoutUser: vi.fn(),
    ...overrides,
  });
}
```

- [ ] **Step 1: Test de prellenado y validación de nombre de usuario**

1. El input de nombre de usuario se prellena con `user.user` (`"ana_admin"`).
2. Submit con un valor de menos de 3 caracteres (tras `trim()`) → error "El nombre de usuario debe
   tener al menos 3 caracteres." visible; `updateUsername` NO se llama.
3. Escribir en el input tras un error → el mensaje de error se limpia inmediatamente (`onChange`
   resetea `usernameError`).

- [ ] **Step 2: Test de envío exitoso de nombre de usuario**

1. Submit con un nombre válido (≥3 caracteres) → llama `updateUsername(user.id, valorTrim)`, luego
   `refreshUser()`, luego `alert.success("Guardado", "Nombre de usuario actualizado correctamente.")`,
   luego `router.push("/4dnn1n/home")` (usar `useRouter` mockeado con `{ push: vi.fn() }`).

- [ ] **Step 3: Test de errores de `updateUsername`**

1. Rechaza con `err.data.errors.user = ["Ya existe otro usuario con ese nombre."]` (array) →
   `usernameError` se fija al **primer** elemento del array; `alert.error` NO se llama.
2. Rechaza con `err.data.errors.user = "mensaje plano"` (string, no array) → `usernameError` se fija
   con `String(fieldErr)` tal cual.
3. Rechaza sin `err.data.errors.user` (ej. error 500 genérico) → `alert.error("Error", getApiErrorMessage(err))`;
   `usernameError` NO se modifica.

- [ ] **Step 4: Test de colapso/expansión de la sección de contraseña**

1. Estado inicial: el formulario de contraseña NO está en el DOM; se muestra el texto
   "Haz clic en "Cambiar contraseña" para actualizar tu contraseña de acceso."; el botón muestra
   "Cambiar contraseña" con ícono `ChevronDown`.
2. Click en el botón → aparece el formulario (3 campos: actual/nueva/confirmar), el botón cambia a
   "Cancelar" con ícono `ChevronUp`.
3. Click de nuevo ("Cancelar") → el formulario desaparece y los 3 campos + errores se resetean
   (`togglePasswordSection` limpia `currentPassword`/`newPassword`/`confirmPassword`/`passwordErrors`
   en ambas direcciones del toggle).

- [ ] **Step 5: Test de validación de contraseña**

Con la sección expandida:
1. `newPassword` de menos de 6 caracteres → error "La contraseña debe tener al menos 6 caracteres."
   bajo el campo "Nueva contraseña"; `changePassword` NO se llama.
2. `newPassword !== confirmPassword` → error "Las contraseñas no coinciden." bajo "Confirmar nueva
   contraseña".
3. Ambas condiciones a la vez (nueva corta Y no coincide con confirmación) → ambos errores aparecen
   simultáneamente (el objeto `errs` acumula las dos claves antes de fijar el estado).
4. Escribir en cualquiera de los 3 campos limpia únicamente el error de ESE campo, no los otros dos.

- [ ] **Step 6: Test de envío exitoso de contraseña**

1. Con `newPassword` válido (≥6) e igual a `confirmPassword` → llama
   `changePassword(currentPassword, newPassword)`; tras resolver: los 3 campos se vacían, la sección
   se colapsa (`showPasswordSection` vuelve a `false`), `alert.success("Guardado", "Contraseña actualizada correctamente.")`,
   y `router.push("/4dnn1n/home")`.

- [ ] **Step 7: Test de errores de `changePassword`**

1. Rechaza con `err.data.errors.current_password` (array u string, mismo patrón que el Step 3) →
   `passwordErrors.current` se fija en consecuencia; `alert.error` NO se llama.
2. Rechaza sin ese campo → `alert.error("Error", getApiErrorMessage(err))`.

- [ ] **Step 8: Test de los 3 toggles de visibilidad (actual/nueva/confirmar)**

Cada uno de los 3 campos de contraseña alterna independientemente entre `type="password"` y
`type="text"` al hacer click en su botón de ojo correspondiente, sin afectar a los otros dos campos.

- [ ] **Step 9: Correr tests y tsc**

- [ ] **Step 10: Commit**

**Checkpoint — fin del módulo `account`.**

---

### Tarea 6: Tests de `home/fetch.ts`

**Files:**
- Test: `tests/app/4dnn1n/home/fetch.test.ts` (crear)

**Interfaces:**
- Consume: `csrf()`, `apiFetch(path, options)`, `getAuthUser()`, `logout()`, `getXsrfToken()`,
  `getTodayAppointments()`, `getDashboardStats()`, `getDashboardCharts(year)` de
  `src/app/4dnn1n/home/fetch.ts`.

**Contexto verificado — desviación deliberada del patrón de mock de las Tareas 1/4:**
a diferencia de todos los `fetch.ts` de las Fases 1-2 y de `settings`/`account` en esta misma fase,
`home/fetch.ts` **no importa `apiFetch`/`csrf` de `@/lib/api`** — reimplementa su propia copia
completa de `csrf()`, `apiFetch()` y `getXsrfToken()` usando el `fetch` global directamente (ver
`CLAUDE.md` del frontend, sección "Cliente API": "Ambos archivos implementan `csrf()` y `apiFetch()`
de forma independiente — duplicado intencional"). Por lo tanto **no se puede mockear `@/lib/api`** —
hay que mockear el propio `fetch` global con `vi.stubGlobal("fetch", vi.fn())`.

Además, `csrf()` guarda su promesa en una variable de módulo (`csrfPromise`), compartida por TODOS los
tests de este archivo si se importa una sola vez de forma estática arriba del archivo. Para que cada
test empiece con un `csrfPromise` limpio (sin importar si el test anterior ya lo pobló), **ningún test
de este archivo usa un `import` estático de `home/fetch.ts` al inicio del archivo** — todos, incluso
los más simples (`getXsrfToken`, `getAuthUser`, `logout`, los 3 fetchers del dashboard), reimportan el
módulo dentro del propio `it()` con `await import("@/app/4dnn1n/home/fetch")` **después** de que el
`vi.resetModules()` del `beforeEach` ya corrió. Aplicar este patrón de forma uniforme en los 7 steps
de esta tarea, no solo en el de idempotencia de `csrf()` — de lo contrario un test que corra después
del de reintento-419 heredaría un `csrfPromise` ya resuelto de un test anterior y el conteo de
llamadas a `fetch` dejaría de ser predecible.

`apiFetch` de este archivo **lanza un objeto plano `{ status, data }`** en caso de error — NO la
clase `ApiError` que usa `src/lib/api.ts`. Es una diferencia real entre ambos clientes, no un
descuido: confirmarlo con una aserción explícita (`toEqual({ status, data })`, no
`toBeInstanceOf(ApiError)`).

Las 3 funciones de dashboard usan `memCache` (mock igual que en Fases 1-2, delegando `get` directo a
`fn()`):

```ts
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key: string, ttl: number, fn: () => unknown) => fn()) },
  TTL_LIST: 120000,
  TTL_CATALOG: 300000,
}));

function fakeResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
});
```

- [ ] **Step 1: Test de `getXsrfToken`**

1. Con `document.cookie = "XSRF-TOKEN=token%3Dabc123"` → retorna `"token=abc123"` (decodificado).
2. Sin la cookie → retorna `null`.

- [ ] **Step 2: Test de idempotencia de `csrf()`**

```ts
it("dispara una sola petición de red aunque se llame varias veces en la misma sesión de módulo", async () => {
  const fetchMock = vi.fn().mockResolvedValue(fakeResponse(204, {}));
  vi.stubGlobal("fetch", fetchMock);
  const { csrf } = await import("@/app/4dnn1n/home/fetch");

  await csrf();
  await csrf();

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/sanctum/csrf-cookie"),
    expect.objectContaining({ method: "GET", credentials: "include" }),
  );
});
```

- [ ] **Step 3: Tests de `apiFetch` — headers por método**

1. `apiFetch("/user")` (GET) → el `fetch` subyacente se llama SIN header `Content-Type`.
2. `apiFetch("/algo", { method: "POST", body: "{}" })` → SÍ incluye `Content-Type: application/json`.
3. En ambos casos incluye `X-XSRF-TOKEN` (vacío `""` si no hay cookie).

- [ ] **Step 4: Test de `apiFetch` — error como objeto plano, no `ApiError`**

```ts
it("lanza un objeto plano { status, data } cuando la respuesta no es ok, no una clase de error", async () => {
  const fetchMock = vi.fn().mockResolvedValue(fakeResponse(422, { message: "Datos inválidos" }));
  vi.stubGlobal("fetch", fetchMock);
  const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

  await expect(apiFetch("/algo")).rejects.toEqual({ status: 422, data: { message: "Datos inválidos" } });
});
```

- [ ] **Step 5: Test de `apiFetch` — reintento automático en 419**

```ts
it("reintenta la petición original una vez tras un 419, renovando el CSRF antes", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(fakeResponse(419, {}))       // original request
    .mockResolvedValueOnce(fakeResponse(204, {}))        // csrf-cookie renewal
    .mockResolvedValueOnce(fakeResponse(200, { ok: true })); // retried original request
  vi.stubGlobal("fetch", fetchMock);
  const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

  const result = await apiFetch("/algo");

  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(result).toEqual({ ok: true });
});
```

- [ ] **Step 6: Tests de `getAuthUser` y `logout`**

1. `apiFetch` interno resuelve un usuario → `getAuthUser()` retorna ese usuario.
2. `apiFetch` interno rechaza (cualquier error) → `getAuthUser()` retorna `null` (nunca propaga el
   error — `catch { return null; }`).
3. `logout()` dispara una petición `POST` a `/logout`.

- [ ] **Step 7: Tests de `getTodayAppointments`, `getDashboardStats`, `getDashboardCharts`**

1. `getTodayAppointments()` → pide `/api/appointments/today`, retorna
   `{ data: res.data ?? [], date: res.date }`; con `res.data: undefined` → `{ data: [] }`. Clave de
   caché `"appointments:today"`.
2. `getDashboardStats()` → pide `/api/dashboard/stats`, retorna `res.data` directo. Clave de caché
   `"dashboard:stats"`.
3. `getDashboardCharts(2026)` → pide `/api/dashboard/charts?year=2026`, retorna `res.data`. Clave de
   caché `` `dashboard:charts:2026` `` (distinta por año, confirmar con `getDashboardCharts(2025)` en
   el mismo test generando una clave distinta).

- [ ] **Step 8: Correr tests y tsc**

- [ ] **Step 9: Commit**

**Checkpoint.**

---

### Tarea 7: Tests de `home/_components/stats-cards.tsx`

**Files:**
- Test: `tests/app/4dnn1n/home/_components/stats-cards.test.tsx` (crear)

**Interfaces:**
- Consume: `StatsCards` de `src/app/4dnn1n/home/_components/stats-cards.tsx`.
- Mockear `@/context/AuthContext` (`useAuth`) y `@/app/4dnn1n/home/fetch` (`getDashboardStats`) — el
  archivo importa `fetch.ts` por el alias `@/app/4dnn1n/home/fetch`, no por ruta relativa: mockear
  exactamente ese specifier.

**Contexto verificado:** `stats-cards-skeleton.tsx` (`StatsCardsSkeleton`) NO se mockea ni se testea
por separado (ver Global Constraints) — se deja renderizar de verdad; el test de este widget confirma
indirectamente que aparece durante la carga.

- [ ] **Step 1: Test del gate por rol**

1. `user: null` → el componente retorna `null` (nada en el DOM) — el `useEffect` corta temprano
   (`if (!user || user.type !== 1) { setLoading(false); return; }`) y el render también retorna
   `null` antes de considerar `loading`.
2. `user.type: 2` (asesor) → igual, retorna `null`; `getDashboardStats` NUNCA se llama.

- [ ] **Step 2: Test del estado de carga (`user.type === 1`)**

1. Mientras `getDashboardStats()` está pendiente → el texto "Afiliados activos" NO está en el DOM
   (se está mostrando `StatsCardsSkeleton` en su lugar).
2. Al resolver → "Afiliados activos" aparece.

- [ ] **Step 3: Test de los valores renderizados**

Con `getDashboardStats` resolviendo
`{ affiliates: { active: 1234, inactive: 56, inactive_by_expiry: 12 }, appointments: { this_month: 89 } }`:
1. "Afiliados activos" → `"1.234"` (formato `toLocaleString('es-CO')`).
2. "Afiliados inactivos" → `"56"`, con el subtítulo "12 por vencimiento de vigencia".
3. "Citas este mes" → `"89"`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 8: Tests de `home/_components/expiring-today-card.tsx`

**Files:**
- Test: `tests/app/4dnn1n/home/_components/expiring-today-card.test.tsx` (crear)

**Interfaces:**
- Consume: `ExpiringTodayCard` de `src/app/4dnn1n/home/_components/expiring-today-card.tsx`.
- Mockear `@/app/4dnn1n/affiliates/fetch` (`getExpiringToday`) — **import cruzado de módulo**: este
  widget del dashboard importa el fetch de `affiliates`, no el de `home`. No mockear
  `@/app/4dnn1n/home/fetch` en este test, no es lo que este archivo usa.

**Contexto verificado:** `expiring-today-card-skeleton.tsx` no se testea directamente (ver Global
Constraints). El auto-scroll (`startScroll`/`stopScroll`) solo se activa si `affiliates.length > 5`
(guard `if (!el || affiliates.length <= 5) return;`), incrementa `scrollTop` en 1 cada 40ms, y se
pausa en `mouseenter`/`touchstart`, se reanuda en `mouseleave`/`touchend`.

```ts
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({ getExpiringToday: vi.fn() }));

function createAffiliate(overrides: Partial<{ id: number; name: string; lastname: string; movil: string | null; phone: string | null }> = {}) {
  return { id: 1, name: "Juan", lastname: "Pérez", movil: "3001234567", phone: null, ...overrides };
}
```

- [ ] **Step 1: Test del ciclo de carga y lista vacía**

1. Mientras `getExpiringToday()` está pendiente → el título "Contratos que vencen hoy" NO está en el
   DOM.
2. Resuelve con `{ data: [], date: "2026-08-29" }` → título visible con la fecha "2026-08-29" al lado,
   y el mensaje "No hay contratos que vencen hoy".

- [ ] **Step 2: Test de la lista con datos**

Con `{ data: [createAffiliate({ id: 1, movil: "3001234567", phone: null }), createAffiliate({ id: 2, movil: null, phone: "6011234567" })], date: "2026-08-29" }`:
1. Ambos afiliados renderizan `"{name} {lastname}"`.
2. El primero muestra solo `"3001234567"` (filtra el `phone` nulo con `.filter(Boolean).join(' · ')`);
   el segundo muestra solo `"6011234567"`.
3. Cada fila tiene un link con `href="/4dnn1n/affiliates/{id}/edit"`.

- [ ] **Step 3: Test del auto-scroll — no se activa con ≤5 elementos**

Con exactamente 5 afiliados, `vi.useFakeTimers()`, avanzar `vi.advanceTimersByTime(200)` (5 ciclos de
40ms) → `container.scrollTop` permanece en `0` (el guard `affiliates.length <= 5` impide crear el
`setInterval`).

- [ ] **Step 4: Test del auto-scroll — se activa con >5 elementos y se pausa en hover**

Con 6 afiliados:
1. `vi.advanceTimersByTime(40)` → `scrollTop` pasa de `0` a `1`.
2. `fireEvent.mouseEnter(container)` → detiene el intervalo; avanzar el tiempo ya no incrementa
   `scrollTop`.
3. `fireEvent.mouseLeave(container)` → el intervalo se reanuda; avanzar el tiempo vuelve a incrementar
   `scrollTop`.

(Restaurar `vi.useRealTimers()` en `afterEach`.)

- [ ] **Step 5: Correr tests y tsc**

- [ ] **Step 6: Commit**

**Checkpoint.**

---

### Tarea 9: Tests de `home/_components/today-appointments-card.tsx`

**Files:**
- Test: `tests/app/4dnn1n/home/_components/today-appointments-card.test.tsx` (crear)

**Interfaces:**
- Consume: `TodayAppointmentsCard` de `src/app/4dnn1n/home/_components/today-appointments-card.tsx`.
- Mockear `@/app/4dnn1n/home/fetch` (`getTodayAppointments`) — a diferencia de la Tarea 8, este widget
  sí usa el `fetch.ts` propio de `home`.

**Contexto verificado:** estructura idéntica a `ExpiringTodayCard` (mismo patrón de auto-scroll,
mismos guards), pero con datos de citas en lugar de afiliados. `today-appointments-card-skeleton.tsx`
no se testea directamente (ver Global Constraints).

```ts
vi.mock("@/app/4dnn1n/home/fetch", () => ({ getTodayAppointments: vi.fn() }));

function createAppointment(overrides: Partial<{ id: number; name: string; hour: string; doctor: { id: number; name: string; lastname: string } }> = {}) {
  return { id: 1, name: "Ana Gómez", hour: "09:00", doctor: { id: 1, name: "Carlos", lastname: "Ruiz" }, ...overrides };
}
```

- [ ] **Step 1: Test del ciclo de carga y lista vacía**

1. Mientras `getTodayAppointments()` está pendiente → "Citas pendientes del día" NO está en el DOM.
2. Resuelve con `{ data: [], date: "2026-08-29" }` → título visible, mensaje "No hay citas para hoy".

- [ ] **Step 2: Test de la lista con datos**

Con 2 citas de `createAppointment`:
1. Cada fila muestra `appt.name`.
2. Cada fila muestra `"{hour} · {doctor.name} {doctor.lastname}"` (ej. `"09:00 · Carlos Ruiz"`).
3. Cada fila tiene un link con `href="/4dnn1n/appointments/{id}"`.

- [ ] **Step 3: Test del auto-scroll (mismo patrón que la Tarea 8)**

1. Con ≤5 citas → el `setInterval` nunca se crea, `scrollTop` no cambia con el tiempo.
2. Con >5 citas → `scrollTop` incrementa cada 40ms; se detiene en `mouseenter`, se reanuda en
   `mouseleave`.

- [ ] **Step 4: Correr tests y tsc**

- [ ] **Step 5: Commit**

**Checkpoint.**

---

### Tarea 10: Tests de `home/_components/charts-section.tsx`

**Files:**
- Test: `tests/app/4dnn1n/home/_components/charts-section.test.tsx` (crear)

**Interfaces:**
- Consume: `ChartsSection` de `src/app/4dnn1n/home/_components/charts-section.tsx`.
- Mockear `@/context/AuthContext` (`useAuth`), `@/app/4dnn1n/home/fetch` (`getDashboardCharts`), y
  `react-apexcharts` — el componente lo carga vía `next/dynamic(() => import('react-apexcharts'), { ssr: false })`;
  `vi.mock("react-apexcharts", ...)` intercepta esa resolución sin necesidad de mockear
  `next/dynamic` en sí.

**Contexto verificado:** 2 gráficas siempre visibles (citas por mes, afiliados nuevos por mes) y 2
solo si `user?.type === 1` (citas por franquicia, afiliados por franquicia) — estas últimas además
requieren `data?.by_franchise` presente; si `loading` es `false` pero `by_franchise` es
`undefined`/`null`, siguen mostrando `ChartSkeleton` indefinidamente (`loading || !data?.by_franchise`).
El año por defecto es `new Date().getFullYear()`; cambiar el `<select>` dispara un nuevo fetch y
vuelve a mostrar `ChartSkeleton` mientras carga. Errores del fetch se silencian con `.catch(() => {})`
y no rompen el render (las 2 gráficas siempre visibles caen a series vacías `?? []`).

```ts
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/app/4dnn1n/home/fetch", () => ({ getDashboardCharts: vi.fn() }));
vi.mock("react-apexcharts", () => ({
  default: (props: any) => (
    <div data-testid="apexchart" data-chart-type={props.type} data-series={JSON.stringify(props.series)} />
  ),
}));
```

Nota: por ser una carga dinámica (`next/dynamic`), el chart puede tardar un tick extra en aparecer —
usar `findByTestId`/`findAllByTestId` (con `await`), no `getBy*`, al aserir sobre `apexchart`.

- [ ] **Step 1: Test del selector de año**

1. Con `user.type: 2` y el reloj del sistema fijado en 2026 (`vi.setSystemTime`), el `<select>`
   muestra las opciones `2026`, `2025`, `2024` (año actual y los 2 anteriores).
2. Al montar, `getDashboardCharts` se llama con el año actual (`2026`).

- [ ] **Step 2: Test de las 2 gráficas siempre visibles (rol no-admin)**

Con `user.type: 2` y `getDashboardCharts` resolviendo
`{ appointments_by_month: [1,2,3,4,5,6,7,8,9,10,11,12], affiliates_by_month: [0,1,2,3,4,5,6,7,8,9,10,11] }`:
1. Mientras está pendiente → 2 elementos con la clase del `ChartSkeleton` (`animate-pulse`) visibles,
   `apexchart` ausente.
2. Al resolver → aparecen exactamente 2 `apexchart` (`type="bar"` con la serie de citas, `type="area"`
   con la serie de afiliados); NO aparece ninguna gráfica de franquicia (el bloque
   `user?.type === 1 && (...)` ni se renderiza).

- [ ] **Step 3: Test de las gráficas de franquicia (solo super admin) — con y sin `by_franchise`**

Con `user.type: 1`:
1. `getDashboardCharts` resuelve SIN `by_franchise` → las 2 gráficas base se muestran, pero las 2 de
   franquicia siguen mostrando `ChartSkeleton` (nunca aparecen sus `apexchart`), porque
   `loading || !data?.by_franchise` sigue siendo verdadero aun con `loading = false`.
2. `getDashboardCharts` resuelve CON
   `by_franchise: { users: [{ id: 1, name: "Franquicia Norte" }, { id: 2, name: "Franquicia Sur" }], appointments_by_franchise: [[1,2],[3,4]], affiliates_by_franchise: [[5,6],[7,8]] }`
   → aparecen 4 `apexchart` en total; los 2 de franquicia reciben `series` con `name` tomado de
   `by_franchise.users[i].name` y `data` de `appointments_by_franchise[i]`/`affiliates_by_franchise[i]`
   respectivamente.

- [ ] **Step 4: Test del cambio de año**

1. Cambiar el `<select>` a `2025` → `getDashboardCharts(2025)` se llama; mientras resuelve, las 2
   gráficas base vuelven a mostrar `ChartSkeleton` (`loading` vuelve a `true` en el `useEffect` que
   depende de `[year]`).

- [ ] **Step 5: Test del manejo de errores**

`getDashboardCharts` rechaza → no se lanza ninguna excepción no controlada (`.catch(() => {})`); tras
el `finally`, `loading` es `false` y las 2 gráficas base se renderizan igual, con series vacías
(`data?.appointments_by_month ?? []` → `[]`).

- [ ] **Step 6: Correr tests y tsc (restaurar `vi.useRealTimers()` si se usó `setSystemTime`)**

- [ ] **Step 7: Commit**

**Checkpoint.**

---

### Tarea 11: `home/_components/region-labels/` — hallazgo de código muerto, sin tests

**Files:** ninguno (no se crea test).

**Contexto verificado:** `region-labels/index.tsx` (`RegionLabels`) y `region-labels/map.tsx`
(`Map`, un mapa de EE. UU. vía `jsvectormap` con el dataset `us_aea_en`) son un remanente de la
plantilla base del proyecto (`free-nextadmin-nextjs`, mencionada en el spec como origen de
`src/components/*`). Se confirmó con una búsqueda de texto (`RegionLabels`) en todo `src/` que **no
hay ningún import de este componente en ninguna parte del código** — ni en `home/page.tsx` (que solo
renderiza `ExpiringTodayCard`, `TodayAppointmentsCard`, `StatsCards` y `ChartsSection`), ni en ningún
otro módulo. No es alcanzable desde ninguna ruta real de la aplicación.

- [ ] **Step 1: Confirmar que sigue sin usarse antes de continuar**

```bash
grep -r "RegionLabels" src/ --include="*.tsx" --include="*.ts"
```

Expected: solo la propia definición en `region-labels/index.tsx`, ningún import externo.

**Decisión:** no se escribe test para `region-labels/index.tsx` ni `region-labels/map.tsx` — no es
"lógica sin testear", es código inalcanzable desde cualquier ruta de producción (un mapa de regiones
de EE. UU., ni siquiera relevante para un panel de afiliados/citas en Colombia). Aplicar aquí el árbol
de decisión del spec sería forzar un test sobre código que no se ejecuta nunca en la aplicación real.
Documentar este hallazgo en el reporte de esta tarea para que el usuario decida si se elimina el
directorio en un cambio de producción aparte — no se borra en este plan de tests.

**Checkpoint (sin commit de tests — nada que commitear en esta tarea salvo, si aplica, una nota en el
ledger de progreso).**

---

### Tarea 12: Tests de `home/page.tsx` — composición y regla arquitectónica Server/Client

**Files:**
- Test: `tests/app/4dnn1n/home/page.test.tsx` (crear)

**Interfaces:**
- Consume: `DashboardPage` (default export) de `src/app/4dnn1n/home/page.tsx`.
- Mockear los 4 widgets que `page.tsx` importa: `./_components/expiring-today-card`,
  `./_components/today-appointments-card`, `./_components/stats-cards`, `./_components/charts-section`
  — cada uno con un stub `<div data-testid="...">` (ya testeados en las Tareas 7-10).

**Contexto verificado — la regla arquitectónica a verificar:** `CLAUDE.md` del frontend, sección
"Dashboard — Widgets con datos reales de la API" → "Regla crítica: Client Components para datos
autenticados": los componentes de `home/_components/` que consumen la API real (autenticada por
cookies de Sanctum, que solo existen en el browser) **deben ser Client Components** (`"use client"`).
Se confirmó leyendo los 4 widgets: los 4 (`stats-cards.tsx`, `expiring-today-card.tsx`,
`today-appointments-card.tsx`, `charts-section.tsx`) tienen `'use client';` como primera línea.
`home/page.tsx`, en cambio, **no tiene `"use client"`** — permanece Server Component porque solo
compone los 4 widgets sin hacer fetch propio ni usar hooks de React; esto es correcto porque no
necesita las cookies del browser. Además, `CLAUDE.md` establece que el dashboard **no debe usar
`LoadingOverlay`** ni tener un `loading.tsx` en su carpeta (cada widget maneja su propio skeleton) —
se confirmó por lectura que `page.tsx` no importa `LoadingOverlay` y que no existe
`src/app/4dnn1n/home/loading.tsx` en el árbol de archivos.

Esta verificación se automatiza leyendo el código fuente real de los 5 archivos (no es una inspección
manual puntual — corre en cada `npm run test` y falla si alguien rompe la regla sin darse cuenta).

- [ ] **Step 1: Test automatizado de la regla "use client" en los 4 widgets vs. `page.tsx`**

```ts
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const HOME_DIR = join(process.cwd(), "src/app/4dnn1n/home");

function startsWithUseClient(source: string): boolean {
  const trimmed = source.trimStart();
  return trimmed.startsWith("'use client'") || trimmed.startsWith('"use client"');
}

describe("Regla arquitectónica: Client Components para datos autenticados", () => {
  it.each([
    "_components/stats-cards.tsx",
    "_components/expiring-today-card.tsx",
    "_components/today-appointments-card.tsx",
    "_components/charts-section.tsx",
  ])("%s declara 'use client' porque consume la API autenticada del panel", (relPath) => {
    const source = readFileSync(join(HOME_DIR, relPath), "utf-8");
    expect(startsWithUseClient(source)).toBe(true);
  });

  it("page.tsx NO declara 'use client' — permanece Server Component de composición sin fetch propio", () => {
    const source = readFileSync(join(HOME_DIR, "page.tsx"), "utf-8");
    expect(startsWithUseClient(source)).toBe(false);
  });

  it("no existe loading.tsx en la carpeta del dashboard (cada widget maneja su propio skeleton, no un overlay global)", () => {
    expect(existsSync(join(HOME_DIR, "loading.tsx"))).toBe(false);
  });

  it("page.tsx no importa LoadingOverlay (el dashboard no debe usar el overlay de pantalla completa)", () => {
    const source = readFileSync(join(HOME_DIR, "page.tsx"), "utf-8");
    expect(source).not.toMatch(/LoadingOverlay/);
  });
});
```

- [ ] **Step 2: Test de composición de `DashboardPage`**

```ts
vi.mock("./_components/expiring-today-card", () => ({ ExpiringTodayCard: () => <div data-testid="widget-expiring-today" /> }));
vi.mock("./_components/today-appointments-card", () => ({ TodayAppointmentsCard: () => <div data-testid="widget-today-appointments" /> }));
vi.mock("./_components/stats-cards", () => ({ StatsCards: () => <div data-testid="widget-stats-cards" /> }));
vi.mock("./_components/charts-section", () => ({ ChartsSection: () => <div data-testid="widget-charts-section" /> }));
```

1. Renderiza los 4 widgets (uno de cada `data-testid`), confirmando que `page.tsx` los compone todos
   sin gates de permisos propios — el control de acceso por rol vive dentro de cada widget
   (`StatsCards`/`ChartsSection` ya lo verifican internamente en las Tareas 7 y 10), no en la página.
2. `ExpiringTodayCard` y `TodayAppointmentsCard` aparecen antes que `StatsCards`, y `StatsCards` antes
   que `ChartsSection`, en ese orden en el DOM (refleja el orden real de `page.tsx`: fila 1 → fila 2 →
   filas 3-4).

- [ ] **Step 3: Correr tests y tsc**

- [ ] **Step 4: Commit**

**Checkpoint final de la Fase 3.**

---

### Verificación final de la Fase 3

- [ ] Suite completa (`npm run test`) en verde.
- [ ] `npx tsc --noEmit` sin errores.
- [ ] `npm run test:coverage`: anotar el % real alcanzado para `settings`/`account`/`home`
  específicamente (debería acercarse al 85-90% mínimo aceptable de `dev-standards` en estos 3
  módulos, dado que esta fase los cubre exhaustivamente salvo `region-labels`, documentado como
  código muerto sin cobertura por diseño).
- [ ] Confirmar que el hallazgo de la Tarea 3 (ausencia de gate de permisos en `settings/page.tsx`) y
  el de la Tarea 11 (código muerto en `region-labels/`) quedaron documentados en el reporte final
  para que el usuario decida si ameritan un cambio de producción aparte — ninguno de los dos se
  corrige en este plan de tests.
- [ ] Revisar el diff completo antes de decidir cómo integrar esta fase — el usuario decide cuándo y
  cómo mergear/pushear.

**No se sube el umbral de cobertura global en `vitest.config.ts` en esta fase** — eso se decide en la
Fase 4 (última), con el número final de las 4 fases combinadas, según el spec.
