# Loading Overlay — Panel Administrativo

**Fecha:** 2026-05-06  
**Alcance:** Solo panel admin (`/4dnn1n`), no web pública

---

## Objetivo

Mostrar un overlay de carga con branding mientras los módulos del admin traen datos de la API, mejorando la percepción de velocidad y reforzando identidad visual.

## Componente

**Archivo:** `src/components/LoadingOverlay.tsx`

**Props:**
```ts
interface Props {
  isLoading?: boolean;   // default true; retorna null cuando false
  message?: string;      // default "Cargando"
}
```

**Visual:**
- Fondo: `bg-[#020d1a]` opaco al 100% (cubre sidebar y header completamente)
- `fixed inset-0 z-[9999]`
- Logo: `<Image src="/images/logo/logo-icon.svg" width={80} height={80} />` con `animate-pulse`
- Texto: `"{message}"` + 3 `<span>` con `animate-bounce` y delays `0ms / 150ms / 300ms`

**Compatibilidad hacia atrás:** El uso existente `<LoadingOverlay message="Cerrando sesión..." />` sigue funcionando (isLoading por defecto true).

## Cambios por archivo

| Archivo | Cambio |
|---|---|
| `src/components/LoadingOverlay.tsx` | Rediseño completo con logo + dots animados |
| `src/app/4dnn1n/auth-layout.tsx` | Reemplazar div de "Validando sesión..." por `<LoadingOverlay message="Validando sesión" />` |
| `src/app/4dnn1n/affiliates/page.tsx` | Añadir `<LoadingOverlay isLoading={tableProps.loading} />` |
| `src/app/4dnn1n/doctors/page.tsx` | Ídem |
| `src/app/4dnn1n/counselors/page.tsx` | Ídem |
| `src/app/4dnn1n/franchises/page.tsx` | Ídem |
| `src/app/4dnn1n/agreements/page.tsx` | Ídem |

## Lógica de activación en módulos

`tableProps.loading` del hook `useServerTable` es `true` en:
- Carga inicial del módulo
- Cambio de filtro de estado (Activos/Inactivos)

Es `false` en paginación y búsqueda (DataTable skeleton cubre esos casos).

## Fuera de alcance

- Dashboard (`/4dnn1n/home`) — evaluar después
- Web pública — nunca
