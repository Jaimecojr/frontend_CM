# Loading Overlay — Panel Administrativo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un overlay de carga con logo y puntos animados mientras los módulos del panel admin traen datos de la API.

**Architecture:** Se actualiza el componente `LoadingOverlay` existente agregando logo, puntos animados y prop `isLoading`. Luego se conecta en `auth-layout.tsx` (validación de sesión) y en las 5 páginas de módulos. Los módulos con `useServerTable` (affiliates, doctors) usan `tableProps.loading`; los módulos con `useClientTable` (counselors, franchises, agreements) usan su `loading` directamente, reemplazando el `if (loading) return <div>Cargando...</div>` actual.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3, TypeScript

---

## File Map

| Archivo | Acción | Qué cambia |
|---|---|---|
| `src/components/LoadingOverlay.tsx` | Modificar | Rediseño: logo + dots animados + prop `isLoading` |
| `src/app/4dnn1n/auth-layout.tsx` | Modificar | Reemplazar div "Validando sesión" por `<LoadingOverlay>` |
| `src/app/4dnn1n/affiliates/page.tsx` | Modificar | Añadir `<LoadingOverlay isLoading={tableProps.loading}>` |
| `src/app/4dnn1n/doctors/page.tsx` | Modificar | Añadir `<LoadingOverlay isLoading={tableProps.loading}>` |
| `src/app/4dnn1n/counselors/page.tsx` | Modificar | Reemplazar early return por `<LoadingOverlay isLoading={loading}>` |
| `src/app/4dnn1n/franchises/page.tsx` | Modificar | Reemplazar early return por `<LoadingOverlay isLoading={loading}>` |
| `src/app/4dnn1n/agreements/page.tsx` | Modificar | Reemplazar early return por `<LoadingOverlay isLoading={loading}>` |

---

## Task 1: Rediseñar LoadingOverlay

**Files:**
- Modify: `src/components/LoadingOverlay.tsx`

- [ ] **Paso 1: Reemplazar el componente completo**

Reemplaza todo el contenido de `src/components/LoadingOverlay.tsx` con:

```tsx
"use client";

import Image from "next/image";

interface Props {
  isLoading?: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading = true, message = "Cargando" }: Props) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020d1a]">
      <Image
        src="/images/logo/logo-icon.svg"
        alt="Contacto Médico"
        width={80}
        height={80}
        className="animate-pulse mb-6"
        priority
      />
      <p className="flex items-end gap-[3px] text-lg font-semibold text-white">
        {message}
        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
      </p>
    </div>
  );
}
```

- [ ] **Paso 2: Verificar compatibilidad hacia atrás**

El uso existente en `auth-layout.tsx` es:
```tsx
<LoadingOverlay message="Cerrando sesión..." />
```
Sigue funcionando porque `isLoading` tiene `default = true`. No requiere cambio.

- [ ] **Paso 3: Commit**

```bash
git add src/components/LoadingOverlay.tsx
git commit -m "feat: rediseñar LoadingOverlay con logo y puntos animados"
```

---

## Task 2: Actualizar auth-layout — Validación de sesión

**Files:**
- Modify: `src/app/4dnn1n/auth-layout.tsx`

El archivo actual en las líneas 15–21 tiene:
```tsx
if (loading) {
  return (
    <div className="flex h-screen w-full items-center justify-center text-xl font-semibold">
      Validando sesión...
    </div>
  );
}
```

- [ ] **Paso 1: Reemplazar el bloque de validación de sesión**

Reemplaza ese bloque por:
```tsx
if (loading) return <LoadingOverlay message="Validando sesión" />;
```

El archivo completo queda así:

```tsx
"use client";

import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";
import { Providers } from "./providers";
import NextTopLoader from "nextjs-toploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function AuthLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading, isLoggingOut } = useRequireAuth();

  if (isLoggingOut) return <LoadingOverlay message="Cerrando sesión" />;

  if (loading) return <LoadingOverlay message="Validando sesión" />;

  if (!user) return null;

  return (
    <Providers>
      <NextTopLoader color="#5750F1" showSpinner={false} />

      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col bg-gray-2 dark:bg-[#020d1a]">
          <Header />

          <main className="isolate mx-auto w-full max-w-screen-2xl overflow-x-auto p-4 md:p-6 2xl:p-10">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add src/app/4dnn1n/auth-layout.tsx
git commit -m "feat: usar LoadingOverlay en validación de sesión del admin"
```

---

## Task 3: Módulos con useServerTable — affiliates y doctors

**Files:**
- Modify: `src/app/4dnn1n/affiliates/page.tsx`
- Modify: `src/app/4dnn1n/doctors/page.tsx`

Estos módulos usan `useServerTable`, que ya expone `tableProps.loading` (`true` en carga inicial y al cambiar filtro de estado, `false` en paginación/búsqueda). El DataTable skeleton cubre los casos soft.

- [ ] **Paso 1: Actualizar affiliates/page.tsx**

Añadir el import y el componente en el JSX. El archivo cambia en dos lugares:

**Import** (añadir al bloque de imports existentes):
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
```

**JSX** — el `return` actual abre con `<>`. Añadir el overlay como primer hijo:
```tsx
return (
  <>
    <LoadingOverlay isLoading={tableProps.loading} />

    <DataTable
      title="Lista de Usuarios"
      columns={columns}
      {...tableProps}
      searchPlaceholder="Buscar por nombre o documento..."
      stateFilterOptions={STATE_OPTIONS}
      toolbarActions={
        hasAccess ? (
          <CreateToolbarButton href="/4dnn1n/affiliates/new" label="Crear Afiliado" />
        ) : null
      }
    />

    {noteTarget && (
      <NoteModal
        affiliateId={noteTarget.id}
        affiliateName={`${noteTarget.name} ${noteTarget.lastname}`}
        onClose={() => setNoteTarget(null)}
      />
    )}
  </>
);
```

- [ ] **Paso 2: Actualizar doctors/page.tsx**

Mismo patrón. Añadir import:
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
```

En el `return`, el JSX actual abre con `<>` y tiene un `<div className="mb-4...">` seguido del `<DataTable>`. Añadir el overlay como primer hijo:
```tsx
return (
  <>
    <LoadingOverlay isLoading={tableProps.loading} />

    <div className="mb-4 flex justify-end">
      {hasAccess && (
        <Link href="/4dnn1n/doctors/specialties">
          <Button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark hover:shadow-1 dark:border-dark-3 dark:text-white"
          >
            <Settings className="h-4 w-4" />
            Gestionar Especialidades
          </Button>
        </Link>
      )}
    </div>

    <DataTable
      title="Directorio de Médicos"
      columns={columns}
      {...tableProps}
      searchPlaceholder="Buscar por nombre o apellido..."
      enableStateFilter={true}
      stateFilterOptions={STATE_OPTIONS}
      extraFilters={extraFilters}
      toolbarActions={
        hasAccess ? <CreateToolbarButton href="/4dnn1n/doctors/new" label="Crear Médico" /> : null
      }
    />
  </>
);
```

- [ ] **Paso 3: Commit**

```bash
git add src/app/4dnn1n/affiliates/page.tsx src/app/4dnn1n/doctors/page.tsx
git commit -m "feat: añadir LoadingOverlay en módulos affiliates y doctors"
```

---

## Task 4: Módulos con useClientTable — counselors, franchises, agreements

**Files:**
- Modify: `src/app/4dnn1n/counselors/page.tsx`
- Modify: `src/app/4dnn1n/franchises/page.tsx`
- Modify: `src/app/4dnn1n/agreements/page.tsx`

Estos módulos usan `useClientTable`, que expone `loading` (true durante la única carga inicial). Actualmente tienen `if (loading) return <div>Cargando...</div>` — se elimina ese early return y se reemplaza por el overlay dentro del JSX.

- [ ] **Paso 1: Actualizar counselors/page.tsx**

Añadir import:
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
```

Eliminar la línea:
```tsx
if (loading) return <div className="p-6">Cargando...</div>;
```

Cambiar el `return` para incluir el overlay:
```tsx
return (
  <>
    <LoadingOverlay isLoading={loading} />

    <DataTable
      title="Lista Asesores"
      columns={columns}
      data={data}
      defaultPageSize={20}
      pageSizeOptions={[20, 25, 50, 100]}
      searchPlaceholder="Buscar por nombre o cédula..."
      getSearchText={(c) => `${c.name} ${c.lastname} ${c.id_card} ${c.email ?? ""}`}
      enableStateFilter={true}
      getStateValue={(c) => Number(c.state)}
      toolbarActions={
        hasAccess ? (
          <CreateToolbarButton href="/4dnn1n/counselors/new" label="Crear Asesor" />
        ) : null
      }
    />
  </>
);
```

- [ ] **Paso 2: Actualizar franchises/page.tsx**

Añadir import:
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
```

Eliminar:
```tsx
if (loading) return <div className="p-6">Cargando...</div>;
```

Cambiar el `return`:
```tsx
return (
  <>
    <LoadingOverlay isLoading={loading} />

    <DataTable
      title="Lista Franquicias"
      columns={columns}
      data={data}
      defaultPageSize={20}
      pageSizeOptions={[20, 25, 50, 100]}
      searchPlaceholder="Buscar por nombre o email..."
      getSearchText={(u) => `${u.name} ${u.email}`}
      enableStateFilter={true}
      getStateValue={(u) => Number(u.state)}
      toolbarActions={
        isSuperAdmin ? (
          <CreateToolbarButton href="/4dnn1n/franchises/new" label="Crear Franquicia" />
        ) : null
      }
    />
  </>
);
```

- [ ] **Paso 3: Actualizar agreements/page.tsx**

Añadir import:
```tsx
import { LoadingOverlay } from "@/components/LoadingOverlay";
```

Eliminar:
```tsx
if (loading) return <div className="p-6">Cargando...</div>;
```

Cambiar el `return`:
```tsx
return (
  <>
    <LoadingOverlay isLoading={loading} />

    <DataTable
      title="Lista de Convenios"
      columns={columns}
      data={data}
      defaultPageSize={20}
      pageSizeOptions={[20, 25, 50, 100]}
      searchPlaceholder="Buscar por nombre o ciudad..."
      getSearchText={(c) => `${c.name} ${c.city?.name ?? ""}`}
      enableStateFilter={true}
      getStateValue={(c) => Number(c.state)}
      stateFilterOptions={STATE_OPTIONS}
      toolbarActions={
        canManage ? (
          <CreateToolbarButton href="/4dnn1n/agreements/new" label="Crear Convenio" />
        ) : null
      }
    />
  </>
);
```

- [ ] **Paso 4: Commit**

```bash
git add src/app/4dnn1n/counselors/page.tsx src/app/4dnn1n/franchises/page.tsx src/app/4dnn1n/agreements/page.tsx
git commit -m "feat: añadir LoadingOverlay en módulos counselors, franchises y agreements"
```

---

## Verificación final

- [ ] Correr el servidor de desarrollo: `npm run dev` en `frontend-cm/`
- [ ] Navegar a `/4dnn1n/affiliates` — debe aparecer el overlay con logo y puntos animados mientras carga, luego desaparecer
- [ ] Navegar a `/4dnn1n/doctors` — mismo comportamiento
- [ ] Navegar a `/4dnn1n/counselors`, `/4dnn1n/franchises`, `/4dnn1n/agreements` — mismo comportamiento
- [ ] Cerrar sesión — el overlay con "Cerrando sesión..." debe verse (ya funcionaba antes)
- [ ] Recargar página estando en el admin — el overlay "Validando sesión..." debe verse brevemente
