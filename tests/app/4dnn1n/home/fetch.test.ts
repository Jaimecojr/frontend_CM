import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { memCache, TTL_LIST, TTL_CATALOG } from "@/lib/memCache";
import type {
  TodayAppointment,
  DashboardStats,
  DashboardCharts,
} from "@/app/4dnn1n/home/fetch";
import type { AuthUser } from "@/context/AuthContext";

// `home/fetch.ts` does NOT import from `@/lib/api` — it reimplements its own
// csrf()/apiFetch() against the global `fetch`. So we mock `fetch` itself
// instead of `@/lib/api`.
vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key: string, ttl: number, fn: () => unknown) => fn()) },
  TTL_LIST: 120000,
  TTL_CATALOG: 300000,
}));

/** Builds a minimal `Response`-shaped object for `vi.fn().mockResolvedValue(...)`. */
function fakeResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("home/fetch", () => {
  beforeEach(() => {
    // Resets the module registry so every test starts with a fresh
    // module-scoped `csrfPromise` (see home/fetch.ts) instead of inheriting
    // one already resolved/rejected by a previous test.
    vi.resetModules();
    // `vi.resetModules()` does not clear mock call history, so without this
    // the `memCache.get` spy (and any other mock) keeps accumulating calls
    // across every test in this file — assertions like
    // `expect(memCache.get).toHaveBeenCalledWith(...)` would then only prove
    // the call happened somewhere in the file's run, not in the current test.
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
  });

  // ──── Step 1: Test for getXsrfToken ────
  describe("getXsrfToken", () => {
    it("retorna el valor decodificado de la cookie XSRF-TOKEN", async () => {
      // Arrange
      document.cookie = "XSRF-TOKEN=token%3Dabc123";
      const { getXsrfToken } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = getXsrfToken();

      // Assert
      expect(result).toBe("token=abc123");
    });

    it("retorna null cuando no existe la cookie", async () => {
      // Arrange
      const { getXsrfToken } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = getXsrfToken();

      // Assert
      expect(result).toBeNull();
    });
  });

  // ──── Step 2: Test for csrf() idempotency ────
  describe("csrf", () => {
    it("dispara una sola petición de red aunque se llame varias veces en la misma sesión de módulo", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(204, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { csrf } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await csrf();
      await csrf();

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/sanctum/csrf-cookie"),
        expect.objectContaining({ method: "GET", credentials: "include" }),
      );
    });
  });

  // ──── Step 3: Tests for apiFetch — headers by method ────
  describe("apiFetch - headers por método", () => {
    it("no incluye Content-Type en una petición GET", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await apiFetch("/user");

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });

    it("incluye Content-Type: application/json en una petición POST con body", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await apiFetch("/algo", { method: "POST", body: "{}" });

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });

    it("incluye X-XSRF-TOKEN vacío cuando no hay cookie", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await apiFetch("/user");

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>)["X-XSRF-TOKEN"]).toBe("");
    });

    it("incluye X-XSRF-TOKEN con el valor decodificado de la cookie cuando existe", async () => {
      // Arrange
      document.cookie = "XSRF-TOKEN=token%3Dabc123";
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await apiFetch("/algo", { method: "POST", body: "{}" });

      // Assert
      const [, init] = fetchMock.mock.calls[0];
      expect((init.headers as Record<string, string>)["X-XSRF-TOKEN"]).toBe("token=abc123");
    });
  });

  // ──── Step 4: Test for apiFetch — plain-object error, not ApiError ────
  describe("apiFetch - manejo de errores", () => {
    it("lanza un objeto plano { status, data } cuando la respuesta no es ok, no una clase de error", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(422, { message: "Datos inválidos" }));
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act & Assert
      await expect(apiFetch("/algo")).rejects.toEqual({ status: 422, data: { message: "Datos inválidos" } });
    });
  });

  // ──── Step 5: Test for apiFetch — automatic 419 retry ────
  describe("apiFetch - reintento en 419", () => {
    it("reintenta la petición original una vez tras un 419, renovando el CSRF antes", async () => {
      // Arrange
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fakeResponse(419, {})) // original request
        .mockResolvedValueOnce(fakeResponse(204, {})) // csrf-cookie renewal
        .mockResolvedValueOnce(fakeResponse(200, { ok: true })); // retried original request
      vi.stubGlobal("fetch", fetchMock);
      const { apiFetch } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await apiFetch("/algo");

      // Assert
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ ok: true });
    });
  });

  // ──── Step 6: Tests for getAuthUser and logout ────
  describe("getAuthUser", () => {
    it("retorna el usuario autenticado cuando apiFetch resuelve", async () => {
      // Arrange
      const user: AuthUser = { id: 1, name: "Jaime", email: "jaime@example.com", user: "jaime", type: 1 };
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, user));
      vi.stubGlobal("fetch", fetchMock);
      const { getAuthUser } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await getAuthUser();

      // Assert
      expect(result).toEqual(user);
    });

    it("retorna null cuando apiFetch falla, sin propagar el error", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(401, { message: "No autenticado" }));
      vi.stubGlobal("fetch", fetchMock);
      const { getAuthUser } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await getAuthUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("dispara una petición POST a /logout", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, {}));
      vi.stubGlobal("fetch", fetchMock);
      const { logout } = await import("@/app/4dnn1n/home/fetch");

      // Act
      await logout();

      // Assert
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain("/logout");
      expect(init.method).toBe("POST");
    });
  });

  // ──── Step 7: Tests for getTodayAppointments, getDashboardStats, getDashboardCharts ────
  describe("getTodayAppointments", () => {
    it("pide /api/appointments/today y retorna { data, date } usando la clave de caché appointments:today", async () => {
      // Arrange
      const appointment: TodayAppointment = {
        id: 1,
        name: "Juan Perez",
        hour: "10:00",
        doctor: { id: 2, name: "Ana", lastname: "Gomez" },
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(fakeResponse(200, { message: "ok", data: [appointment], date: "2026-09-10" }));
      vi.stubGlobal("fetch", fetchMock);
      const { getTodayAppointments } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await getTodayAppointments();

      // Assert
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/appointments/today");
      expect(result).toEqual({ data: [appointment], date: "2026-09-10" });
      expect(memCache.get).toHaveBeenCalledWith("appointments:today", TTL_LIST, expect.any(Function));
    });

    it("retorna data como arreglo vacío cuando res.data es undefined", async () => {
      // Arrange
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { message: "ok", date: "2026-09-10" }));
      vi.stubGlobal("fetch", fetchMock);
      const { getTodayAppointments } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await getTodayAppointments();

      // Assert
      expect(result).toEqual({ data: [], date: "2026-09-10" });
    });
  });

  describe("getDashboardStats", () => {
    it("pide /api/dashboard/stats y retorna res.data directamente usando la clave dashboard:stats", async () => {
      // Arrange
      const stats: DashboardStats = {
        affiliates: { active: 10, inactive: 2, inactive_by_expiry: 1 },
        appointments: { this_month: 5 },
      };
      const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { message: "ok", data: stats }));
      vi.stubGlobal("fetch", fetchMock);
      const { getDashboardStats } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result = await getDashboardStats();

      // Assert
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("/api/dashboard/stats");
      expect(result).toEqual(stats);
      expect(memCache.get).toHaveBeenCalledWith("dashboard:stats", TTL_CATALOG, expect.any(Function));
    });
  });

  describe("getDashboardCharts", () => {
    it("pide /api/dashboard/charts?year=YYYY y retorna res.data con una clave de caché distinta por año", async () => {
      // Arrange
      const charts2026: DashboardCharts = {
        appointments_by_month: new Array(12).fill(0),
        affiliates_by_month: new Array(12).fill(0),
      };
      const charts2025: DashboardCharts = {
        appointments_by_month: new Array(12).fill(1),
        affiliates_by_month: new Array(12).fill(1),
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(fakeResponse(200, { message: "ok", data: charts2026 }))
        .mockResolvedValueOnce(fakeResponse(200, { message: "ok", data: charts2025 }));
      vi.stubGlobal("fetch", fetchMock);
      const { getDashboardCharts } = await import("@/app/4dnn1n/home/fetch");

      // Act
      const result2026 = await getDashboardCharts(2026);
      const result2025 = await getDashboardCharts(2025);

      // Assert
      expect(fetchMock.mock.calls[0][0]).toContain("/api/dashboard/charts?year=2026");
      expect(fetchMock.mock.calls[1][0]).toContain("/api/dashboard/charts?year=2025");
      expect(result2026).toEqual(charts2026);
      expect(result2025).toEqual(charts2025);
      expect(memCache.get).toHaveBeenCalledWith("dashboard:charts:2026", TTL_CATALOG, expect.any(Function));
      expect(memCache.get).toHaveBeenCalledWith("dashboard:charts:2025", TTL_CATALOG, expect.any(Function));
    });
  });
});
