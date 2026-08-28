import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memCache } from "@/lib/memCache";

// El store es un Map a nivel de módulo (singleton compartido entre todos los
// tests del archivo), así que cada test usa una clave propia con un prefijo
// único para no pisar el estado de otro test.

describe("memCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el valor cacheado en una segunda llamada dentro del TTL sin volver a invocar fn", async () => {
    const key = "get:vigente";
    const fn = vi.fn().mockResolvedValue("valor-original");

    const primero = await memCache.get(key, 5_000, fn);
    const segundo = await memCache.get(key, 5_000, fn);

    expect(primero).toBe("valor-original");
    expect(segundo).toBe("valor-original");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("vuelve a invocar fn cuando el TTL ya expiró", async () => {
    const key = "get:expira";
    const fn = vi.fn().mockResolvedValueOnce("primero").mockResolvedValueOnce("segundo");

    const primero = await memCache.get(key, 1_000, fn);
    expect(primero).toBe("primero");

    // Avanza el tiempo más allá del TTL sin esperas reales.
    vi.advanceTimersByTime(1_001);

    const segundo = await memCache.get(key, 1_000, fn);
    expect(segundo).toBe("segundo");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("vuelve a invocar fn tras invalidatePrefix con un prefijo que coincide con la clave", async () => {
    const key = "invalidate-match:departments:5";
    const fn = vi.fn().mockResolvedValueOnce("valor-viejo").mockResolvedValueOnce("valor-nuevo");

    const primero = await memCache.get(key, 60_000, fn);
    expect(primero).toBe("valor-viejo");

    memCache.invalidatePrefix("invalidate-match:departments");

    const segundo = await memCache.get(key, 60_000, fn);
    expect(segundo).toBe("valor-nuevo");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("sigue devolviendo el valor cacheado si invalidatePrefix no coincide con la clave", async () => {
    const key = "invalidate-miss:cities:5";
    const fn = vi.fn().mockResolvedValue("valor-intacto");

    const primero = await memCache.get(key, 60_000, fn);
    expect(primero).toBe("valor-intacto");

    memCache.invalidatePrefix("invalidate-miss:departments");

    const segundo = await memCache.get(key, 60_000, fn);
    expect(segundo).toBe("valor-intacto");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
