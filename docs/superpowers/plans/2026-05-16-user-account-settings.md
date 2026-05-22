# User Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el módulo `/4dnn1n/account` para que el usuario autenticado pueda cambiar su nombre de usuario y contraseña, y actualizar el header dropdown para remover "Ver Perfil" y apuntar "Configuración" a la nueva ruta.

**Architecture:** El backend recibe un método nuevo `changePassword` en `UserController` que verifica la contraseña actual antes de actualizarla. El frontend tiene una página con dos secciones independientes: username (siempre visible) y contraseña (toggle). Cada sección envía su propio request al API.

**Tech Stack:** Laravel 12 (PHP), Next.js 16, React 19, TypeScript, Tailwind CSS, Sanctum CSRF, SweetAlert2.

---

## File Map

| Acción | Archivo |
|--------|---------|
| Modificar | `api-cm/app/Http/Controllers/UserController.php` |
| Modificar | `api-cm/routes/api.php` |
| Crear | `api-cm/tests/Feature/ChangePasswordTest.php` |
| Modificar | `frontend-cm/src/components/Layouts/header/user-info/index.tsx` |
| Crear | `frontend-cm/src/app/4dnn1n/account/fetch.ts` |
| Crear | `frontend-cm/src/app/4dnn1n/account/page.tsx` |

---

## Task 1: Backend — método `changePassword` en `UserController`

**Files:**
- Modify: `api-cm/app/Http/Controllers/UserController.php`
- Modify: `api-cm/routes/api.php`
- Create: `api-cm/tests/Feature/ChangePasswordTest.php`

- [ ] **Step 1: Crear el test**

Crear `api-cm/tests/Feature/ChangePasswordTest.php` con el siguiente contenido:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ChangePasswordTest extends TestCase
{
    private function makeUser(string $password = 'secret123'): User
    {
        return User::factory()->create([
            'password' => Hash::make($password),
        ]);
    }

    public function test_cambia_password_con_credenciales_correctas(): void
    {
        $user = $this->makeUser('secret123');

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'current_password' => 'secret123',
            'new_password'     => 'nueva456',
        ]);

        $response->assertStatus(200);
        $response->assertJsonFragment(['message' => 'Contraseña actualizada correctamente']);
        $this->assertTrue(Hash::check('nueva456', $user->fresh()->password));
    }

    public function test_retorna_422_con_password_actual_incorrecta(): void
    {
        $user = $this->makeUser('secret123');

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'current_password' => 'equivocada',
            'new_password'     => 'nueva456',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['current_password']);
    }

    public function test_retorna_422_con_new_password_menor_a_6_caracteres(): void
    {
        $user = $this->makeUser('secret123');

        $response = $this->actingAs($user)->postJson('/api/user/change-password', [
            'current_password' => 'secret123',
            'new_password'     => '123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['new_password']);
    }

    public function test_retorna_401_sin_autenticacion(): void
    {
        $response = $this->postJson('/api/user/change-password', [
            'current_password' => 'secret123',
            'new_password'     => 'nueva456',
        ]);

        $response->assertStatus(401);
    }
}
```

- [ ] **Step 2: Verificar que el test falla**

```bash
cd api-cm && php artisan test --filter=ChangePasswordTest
```

Resultado esperado: 4 tests, todos FAIL con "Route [api/user/change-password] not defined" o similar.

- [ ] **Step 3: Agregar método `changePassword` a `UserController`**

En `api-cm/app/Http/Controllers/UserController.php`, añadir el siguiente método al final de la clase (antes del cierre `}`):

```php
public function changePassword(Request $request)
{
    $user = $request->user();

    $validator = Validator::make($request->all(), [
        'current_password' => 'required|string',
        'new_password'     => 'required|string|min:6',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Error en la validación',
            'errors'  => $validator->errors(),
        ], 422);
    }

    if (!Hash::check($request->current_password, $user->password)) {
        return response()->json([
            'message' => 'Error en la validación',
            'errors'  => ['current_password' => ['La contraseña actual es incorrecta.']],
        ], 422);
    }

    $user->password = Hash::make($request->new_password);
    $user->save();

    return response()->json([
        'message' => 'Contraseña actualizada correctamente',
    ], 200);
}
```

- [ ] **Step 4: Registrar la ruta en `api.php`**

En `api-cm/routes/api.php`, dentro del grupo `Route::middleware('auth:sanctum')->group(function () {`, añadir la siguiente línea justo después de `Route::apiResource('users', UserController::class);`:

```php
Route::post('user/change-password', [UserController::class, 'changePassword']);
```

- [ ] **Step 5: Correr los tests y verificar que pasan**

```bash
php artisan test --filter=ChangePasswordTest
```

Resultado esperado: `4 tests, 4 passed`.

- [ ] **Step 6: Verificar que no se rompieron otros tests**

```bash
php artisan test
```

Resultado esperado: todos los tests existentes siguen en PASS.

- [ ] **Step 7: Commit backend**

```bash
cd api-cm
git add app/Http/Controllers/UserController.php routes/api.php tests/Feature/ChangePasswordTest.php
git commit -m "feat: agregar endpoint change-password con verificación de contraseña actual"
```

---

## Task 2: Frontend — `account/fetch.ts`

**Files:**
- Create: `frontend-cm/src/app/4dnn1n/account/fetch.ts`

- [ ] **Step 1: Crear el archivo**

Crear `frontend-cm/src/app/4dnn1n/account/fetch.ts` con el siguiente contenido:

```typescript
import { apiFetch, csrf } from "@/lib/api";

export async function updateUsername(userId: number, username: string): Promise<void> {
  await csrf();
  await apiFetch(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ user: username }),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await csrf();
  await apiFetch("/api/user/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}
```

- [ ] **Step 2: Verificar que compila sin errores**

```bash
cd frontend-cm && npx tsc --noEmit
```

Resultado esperado: sin errores de tipos.

---

## Task 3: Frontend — página `account/page.tsx`

**Files:**
- Create: `frontend-cm/src/app/4dnn1n/account/page.tsx`

- [ ] **Step 1: Crear la página**

Crear `frontend-cm/src/app/4dnn1n/account/page.tsx` con el siguiente contenido:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, KeyRound, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { updateUsername, changePassword } from "./fetch";

export default function AccountPage() {
  usePageTitle("Configuración de cuenta");

  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // ── Sección A: nombre de usuario ──────────────────────────────
  const [username, setUsername] = useState(user?.user ?? "");
  const [usernameError, setUsernameError] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Sección B: contraseña ─────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");

    if (username.trim().length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres.");
      return;
    }

    setSavingUsername(true);
    try {
      await updateUsername(user!.id, username.trim());
      await refreshUser();
      await alert.success("Guardado", "Nombre de usuario actualizado correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: any) {
      const fieldErr = err?.data?.errors?.user;
      if (fieldErr) {
        setUsernameError(Array.isArray(fieldErr) ? fieldErr[0] : String(fieldErr));
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingUsername(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof passwordErrors = {};

    if (newPassword.length < 6) {
      errs.new = "La contraseña debe tener al menos 6 caracteres.";
    }
    if (newPassword !== confirmPassword) {
      errs.confirm = "Las contraseñas no coinciden.";
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      return;
    }

    setPasswordErrors({});
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
      await alert.success("Guardado", "Contraseña actualizada correctamente.");
      router.push("/4dnn1n/home");
    } catch (err: any) {
      const currentErr = err?.data?.errors?.current_password;
      if (currentErr) {
        setPasswordErrors({
          current: Array.isArray(currentErr) ? currentErr[0] : String(currentErr),
        });
      } else {
        await alert.error("Error", getApiErrorMessage(err));
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePasswordSection = () => {
    setShowPasswordSection((v) => !v);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
  };

  return (
    <div className="space-y-6">
      {/* ── Sección A: nombre de usuario ── */}
      <ShowcaseSection
        title="Nombre de usuario"
        description="Actualiza el nombre de usuario con el que accedes al panel."
      >
        <form onSubmit={handleSaveUsername} className="max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium text-dark dark:text-white">
              Nombre de usuario <span className="text-red-500">*</span>
            </label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError("");
              }}
              minLength={3}
              required
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
            {usernameError && (
              <p className="mt-1 text-sm text-red-500">{usernameError}</p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingUsername}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingUsername ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </ShowcaseSection>

      {/* ── Sección B: contraseña ── */}
      <ShowcaseSection
        title="Contraseña"
        description="Cambia tu contraseña de acceso al panel."
        actions={
          <button
            type="button"
            onClick={togglePasswordSection}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stroke px-3 py-1.5 text-sm text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            {showPasswordSection ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showPasswordSection ? "Cancelar" : "Cambiar contraseña"}
          </button>
        }
      >
        {showPasswordSection ? (
          <form onSubmit={handleSavePassword} className="max-w-md space-y-4">
            {/* Contraseña actual */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Contraseña actual <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, current: undefined }));
                  }}
                  required
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.current && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.current}</p>
              )}
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, new: undefined }));
                  }}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.new && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.new}</p>
              )}
            </div>

            {/* Confirmar nueva contraseña */}
            <div>
              <label className="text-sm font-medium text-dark dark:text-white">
                Confirmar nueva contraseña <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordErrors((p) => ({ ...p, confirm: undefined }));
                  }}
                  required
                  className="w-full rounded-lg border border-stroke px-3 py-2 pr-10 text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordErrors.confirm && (
                <p className="mt-1 text-sm text-red-500">{passwordErrors.confirm}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {savingPassword ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Haz clic en &quot;Cambiar contraseña&quot; para actualizar tu contraseña de acceso.
          </p>
        )}
      </ShowcaseSection>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que compila sin errores de tipos**

```bash
cd frontend-cm && npx tsc --noEmit
```

Resultado esperado: sin errores de tipos.

- [ ] **Step 3: Commit frontend page**

```bash
cd frontend-cm
git add src/app/4dnn1n/account/
git commit -m "feat: agregar página de configuración de cuenta (username + contraseña)"
```

---

## Task 4: Frontend — actualizar header dropdown

**Files:**
- Modify: `frontend-cm/src/components/Layouts/header/user-info/index.tsx`

- [ ] **Step 1: Editar `user-info/index.tsx`**

En `frontend-cm/src/components/Layouts/header/user-info/index.tsx`:

1. **Eliminar** el bloque completo del link "Ver Perfil" (líneas 79–87):
```tsx
<Link
  href="/profile"
  className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-3"
  onClick={() => setIsOpen(false)}
>
  <UserIcon className="h-5 w-5" />
  Ver Perfil
</Link>
```

2. **Cambiar** el `href` del link "Configuración" de `/pages/settings` a `/4dnn1n/account`:
```tsx
<Link
  href="/4dnn1n/account"
  className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-3"
  onClick={() => setIsOpen(false)}
>
  <SettingsIcon className="h-5 w-5" />
  Configuración
</Link>
```

El import de `UserIcon` en la línea 12 ya no se usa — eliminarlo también:
```tsx
// Antes:
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";

// Después:
import { LogOutIcon, SettingsIcon } from "./icons";
```

- [ ] **Step 2: Verificar que compila sin errores de tipos**

```bash
cd frontend-cm && npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 3: Commit header**

```bash
cd frontend-cm
git add src/components/Layouts/header/user-info/index.tsx
git commit -m "feat: actualizar dropdown header — quitar 'Ver Perfil', apuntar 'Configuración' a /4dnn1n/account"
```

---

## Self-Review

**Spec coverage:**
- ✅ Eliminar "Ver Perfil" del dropdown → Task 4
- ✅ Corregir link "Configuración" a `/4dnn1n/account` → Task 4
- ✅ Sección A: username pre-cargado, validación min 3 chars, error inline de unicidad → Task 3
- ✅ `refreshUser()` después de cambiar username → Task 3, `handleSaveUsername`
- ✅ Redirect a `/4dnn1n/home` tras éxito → Task 3, ambos handlers
- ✅ Sección B: colapsable, 3 campos con toggle de visibilidad → Task 3
- ✅ Validación frontend: min 6 chars, coincidencia → Task 3, `handleSavePassword`
- ✅ Endpoint `POST /api/user/change-password` con `Hash::check` → Task 1
- ✅ Error inline `current_password` desde backend → Task 3, catch block
- ✅ Tests backend: correcto / contraseña incorrecta / nueva corta / sin auth → Task 1

**Placeholders:** Ninguno.

**Consistencia de tipos:**
- `updateUsername(userId: number, username: string)` — `user!.id` (number) ✅
- `changePassword(currentPassword, newPassword)` — strings ✅
- `err?.data?.errors?.user` / `err?.data?.errors?.current_password` — coincide con estructura `ApiError.data.errors` ✅
