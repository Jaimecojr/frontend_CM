import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch, csrf, getXsrfToken } from "@/lib/api";
import { memCache, TTL_LIST, TTL_CATALOG } from "@/lib/memCache";
import {
  getAuthUser,
  logout,
  getTodayAppointments,
  getDashboardStats,
  getDashboardCharts,
  csrf as reexportedCsrf,
  getXsrfToken as reexportedGetXsrfToken,
  type TodayAppointment,
  type DashboardStats,
  type DashboardCharts,
} from "@/app/4dnn1n/home/fetch";
import type { AuthUser } from "@/context/AuthContext";

// `home/fetch.ts` no longer reimplements its own csrf()/apiFetch() — it uses
// the shared client from `@/lib/api` (same one every other module uses), so
// header/419-retry/error-shape behavior is covered once in `tests/lib/api.test.ts`
// and not duplicated here.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
  getXsrfToken: vi.fn(() => "test-xsrf-token"),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key: string, ttl: number, fn: () => unknown) => fn()) },
  TTL_LIST: 120000,
  TTL_CATALOG: 300000,
}));

describe("home/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── csrf/getXsrfToken are re-exported as-is from the shared client ────
  it("re-exporta csrf y getXsrfToken del cliente compartido", () => {
    expect(reexportedCsrf).toBe(csrf);
    expect(reexportedGetXsrfToken).toBe(getXsrfToken);
  });

  describe("getAuthUser", () => {
    it("retorna el usuario autenticado cuando apiFetch resuelve", async () => {
      // Arrange
      const user: AuthUser = { id: 1, name: "Jaime", email: "jaime@example.com", user: "jaime", type: 1 };
      (apiFetch as any).mockResolvedValue(user);

      // Act
      const result = await getAuthUser();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/user");
      expect(result).toEqual(user);
    });

    it("retorna null cuando apiFetch rechaza, sin propagar el error", async () => {
      // Arrange
      (apiFetch as any).mockRejectedValue(new Error("No autenticado"));

      // Act
      const result = await getAuthUser();

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("logout", () => {
    it("llama apiFetch con POST a /logout", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await logout();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
    });
  });

  describe("getTodayAppointments", () => {
    it("pide /api/appointments/today y retorna { data, date } usando la clave de caché appointments:today", async () => {
      // Arrange
      const appointment: TodayAppointment = {
        id: 1,
        name: "Juan Perez",
        hour: "10:00",
        doctor: { id: 2, name: "Ana", lastname: "Gomez" },
      };
      (apiFetch as any).mockResolvedValue({ message: "ok", data: [appointment], date: "2026-09-10" });

      // Act
      const result = await getTodayAppointments();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments/today");
      expect(result).toEqual({ data: [appointment], date: "2026-09-10" });
      expect(memCache.get).toHaveBeenCalledWith("appointments:today", TTL_LIST, expect.any(Function));
    });

    it("retorna data como arreglo vacío cuando res.data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ message: "ok", date: "2026-09-10" });

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
      (apiFetch as any).mockResolvedValue({ message: "ok", data: stats });

      // Act
      const result = await getDashboardStats();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/dashboard/stats");
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
      (apiFetch as any)
        .mockResolvedValueOnce({ message: "ok", data: charts2026 })
        .mockResolvedValueOnce({ message: "ok", data: charts2025 });

      // Act
      const result2026 = await getDashboardCharts(2026);
      const result2025 = await getDashboardCharts(2025);

      // Assert
      expect((apiFetch as any).mock.calls[0][0]).toBe("/api/dashboard/charts?year=2026");
      expect((apiFetch as any).mock.calls[1][0]).toBe("/api/dashboard/charts?year=2025");
      expect(result2026).toEqual(charts2026);
      expect(result2025).toEqual(charts2025);
      expect(memCache.get).toHaveBeenCalledWith("dashboard:charts:2026", TTL_CATALOG, expect.any(Function));
      expect(memCache.get).toHaveBeenCalledWith("dashboard:charts:2025", TTL_CATALOG, expect.any(Function));
    });
  });
});
