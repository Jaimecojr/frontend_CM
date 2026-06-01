# Dashboard Redesign — Spec

**Fecha:** 2026-05-21  
**Proyecto:** Contacto Médico (frontend-cm + api-cm)  
**Estado:** Aprobado, pendiente implementación

---

## Contexto

El dashboard actual muestra datos mock irrelevantes para el negocio (gráficas de pagos, mapa de EE.UU., tabla de canales de tráfico). Este rediseño lo reemplaza con datos reales organizados por rol, con carga progresiva (Suspense + skeletons) y cache.

Los tres roles del sistema:
- `type = 1` — Super Admin: ve todos los datos del sistema
- `type = 2` — Administrador de franquicia: ve solo sus propios datos
- `type = 3` — Asesor: ve solo sus propios datos

---

## Layout general del dashboard (de arriba a abajo)

```
[ Contratos que vencen hoy ]  [ Citas pendientes del día ]   ← fila 1, 50/50
[ Métricas globales: 3 tarjetas ]                            ← fila 2, solo type=1
[ Gráfica: Citas por mes ]  [ Gráfica: Afiliados nuevos ]    ← fila 3, todos
[ Gráfica: Citas por franquicia ]  [ Gráfica: Afil. por franquicia ] ← fila 4, solo type=1
```

---

## Sección 1 — Tarjetas superiores

### 1.1 Contratos que vencen hoy (rediseño)

**Origen de datos:** `GET /api/affiliates/expiring-today` (endpoint existente, ajustado)

**Cambios al endpoint:**
- Incluir `movil` y `phone` en la respuesta (actualmente no se retornan)
- El filtro por `user_id` ya existe: non-super-admin solo ve sus propios afiliados

**Comportamiento de la tarjeta:**
- Ancho: 50% en desktop, 100% en móvil (se apila)
- Altura fija que muestra ~5 registros visibles
- `overflow-y-auto` para scroll manual
- Auto-scroll animado de arriba a abajo en bucle cuando hay más de 5 registros
- El auto-scroll se pausa al hacer hover o al interactuar con el scroll
- Skeleton de 3 filas (pulso animado) mientras carga
- Si no hay registros: mensaje "No hay contratos que vencen hoy"
- Cache en `memCache` con `TTL_LIST` (2 min), clave `affiliates:expiring-today`
- Migrar de `useState/useEffect` manual a patrón Server Component + `<Suspense>`

**Datos por fila:**
- Línea 1: `name` + `lastname` (nombre completo)
- Línea 2: `movil` y/o `phone` en texto secundario (se muestran los que existan)
- Botón: ícono de renovación (↻) que redirige a `/4dnn1n/affiliates/{id}/edit`

---

### 1.2 Citas pendientes del día (nueva)

**Origen de datos:** `GET /api/appointments/today` (endpoint nuevo)

**Comportamiento:** idéntico a la tarjeta de contratos (misma altura, mismo auto-scroll, mismo skeleton)

**Datos por fila:**
- `name` — nombre del paciente en la cita
- `hour` — hora de la cita
- Nombre completo del médico: `doctor.name` + `doctor.lastname`
- Botón: ícono de ver (→) que redirige a `/4dnn1n/appointments/{id}`

**Cache:** `TTL_LIST` (2 min), clave `appointments:today`

---

## Sección 2 — Métricas globales (solo `type = 1`)

**Origen de datos:** `GET /api/dashboard/stats`  
**Acceso:** El backend retorna 403 si `type !== 1`. El frontend renderiza condicionalmente con `user.type === 1`.

**3 tarjetas en fila:**

| Tarjeta | Valor | Detalle | Color |
|---|---|---|---|
| Afiliados activos | `affiliates.active` | — | Verde |
| Afiliados inactivos | `affiliates.inactive` | Subtexto: "X por vencimiento" (`inactive_by_expiry`) | Rojo/naranja |
| Citas este mes | `appointments.this_month` | — | Azul |

**Respuesta del endpoint:**
```json
{
  "affiliates": {
    "active": 320,
    "inactive": 47,
    "inactive_by_expiry": 38
  },
  "appointments": {
    "this_month": 84
  }
}
```

- `inactive_by_expiry`: `stade = 2` AND `validity_end < hoy`
- `this_month`: `date` entre el primer y último día del mes actual (todas las citas del sistema)
- Cache: `TTL_CATALOG` (5 min), clave `dashboard:stats`
- Skeleton de 3 tarjetas mientras carga

---

## Sección 3 — Gráficas generales (todos los roles)

**Origen de datos:** `GET /api/dashboard/charts?year=2025`

**Filtrado por rol (backend):**
- `type = 1`: datos de todo el sistema
- `type = 2` o `3`: filtra por `user_id = auth()->id()` en citas y `counselor_id = auth()->id()` en afiliados

**Selector de año:** un único dropdown compartido por todas las gráficas (secciones 3 y 4), ubicado en el encabezado del bloque de gráficas. Default año actual. Al cambiar el año se re-fetcha el endpoint con el nuevo parámetro y todas las gráficas se actualizan simultáneamente.

**Cache:** `TTL_CATALOG` (5 min), clave `dashboard:charts:{userId}:{year}`

---

### 3.1 Citas por mes

- Tipo: barras verticales (ApexCharts)
- Eje X: Ene – Dic
- Eje Y: cantidad de citas
- Datos: `appointments_by_month` — array de 12 posiciones

### 3.2 Afiliados nuevos por mes

- Tipo: línea (ApexCharts)
- Mismos ejes
- Datos: `affiliates_by_month` — array de 12 posiciones
- Agrupa por mes de `sale_date`

**Respuesta base del endpoint:**
```json
{
  "appointments_by_month": [0, 5, 12, 8, 3, 7, 10, 14, 6, 9, 11, 4],
  "affiliates_by_month":   [0, 3,  7, 4, 2, 5,  6,  8, 3, 4,  5, 2]
}
```

---

## Sección 4 — Gráficas por franquicia (solo `type = 1`)

Mismo endpoint `GET /api/dashboard/charts?year=2025`, misma request — el backend incluye `by_franchise` adicional cuando `type = 1`.

**Respuesta adicional para super admin:**
```json
{
  "by_franchise": {
    "users": [
      { "id": 5, "name": "Franquicia Norte" },
      { "id": 8, "name": "Franquicia Sur" }
    ],
    "appointments_by_franchise": [
      [0, 2, 5, 3, 1, 4, 6, 8, 2, 3, 5, 1],
      [1, 3, 4, 2, 0, 1, 3, 5, 1, 2, 4, 0]
    ],
    "affiliates_by_franchise": [
      [0, 1, 3, 2, 1, 2, 3, 4, 1, 2, 3, 1],
      [2, 0, 2, 1, 0, 1, 2, 3, 0, 1, 2, 0]
    ]
  }
}
```

Cada array en `appointments_by_franchise` y `affiliates_by_franchise` corresponde al usuario en la misma posición del array `users`.

### 4.1 Citas por franquicia/mes

- Tipo: líneas múltiples — una línea por franquicia, diferenciadas por color
- Selector de año compartido con las gráficas generales
- Título: "Citas por franquicia"

### 4.2 Afiliados nuevos por franquicia/mes

- Tipo: barras agrupadas — cada grupo es un mes, cada barra es una franquicia
- Título: "Afiliados nuevos por franquicia"

---

## Backend — Resumen de cambios

### Nuevo: `DashboardController`
- `GET /api/dashboard/stats` → método `stats()` — solo `type = 1`
- `GET /api/dashboard/charts` → método `charts()` — todos los roles, filtrado por rol

### Modificado: `AppointmentController`
- Nuevo método `today()` → `GET /api/appointments/today`
- Citas con `date = fecha_de_hoy_exacta` (no `date >= hoy`), filtradas por `user_id` si `type !== 1`
- Retorna: `id`, `name`, `hour`, `doctor.name`, `doctor.lastname`, `doctor_id`

### Modificado: `AffiliateController`
- `expiringToday()`: incluir `movil` y `phone` en el `select()` y en la respuesta

### Nuevas rutas en `routes/api.php`
```php
// Dentro del grupo auth:sanctum
Route::get('/appointments/today', [AppointmentController::class, 'today']);
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
Route::get('/dashboard/charts', [DashboardController::class, 'charts']);
```

---

## Frontend — Resumen de cambios

### Archivos nuevos
- `src/app/4dnn1n/home/_components/today-appointments-card.tsx` — tarjeta citas del día
- `src/app/4dnn1n/home/_components/today-appointments-card/skeleton.tsx`
- `src/app/4dnn1n/home/_components/expiring-today-card/skeleton.tsx` — skeleton para la tarjeta existente
- `src/app/4dnn1n/home/_components/stats-cards.tsx` — 3 métricas del super admin
- `src/app/4dnn1n/home/_components/stats-cards/skeleton.tsx`
- `src/app/4dnn1n/home/_components/charts-section.tsx` — gráficas generales
- `src/app/4dnn1n/home/_components/franchise-charts-section.tsx` — gráficas por franquicia
- `src/app/4dnn1n/home/fetch.ts` — nuevas funciones: `getTodayAppointments()`, `getDashboardStats()`, `getDashboardCharts(year)`

### Archivos modificados
- `src/app/4dnn1n/home/_components/expiring-today-card.tsx` — rediseño completo
- `src/app/4dnn1n/home/page.tsx` — nuevo layout, render condicional por `type`
- `src/app/4dnn1n/affiliates/fetch.ts` — ajustar tipo `ExpiringAffiliate` para incluir `movil` y `phone`

### Patrón de carga
Todas las secciones usan Server Components con `<Suspense>` y skeleton como fallback. La tarjeta de citas del día y la de contratos se convierten a este patrón (actualmente la de contratos usa `useState/useEffect`).

### Render condicional por rol
```tsx
// En page.tsx
{user.type === 1 && <Suspense fallback={<StatsCardsSkeleton />}><StatsCards /></Suspense>}
{user.type === 1 && <Suspense fallback={<FranchiseChartsSkeleton />}><FranchiseChartsSection year={year} /></Suspense>}
```

El `user` se obtiene del `AuthContext` disponible en el layout.

---

## Decisiones de diseño

- **Un solo endpoint de charts:** evita dos roundtrips; el frontend hace una sola llamada y distribuye los datos a las 2 (o 4) gráficas.
- **`by_franchise` solo en respuesta de type=1:** no expone datos de otros usuarios a roles no autorizados.
- **Auto-scroll en tarjetas:** implementado con CSS animation (`@keyframes scroll`) y pausa en hover — sin librerías externas.
- **`sale_date` para afiliados nuevos:** es la fecha de última transacción/creación, la más representativa para "afiliados nuevos por mes".
- **Campo `type` (no `user_type`):** el modelo `User` usa `type`, no `user_type`. Consistente en backend y frontend.