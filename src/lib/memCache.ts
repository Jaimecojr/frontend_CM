/**
 * Caché en memoria con TTL (tiempo de vida).
 *
 * Funciona como una nevera: guarda el resultado de una petición por un tiempo
 * determinado. Mientras el dato no haya expirado, se devuelve el guardado
 * en lugar de volver a llamar al servidor.
 *
 * Es un singleton de módulo — todas las importaciones comparten la misma
 * tienda, así que `getDepartments` en affiliates/fetch.ts y en counselors/fetch.ts
 * usan la misma entrada de caché.
 */

type CacheEntry = { data: unknown; expiresAt: number };

const store = new Map<string, CacheEntry>();

export const memCache = {
  /**
   * Devuelve el valor cacheado si aún es válido, o ejecuta `fn`, guarda
   * el resultado y lo devuelve.
   *
   * @param key    Identificador único de la entrada (ej. 'departments', 'cities:5')
   * @param ttlMs  Tiempo de vida en milisegundos (ej. 5 * 60_000 = 5 minutos)
   * @param fn     Función async que hace la petición real si no hay caché
   */
  async get<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const hit = store.get(key);
    if (hit && Date.now() < hit.expiresAt) return hit.data as T;

    const data = await fn();
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  },

  /** Elimina una entrada específica para forzar recarga en la próxima llamada. */
  invalidate(key: string): void {
    store.delete(key);
  },

  /** Elimina todas las entradas cuya clave empiece por `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};

// ─── TTLs estándar ────────────────────────────────────────────────────────────

/** Departamentos y ciudades: datos geográficos, nunca cambian en el sistema. */
export const TTL_GEO = 30 * 60_000; // 30 min

/** Catálogos operativos: especialidades, convenios, asesores, franquicias. */
export const TTL_CATALOG = 5 * 60_000; // 5 min

/** Listas paginadas: afiliados, médicos, citas. Corto para no mostrar datos muy desactualizados. */
export const TTL_LIST = 2 * 60_000; // 2 min
