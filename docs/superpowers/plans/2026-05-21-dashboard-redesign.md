# Dashboard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el dashboard para mostrar datos reales del negocio (contratos que vencen, citas del día, gráficas por mes, métricas globales), con filtrado por rol y carga progresiva con skeletons.

**Architecture:** El backend expone 3 endpoints nuevos (`DashboardController::stats`, `DashboardController::charts`, `AppointmentController::today`) y un ajuste menor a `AffiliateController::expiringToday`. El frontend reemplaza todos los componentes mock con Client Components que usan `useAuth()`, `memCache`, y ApexCharts.

**Tech Stack:** Laravel 10 (PHP 8.x), Next.js 14 App Router (TypeScript), TailwindCSS, ApexCharts (react-apexcharts), Lucide React, shadcn/ui Skeleton.

---

## File Map

### Backend (`api-cm`)
| Acción | Archivo |
|---|---|
| CREATE | `app/Http/Controllers/DashboardController.php` |
| MODIFY | `app/Http/Controllers/AppointmentController.php` — agregar `today()` |
| MODIFY | `app/Http/Controllers/AffiliateController.php` — ampliar `select()` en `expiringToday()` |
| MODIFY | `routes/api.php` — 3 rutas nuevas |
| CREATE | `tests/Feature/DashboardTest.php` |
| CREATE | `tests/Feature/AppointmentTodayTest.php` |

### Frontend (`frontend-cm`)
| Acción | Archivo |
|---|---|
| MODIFY | `src/app/4dnn1n/affiliates/fetch.ts` — tipo `ExpiringAffiliate` + cache en `getExpiringToday` |
| MODIFY | `src/app/4dnn1n/home/fetch.ts` — 3 funciones nuevas + tipos |
| MODIFY | `src/app/4dnn1n/home/_components/expiring-today-card.tsx` — rediseño completo |
| CREATE | `src/app/4dnn1n/home/_components/expiring-today-card-skeleton.tsx` |
| CREATE | `src/app/4dnn1n/home/_components/today-appointments-card.tsx` |
| CREATE | `src/app/4dnn1n/home/_components/today-appointments-card-skeleton.tsx` |
| CREATE | `src/app/4dnn1n/home/_components/stats-cards.tsx` |
| CREATE | `src/app/4dnn1n/home/_components/stats-cards-skeleton.tsx` |
| CREATE | `src/app/4dnn1n/home/_components/charts-section.tsx` |
| MODIFY | `src/app/4dnn1n/home/page.tsx` — layout completo |

---

## Task 1: Backend — Actualizar `expiringToday()` para incluir `movil` y `phone`

**Files:**
- Modify: `app/Http/Controllers/AffiliateController.php:246`

- [ ] **Step 1: Escribir el test fallido**

Crear `tests/Feature/ExpiringTodayFieldsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Affiliate;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpiringTodayFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_expiring_today_returns_movil_and_phone(): void
    {
        $user = User::factory()->create(['type' => 1]);
        $hoy  = Carbon::today()->toDateString();

        Affiliate::factory()->create([
            'stade'        => 1,
            'validity_end' => $hoy,
            'movil'        => '3001234567',
            'phone'        => '6041234567',
        ]);

        $response = $this->actingAs($user)->getJson('/api/affiliates/expiring-today');

        $response->assertStatus(200)
                 ->assertJsonPath('data.0.movil', '3001234567')
                 ->assertJsonPath('data.0.phone', '6041234567');
    }
}
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
cd api-cm
php artisan test tests/Feature/ExpiringTodayFieldsTest.php
```
Resultado esperado: FAIL — `movil` y `phone` no están en la respuesta.

- [ ] **Step 3: Implementar el cambio**

En `app/Http/Controllers/AffiliateController.php`, método `expiringToday()` (aprox. línea 248):

```php
// Antes:
$query = Affiliate::select(['id', 'name', 'lastname', 'id_card', 'validity_end', 'stade'])

// Después:
$query = Affiliate::select(['id', 'name', 'lastname', 'id_card', 'movil', 'phone', 'validity_end', 'stade'])
```

- [ ] **Step 4: Ejecutar el test para verificar que pasa**

```bash
php artisan test tests/Feature/ExpiringTodayFieldsTest.php
```
Resultado esperado: PASS

---

## Task 2: Backend — Agregar `AppointmentController::today()`

**Files:**
- Modify: `app/Http/Controllers/AppointmentController.php` (agregar método al final de la clase, antes del cierre `}`)

- [ ] **Step 1: Escribir el test fallido**

Crear `tests/Feature/AppointmentTodayTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentTodayTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_todays_appointments(): void
    {
        $user   = User::factory()->create(['type' => 1]);
        $doctor = Doctor::factory()->create(['name' => 'Ana', 'lastname' => 'García']);

        Appointment::factory()->create([
            'date'      => Carbon::today()->toDateString(),
            'name'      => 'Paciente Hoy',
            'hour'      => '09:00',
            'doctor_id' => $doctor->id,
            'user_id'   => $user->id,
        ]);
        Appointment::factory()->create([
            'date'    => Carbon::tomorrow()->toDateString(),
            'name'    => 'Paciente Mañana',
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/appointments/today');

        $response->assertStatus(200)
                 ->assertJsonCount(1, 'data')
                 ->assertJsonPath('data.0.name', 'Paciente Hoy');
    }

    public function test_non_admin_only_sees_own_appointments(): void
    {
        $userA  = User::factory()->create(['type' => 2]);
        $userB  = User::factory()->create(['type' => 2]);
        $doctor = Doctor::factory()->create();
        $hoy    = Carbon::today()->toDateString();

        Appointment::factory()->create(['date' => $hoy, 'user_id' => $userA->id, 'doctor_id' => $doctor->id]);
        Appointment::factory()->create(['date' => $hoy, 'user_id' => $userB->id, 'doctor_id' => $doctor->id]);

        $response = $this->actingAs($userA)->getJson('/api/appointments/today');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
php artisan test tests/Feature/AppointmentTodayTest.php
```
Resultado esperado: FAIL — ruta no existe (404).

- [ ] **Step 3: Implementar el método `today()`**

En `app/Http/Controllers/AppointmentController.php`, agregar antes del último `}` de la clase:

```php
public function today()
{
    $hoy = Carbon::today()->toDateString();

    $query = Appointment::select(['id', 'name', 'hour', 'doctor_id'])
        ->with(['doctor:id,name,lastname'])
        ->where('date', $hoy)
        ->orderBy('hour');

    if (auth()->user()->type !== 1) {
        $query->where('user_id', auth()->id());
    }

    $appointments = $query->get();

    return response()->json([
        'message' => 'Citas del día',
        'data'    => $appointments,
        'date'    => $hoy,
    ], 200);
}
```

> `Carbon` ya está importado en `AppointmentController` (se usa en `index()`). No agregar nuevo `use`.

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

```bash
php artisan test tests/Feature/AppointmentTodayTest.php
```
Resultado esperado: PASS (2 tests)

---

## Task 3: Backend — Crear `DashboardController` con `stats()`

**Files:**
- Create: `app/Http/Controllers/DashboardController.php`

- [ ] **Step 1: Escribir el test fallido**

Crear `tests/Feature/DashboardStatsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Affiliate;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_receives_403(): void
    {
        $user = User::factory()->create(['type' => 2]);
        $this->actingAs($user)->getJson('/api/dashboard/stats')
             ->assertStatus(403);
    }

    public function test_admin_receives_correct_counts(): void
    {
        $user = User::factory()->create(['type' => 1]);
        $hoy  = Carbon::today()->toDateString();

        Affiliate::factory()->count(3)->create(['stade' => 1]);
        Affiliate::factory()->count(2)->create(['stade' => 2, 'validity_end' => Carbon::yesterday()->toDateString()]);
        Affiliate::factory()->create(['stade' => 2, 'validity_end' => Carbon::tomorrow()->toDateString()]);

        Appointment::factory()->count(4)->create(['date' => Carbon::now()->startOfMonth()->addDays(2)->toDateString()]);
        Appointment::factory()->create(['date' => Carbon::now()->subMonth()->toDateString()]); // mes anterior

        $response = $this->actingAs($user)->getJson('/api/dashboard/stats');

        $response->assertStatus(200)
                 ->assertJsonPath('data.affiliates.active', 3)
                 ->assertJsonPath('data.affiliates.inactive', 3)
                 ->assertJsonPath('data.affiliates.inactive_by_expiry', 2)
                 ->assertJsonPath('data.appointments.this_month', 4);
    }
}
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
php artisan test tests/Feature/DashboardStatsTest.php
```
Resultado esperado: FAIL — 404 (endpoint no existe).

- [ ] **Step 3: Crear el controlador con `stats()`**

Crear `app/Http/Controllers/DashboardController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Affiliate;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function stats()
    {
        if (auth()->user()->type !== 1) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $hoy       = Carbon::today()->toDateString();
        $inicioMes = Carbon::now()->startOfMonth()->toDateString();
        $finMes    = Carbon::now()->endOfMonth()->toDateString();

        $active           = Affiliate::where('stade', 1)->count();
        $inactive         = Affiliate::where('stade', 2)->count();
        $inactiveByExpiry = Affiliate::where('stade', 2)
                                ->where('validity_end', '<', $hoy)
                                ->count();
        $thisMonth = Appointment::whereBetween('date', [$inicioMes, $finMes])->count();

        return response()->json([
            'message' => 'Estadísticas del dashboard',
            'data'    => [
                'affiliates' => [
                    'active'             => $active,
                    'inactive'           => $inactive,
                    'inactive_by_expiry' => $inactiveByExpiry,
                ],
                'appointments' => [
                    'this_month' => $thisMonth,
                ],
            ],
        ], 200);
    }
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

```bash
php artisan test tests/Feature/DashboardStatsTest.php
```
Resultado esperado: PASS (2 tests)

---

## Task 4: Backend — Agregar `DashboardController::charts()`

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php` (agregar método a la clase existente)

> **Nota:** El filtro de afiliados para roles no-admin usa `user_id` (consistente con `expiringToday()` y el resto del sistema). La spec mencionó `counselor_id` pero el campo correcto según el código existente es `user_id`.

- [ ] **Step 1: Escribir el test fallido**

Crear `tests/Feature/DashboardChartsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Affiliate;
use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardChartsTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_12_month_arrays(): void
    {
        $user = User::factory()->create(['type' => 3]);

        $response = $this->actingAs($user)->getJson('/api/dashboard/charts?year=' . now()->year);

        $response->assertStatus(200)
                 ->assertJsonCount(12, 'data.appointments_by_month')
                 ->assertJsonCount(12, 'data.affiliates_by_month');
    }

    public function test_non_admin_does_not_receive_by_franchise(): void
    {
        $user = User::factory()->create(['type' => 2]);

        $response = $this->actingAs($user)->getJson('/api/dashboard/charts');

        $response->assertStatus(200)
                 ->assertJsonMissingPath('data.by_franchise');
    }

    public function test_admin_receives_by_franchise(): void
    {
        $admin     = User::factory()->create(['type' => 1]);
        User::factory()->create(['type' => 2, 'state' => 1]);

        $response = $this->actingAs($admin)->getJson('/api/dashboard/charts');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data' => ['by_franchise' => ['users', 'appointments_by_franchise', 'affiliates_by_franchise']]]);
    }

    public function test_non_admin_only_sees_own_data(): void
    {
        $userA = User::factory()->create(['type' => 2]);
        $userB = User::factory()->create(['type' => 2]);
        $year  = now()->year;

        Appointment::factory()->create(['date' => now()->toDateString(), 'user_id' => $userA->id]);
        Appointment::factory()->create(['date' => now()->toDateString(), 'user_id' => $userB->id]);

        $response = $this->actingAs($userA)->getJson("/api/dashboard/charts?year={$year}");

        $mes = (int) now()->format('n') - 1;
        $response->assertStatus(200)
                 ->assertJsonPath("data.appointments_by_month.{$mes}", 1);
    }
}
```

- [ ] **Step 2: Ejecutar el test para verificar que falla**

```bash
php artisan test tests/Feature/DashboardChartsTest.php
```
Resultado esperado: FAIL — 404 (método no existe).

- [ ] **Step 3: Agregar el método `charts()` al controlador**

En `app/Http/Controllers/DashboardController.php`, agregar antes del último `}`:

```php
public function charts(Request $request)
{
    $year = (int) $request->get('year', now()->year);
    $user = auth()->user();

    $apptQuery = Appointment::selectRaw('MONTH(date) as mes, COUNT(*) as total')
        ->whereYear('date', $year)
        ->groupBy('mes');

    $affilQuery = Affiliate::selectRaw('MONTH(sale_date) as mes, COUNT(*) as total')
        ->whereYear('sale_date', $year)
        ->groupBy('mes');

    if ($user->type !== 1) {
        $apptQuery->where('user_id', $user->id);
        $affilQuery->where('user_id', $user->id);
    }

    $appointmentsByMonth = array_fill(0, 12, 0);
    foreach ($apptQuery->get() as $row) {
        $appointmentsByMonth[$row->mes - 1] = (int) $row->total;
    }

    $affiliatesByMonth = array_fill(0, 12, 0);
    foreach ($affilQuery->get() as $row) {
        $affiliatesByMonth[$row->mes - 1] = (int) $row->total;
    }

    $data = [
        'appointments_by_month' => $appointmentsByMonth,
        'affiliates_by_month'   => $affiliatesByMonth,
    ];

    if ($user->type === 1) {
        $franchises = User::where('type', 2)->where('state', 1)->get(['id', 'name']);

        $appointmentsByFranchise = [];
        $affiliatesByFranchise   = [];

        foreach ($franchises as $franchise) {
            $months = array_fill(0, 12, 0);
            foreach (
                Appointment::selectRaw('MONTH(date) as mes, COUNT(*) as total')
                    ->whereYear('date', $year)
                    ->where('user_id', $franchise->id)
                    ->groupBy('mes')
                    ->get() as $row
            ) {
                $months[$row->mes - 1] = (int) $row->total;
            }
            $appointmentsByFranchise[] = $months;

            $months = array_fill(0, 12, 0);
            foreach (
                Affiliate::selectRaw('MONTH(sale_date) as mes, COUNT(*) as total')
                    ->whereYear('sale_date', $year)
                    ->where('user_id', $franchise->id)
                    ->groupBy('mes')
                    ->get() as $row
            ) {
                $months[$row->mes - 1] = (int) $row->total;
            }
            $affiliatesByFranchise[] = $months;
        }

        $data['by_franchise'] = [
            'users'                     => $franchises->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->values(),
            'appointments_by_franchise' => $appointmentsByFranchise,
            'affiliates_by_franchise'   => $affiliatesByFranchise,
        ];
    }

    return response()->json([
        'message' => 'Datos de gráficas',
        'data'    => $data,
    ], 200);
}
```

- [ ] **Step 4: Ejecutar los tests para verificar que pasan**

```bash
php artisan test tests/Feature/DashboardChartsTest.php
```
Resultado esperado: PASS (4 tests)

---

## Task 5: Backend — Registrar las nuevas rutas

**Files:**
- Modify: `routes/api.php`

- [ ] **Step 1: Agregar ruta `appointments/today` antes de `apiResource('appointments')`**

En `routes/api.php`, buscar la línea con `Route::apiResource('appointments', ...)` y agregar **antes** de ella:

```php
Route::get('appointments/today', [AppointmentController::class, 'today']);
```

> **Crítico:** La ruta `today` debe ir ANTES del `apiResource` para que Laravel no la interprete como `appointments/{appointment}` con `appointment = 'today'`.

- [ ] **Step 2: Agregar rutas del dashboard al final del grupo `auth:sanctum`**

Al final del grupo `auth:sanctum`, antes del cierre del `Route::middleware(['auth:sanctum'])->group(...)`:

```php
Route::get('dashboard/stats',  [DashboardController::class, 'stats']);
Route::get('dashboard/charts', [DashboardController::class, 'charts']);
```

- [ ] **Step 3: Agregar el import de `DashboardController` en `routes/api.php`**

Al inicio del archivo, junto a los otros `use`:

```php
use App\Http\Controllers\DashboardController;
```

- [ ] **Step 4: Verificar que las rutas están registradas**

```bash
php artisan route:list --path=api/dashboard
php artisan route:list --path=api/appointments/today
```
Resultado esperado: Las 3 rutas aparecen listadas con método GET y middleware `auth:sanctum`.

- [ ] **Step 5: Ejecutar todos los tests del backend**

```bash
php artisan test tests/Feature/ExpiringTodayFieldsTest.php tests/Feature/AppointmentTodayTest.php tests/Feature/DashboardStatsTest.php tests/Feature/DashboardChartsTest.php
```
Resultado esperado: PASS (todos los tests)

---

## Task 6: Frontend — Actualizar tipos y funciones de fetch

**Files:**
- Modify: `src/app/4dnn1n/affiliates/fetch.ts`
- Modify: `src/app/4dnn1n/home/fetch.ts`

- [ ] **Step 1: Agregar `movil` y `phone` al tipo `ExpiringAffiliate` en `affiliates/fetch.ts`**

En `src/app/4dnn1n/affiliates/fetch.ts`, ubicar la definición de `ExpiringAffiliate` y reemplazarla:

```typescript
// Antes:
export type ExpiringAffiliate = Pick<ApiAffiliate, 'id' | 'name' | 'lastname' | 'id_card' | 'validity_end'> & {
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
};

// Después:
export type ExpiringAffiliate = Pick<ApiAffiliate, 'id' | 'name' | 'lastname' | 'id_card' | 'movil' | 'phone' | 'validity_end'> & {
  counselor?: { id: number; name: string; lastname: string } | null;
  agreement?: { id: number; name: string } | null;
};
```

> Si `ApiAffiliate` no incluye `movil` y `phone`, agregarlos al tipo `ApiAffiliate` también.

- [ ] **Step 2: Agregar cache a `getExpiringToday()` en `affiliates/fetch.ts`**

Primero verificar que `memCache`, `TTL_LIST` están importados al inicio del archivo. Si no lo están, agregar:

```typescript
import { memCache, TTL_LIST } from '@/lib/memCache';
```

Luego reemplazar la función `getExpiringToday()`:

```typescript
export async function getExpiringToday(): Promise<ExpiringTodayResponse> {
  const cacheKey = 'affiliates:expiring-today';
  const cached = memCache.get<ExpiringTodayResponse>(cacheKey);
  if (cached) return cached;

  const res = await apiFetch<{ message: string; data: ExpiringAffiliate[]; date: string }>(
    '/api/affiliates/expiring-today',
  );
  const result = { data: res.data ?? [], date: res.date };
  memCache.set(cacheKey, result, TTL_LIST);
  return result;
}
```

- [ ] **Step 3: Agregar tipos y funciones nuevas en `home/fetch.ts`**

Verificar que `memCache`, `TTL_LIST`, `TTL_CATALOG` están importados en `home/fetch.ts`. Si no:

```typescript
import { memCache, TTL_LIST, TTL_CATALOG } from '@/lib/memCache';
```

Agregar al final del archivo `src/app/4dnn1n/home/fetch.ts`:

```typescript
// ─── Tipos Dashboard ─────────────────────────────────────────────────────────

export type TodayAppointment = {
  id: number;
  name: string;
  hour: string;
  doctor: { id: number; name: string; lastname: string };
};

export type TodayAppointmentsResponse = {
  data: TodayAppointment[];
  date: string;
};

export type DashboardStats = {
  affiliates: {
    active: number;
    inactive: number;
    inactive_by_expiry: number;
  };
  appointments: {
    this_month: number;
  };
};

export type DashboardCharts = {
  appointments_by_month: number[];
  affiliates_by_month: number[];
  by_franchise?: {
    users: { id: number; name: string }[];
    appointments_by_franchise: number[][];
    affiliates_by_franchise: number[][];
  };
};

// ─── Fetch functions ─────────────────────────────────────────────────────────

export async function getTodayAppointments(): Promise<TodayAppointmentsResponse> {
  const cacheKey = 'appointments:today';
  const cached = memCache.get<TodayAppointmentsResponse>(cacheKey);
  if (cached) return cached;

  const res = await apiFetch<{ message: string; data: TodayAppointment[]; date: string }>(
    '/api/appointments/today',
  );
  const result = { data: res.data ?? [], date: res.date };
  memCache.set(cacheKey, result, TTL_LIST);
  return result;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const cacheKey = 'dashboard:stats';
  const cached = memCache.get<DashboardStats>(cacheKey);
  if (cached) return cached;

  const res = await apiFetch<{ message: string; data: DashboardStats }>('/api/dashboard/stats');
  memCache.set(cacheKey, res.data, TTL_CATALOG);
  return res.data;
}

export async function getDashboardCharts(year: number): Promise<DashboardCharts> {
  const cacheKey = `dashboard:charts:${year}`;
  const cached = memCache.get<DashboardCharts>(cacheKey);
  if (cached) return cached;

  const res = await apiFetch<{ message: string; data: DashboardCharts }>(
    `/api/dashboard/charts?year=${year}`,
  );
  memCache.set(cacheKey, res.data, TTL_CATALOG);
  return res.data;
}
```

- [ ] **Step 4: Verificar que TypeScript no reporta errores**

```bash
cd frontend-cm
npx tsc --noEmit
```
Resultado esperado: sin errores de tipo.

---

## Task 7: Frontend — Crear `ExpiringTodayCardSkeleton` + rediseñar `ExpiringTodayCard`

**Files:**
- Create: `src/app/4dnn1n/home/_components/expiring-today-card-skeleton.tsx`
- Modify: `src/app/4dnn1n/home/_components/expiring-today-card.tsx`

- [ ] **Step 1: Crear el skeleton**

Crear `src/app/4dnn1n/home/_components/expiring-today-card-skeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function ExpiringTodayCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-3 w-20" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar completamente `expiring-today-card.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { getExpiringToday, type ExpiringAffiliate } from '@/app/4dnn1n/affiliates/fetch';
import { ExpiringTodayCardSkeleton } from './expiring-today-card-skeleton';

export function ExpiringTodayCard() {
  const [affiliates, setAffiliates] = useState<ExpiringAffiliate[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getExpiringToday().then(({ data, date }) => {
      setAffiliates(data);
      setDate(date);
      setLoading(false);
    });
  }, []);

  const startScroll = () => {
    const el = containerRef.current;
    if (!el || affiliates.length <= 5) return;
    intervalRef.current = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTop = 0;
      }
    }, 40);
  };

  const stopScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!loading) startScroll();
    return stopScroll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, affiliates.length]);

  if (loading) return <ExpiringTodayCardSkeleton />;

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Contratos que vencen hoy</h3>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>

      {affiliates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay contratos que vencen hoy
        </p>
      ) : (
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-[280px] flex flex-col gap-2 pr-1"
          onMouseEnter={stopScroll}
          onMouseLeave={startScroll}
          onTouchStart={stopScroll}
          onTouchEnd={startScroll}
        >
          {affiliates.map((affiliate) => (
            <div key={affiliate.id} className="flex items-center justify-between gap-2 py-1">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate">
                  {affiliate.name} {affiliate.lastname}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[affiliate.movil, affiliate.phone].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Link
                href={`/4dnn1n/affiliates/${affiliate.id}/edit`}
                className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
                title="Renovar"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Resultado esperado: sin errores.

---

## Task 8: Frontend — Crear `TodayAppointmentsCard` + skeleton

**Files:**
- Create: `src/app/4dnn1n/home/_components/today-appointments-card-skeleton.tsx`
- Create: `src/app/4dnn1n/home/_components/today-appointments-card.tsx`

- [ ] **Step 1: Crear el skeleton**

Crear `src/app/4dnn1n/home/_components/today-appointments-card-skeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function TodayAppointmentsCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
      <Skeleton className="h-4 w-40" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear el componente**

Crear `src/app/4dnn1n/home/_components/today-appointments-card.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { getTodayAppointments, type TodayAppointment } from '@/app/4dnn1n/home/fetch';
import { TodayAppointmentsCardSkeleton } from './today-appointments-card-skeleton';

export function TodayAppointmentsCard() {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getTodayAppointments().then(({ data }) => {
      setAppointments(data);
      setLoading(false);
    });
  }, []);

  const startScroll = () => {
    const el = containerRef.current;
    if (!el || appointments.length <= 5) return;
    intervalRef.current = setInterval(() => {
      el.scrollTop += 1;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        el.scrollTop = 0;
      }
    }, 40);
  };

  const stopScroll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!loading) startScroll();
    return stopScroll;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, appointments.length]);

  if (loading) return <TodayAppointmentsCardSkeleton />;

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-3 h-full">
      <h3 className="font-semibold text-sm">Citas pendientes del día</h3>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay citas para hoy
        </p>
      ) : (
        <div
          ref={containerRef}
          className="overflow-y-auto max-h-[280px] flex flex-col gap-2 pr-1"
          onMouseEnter={stopScroll}
          onMouseLeave={startScroll}
          onTouchStart={stopScroll}
          onTouchEnd={startScroll}
        >
          {appointments.map((appt) => (
            <div key={appt.id} className="flex items-center justify-between gap-2 py-1">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium leading-tight truncate">{appt.name}</span>
                <span className="text-xs text-muted-foreground">
                  {appt.hour} · {appt.doctor.name} {appt.doctor.lastname}
                </span>
              </div>
              <Link
                href={`/4dnn1n/appointments/${appt.id}`}
                className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
                title="Ver cita"
              >
                <Eye className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Resultado esperado: sin errores.

---

## Task 9: Frontend — Crear `StatsCards` + skeleton

**Files:**
- Create: `src/app/4dnn1n/home/_components/stats-cards-skeleton.tsx`
- Create: `src/app/4dnn1n/home/_components/stats-cards.tsx`

- [ ] **Step 1: Crear el skeleton**

Crear `src/app/4dnn1n/home/_components/stats-cards-skeleton.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-9 w-16" />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Crear el componente**

Crear `src/app/4dnn1n/home/_components/stats-cards.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, type DashboardStats } from '@/app/4dnn1n/home/fetch';
import { StatsCardsSkeleton } from './stats-cards-skeleton';

export function StatsCards() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.type !== 1) {
      setLoading(false);
      return;
    }
    getDashboardStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [user]);

  if (!user || user.type !== 1) return null;
  if (loading) return <StatsCardsSkeleton />;
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Afiliados activos</p>
        <p className="text-3xl font-bold text-green-600 mt-1">
          {stats.affiliates.active.toLocaleString('es-CO')}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Afiliados inactivos</p>
        <p className="text-3xl font-bold text-orange-500 mt-1">
          {stats.affiliates.inactive.toLocaleString('es-CO')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {stats.affiliates.inactive_by_expiry} por vencimiento de vigencia
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm text-muted-foreground">Citas este mes</p>
        <p className="text-3xl font-bold text-blue-600 mt-1">
          {stats.appointments.this_month.toLocaleString('es-CO')}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Resultado esperado: sin errores.

---

## Task 10: Frontend — Crear `ChartsSection`

**Files:**
- Create: `src/app/4dnn1n/home/_components/charts-section.tsx`

Este componente maneja el selector de año y las 4 gráficas (2 generales + 2 por franquicia solo para type=1). ApexCharts requiere `dynamic` import con `ssr: false` porque usa `window`.

- [ ] **Step 1: Crear el componente**

Crear `src/app/4dnn1n/home/_components/charts-section.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { getDashboardCharts, type DashboardCharts } from '@/app/4dnn1n/home/fetch';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function ChartSkeleton() {
  return <div className="h-64 animate-pulse bg-muted rounded-lg" />;
}

export function ChartsSection() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    getDashboardCharts(year).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [year]);

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Actividad</h2>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-sm border rounded-md px-2 py-1 bg-card"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Gráficas generales */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-medium text-sm mb-4">Citas por mes</h3>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ReactApexChart
              type="bar"
              height={256}
              options={{
                chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                xaxis: { categories: MESES },
                colors: ['#3b82f6'],
                plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 4 },
              }}
              series={[{ name: 'Citas', data: data?.appointments_by_month ?? [] }]}
            />
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-medium text-sm mb-4">Afiliados nuevos por mes</h3>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <ReactApexChart
              type="line"
              height={256}
              options={{
                chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                xaxis: { categories: MESES },
                colors: ['#10b981'],
                stroke: { curve: 'smooth', width: 2 },
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 4 },
                markers: { size: 4 },
              }}
              series={[{ name: 'Afiliados', data: data?.affiliates_by_month ?? [] }]}
            />
          )}
        </div>
      </div>

      {/* Gráficas por franquicia — solo type=1 */}
      {user?.type === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-medium text-sm mb-4">Citas por franquicia</h3>
            {loading || !data?.by_franchise ? (
              <ChartSkeleton />
            ) : (
              <ReactApexChart
                type="line"
                height={256}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                  xaxis: { categories: MESES },
                  stroke: { curve: 'smooth', width: 2 },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4 },
                  legend: { position: 'top' },
                  markers: { size: 3 },
                }}
                series={data.by_franchise.users.map((u, i) => ({
                  name: u.name,
                  data: data.by_franchise!.appointments_by_franchise[i],
                }))}
              />
            )}
          </div>

          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-medium text-sm mb-4">Afiliados nuevos por franquicia</h3>
            {loading || !data?.by_franchise ? (
              <ChartSkeleton />
            ) : (
              <ReactApexChart
                type="bar"
                height={256}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                  xaxis: { categories: MESES },
                  plotOptions: { bar: { borderRadius: 2, columnWidth: '70%' } },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4 },
                  legend: { position: 'top' },
                }}
                series={data.by_franchise.users.map((u, i) => ({
                  name: u.name,
                  data: data.by_franchise!.affiliates_by_franchise[i],
                }))}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Resultado esperado: sin errores.

---

## Task 11: Frontend — Actualizar `page.tsx`

**Files:**
- Modify: `src/app/4dnn1n/home/page.tsx`

Este paso reemplaza todos los componentes mock con los nuevos y establece el layout final del dashboard.

- [ ] **Step 1: Reemplazar el contenido completo de `page.tsx`**

```tsx
import { ExpiringTodayCard } from './_components/expiring-today-card';
import { TodayAppointmentsCard } from './_components/today-appointments-card';
import { StatsCards } from './_components/stats-cards';
import { ChartsSection } from './_components/charts-section';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Fila 1: Contratos que vencen hoy + Citas del día */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ExpiringTodayCard />
        <TodayAppointmentsCard />
      </div>

      {/* Fila 2: Métricas globales — se oculta automáticamente si no es type=1 */}
      <StatsCards />

      {/* Filas 3 y 4: Gráficas generales + por franquicia (dentro del mismo componente) */}
      <ChartsSection />
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Resultado esperado: sin errores.

- [ ] **Step 3: Iniciar el servidor de desarrollo y verificar el dashboard**

```bash
npm run dev
```

Verificar en el navegador (`http://localhost:3000/4dnn1n/home`):
1. Las dos tarjetas superiores aparecen lado a lado y muestran datos reales
2. Al iniciar sesión como `type = 1`: aparecen las 3 tarjetas de métricas y las 4 gráficas
3. Al iniciar sesión como `type = 2` o `3`: solo aparecen las 2 gráficas generales, sin métricas ni gráficas de franquicia
4. Los skeletons se ven durante la carga
5. Si hay más de 5 registros en alguna tarjeta, el auto-scroll funciona y se pausa al hacer hover
6. El selector de año actualiza todas las gráficas simultáneamente