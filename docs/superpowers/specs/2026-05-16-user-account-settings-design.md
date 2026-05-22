# Diseño: Módulo de Configuración de Cuenta de Usuario

**Fecha:** 2026-05-16
**Estado:** Aprobado

---

## Resumen

Módulo que permite al usuario autenticado actualizar su nombre de usuario y contraseña desde el panel administrativo. Accesible vía "Configuración" en el dropdown del header. La página "Ver Perfil" se elimina del dropdown.

---

## Cambios en el Header (`UserInfo`)

**Archivo:** `src/components/Layouts/header/user-info/index.tsx`

- Eliminar el link "Ver Perfil" (`/profile`) del dropdown.
- Corregir el link "Configuración" de `/pages/settings` → `/4dnn1n/account`.

---

## Frontend

### Ruta
`/4dnn1n/account` → `src/app/4dnn1n/account/page.tsx`

### Estructura de la página

Página con título "Configuración de cuenta" y dos secciones independientes (cards):

#### Sección A — Nombre de usuario
- Campo pre-cargado con `user.user` (el username actual del usuario autenticado).
- Validación frontend: requerido, mínimo 3 caracteres.
- Botón "Guardar cambios".
- Al enviar: `PATCH /api/users/{user.id}` con body `{ user: "nuevo_username" }`.
- Manejo de errores:
  - `errors.user` del backend (username ya existe) → mensaje inline bajo el campo.
  - Error genérico → alerta de error.
- Al guardar exitosamente: llama `refreshUser()` del `AuthContext` para actualizar el nombre en el header, luego `router.push('/4dnn1n/home')`.

#### Sección B — Contraseña
- Inicialmente colapsada. Botón "Cambiar contraseña" la despliega.
- Tres campos al desplegar:
  1. Contraseña actual (`current_password`)
  2. Nueva contraseña (`new_password`, mínimo 6 chars)
  3. Confirmar nueva contraseña (`confirm_password`)
- Validación frontend:
  - `new_password` mínimo 6 caracteres.
  - `new_password === confirm_password` (si no coinciden, error inline antes de llamar al API).
- Al enviar: `POST /api/user/change-password` con body `{ current_password, new_password }`.
- Manejo de errores:
  - 422 del backend (contraseña actual incorrecta) → mensaje inline bajo el campo `current_password`.
  - Error genérico → alerta de error.
- Al guardar exitosamente: colapsa la sección, limpia los campos, luego `router.push('/4dnn1n/home')`.

### Fetch
`src/app/4dnn1n/account/fetch.ts`

Dos funciones:
- `updateUsername(userId: number, username: string): Promise<void>` — wrappea `apiFetch` con `PATCH /api/users/{id}`.
- `changePassword(currentPassword: string, newPassword: string): Promise<void>` — wrappea `apiFetch` con `POST /api/user/change-password`.

---

## Backend

### Nuevo endpoint

**Ruta:** `POST /api/user/change-password`
**Controlador:** `UserController@changePassword`
**Middleware:** `auth:sanctum`

**Lógica:**
1. Toma el usuario autenticado con `$request->user()`.
2. Valida `current_password` (required, string) y `new_password` (required, string, min:6).
3. Verifica `Hash::check($request->current_password, $user->password)` → si falla retorna 422 con `errors.current_password = ['La contraseña actual es incorrecta.']`.
4. Actualiza `$user->password = Hash::make($request->new_password)`.
5. Retorna 200 con `{ message: 'Contraseña actualizada correctamente' }`.

**Ruta en `api.php`:** añadir dentro del grupo `auth:sanctum`:
```php
Route::post('user/change-password', [UserController::class, 'changePassword']);
```

### Endpoint existente reutilizado

`PATCH /api/users/{id}` (`UserController@update`) — ya valida unicidad de `user` field con `unique:users,user,{id}` (ignora el propio registro). No requiere cambios.

---

## Notas de implementación

- El campo `user.id` viene del `AuthContext` → `user.id`.
- No se necesita middleware adicional; la página está dentro del grupo `/4dnn1n/*` que ya tiene protección por `middleware.ts`.
- No añadir `useRequireAuth()` si el layout padre ya lo gestiona — revisar al implementar.
- Después de `refreshUser()` el header actualiza el nombre de usuario automáticamente sin reload.
- Los campos de contraseña se limpian con `useState` local al colapsar la sección.
