import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { StatsCards } from "@/app/4dnn1n/home/_components/stats-cards";
import { useAuth } from "@/context/AuthContext";
import { getDashboardStats, type DashboardStats } from "@/app/4dnn1n/home/fetch";

// Mock @/context/AuthContext using alias (not relative import).
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock @/app/4dnn1n/home/fetch using alias.
vi.mock("@/app/4dnn1n/home/fetch", () => ({
  getDashboardStats: vi.fn(),
}));

// Helper to set up auth mock with optional overrides.
function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as any).mockReturnValue({
    user: {
      id: 1,
      name: "Test Admin",
      email: "admin@test.com",
      user: "admin",
      type: 1,
    },
    loading: false,
    isLoggingOut: false,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    logoutUser: vi.fn(),
    ...overrides,
  });
}

// Helper to create a mock DashboardStats object.
function makeDashboardStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    affiliates: {
      active: 1234,
      inactive: 56,
      inactive_by_expiry: 12,
    },
    appointments: {
      this_month: 89,
    },
    ...overrides,
  };
}

describe("StatsCards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Role gate test ────
  describe("gate por rol", () => {
    it("retorna null cuando user es null", () => {
      // Arrange
      mockAuth({ user: null });

      // Act
      const { container } = render(<StatsCards />);

      // Assert: el componente no renderiza nada (retorna null)
      expect(container.firstChild).toBeNull();
      expect(getDashboardStats).not.toHaveBeenCalled();
    });

    it("retorna null cuando user.type no es 1 (asesor), sin llamar getDashboardStats", () => {
      // Arrange
      mockAuth({
        user: {
          id: 2,
          name: "Test Counselor",
          email: "counselor@test.com",
          user: "counselor",
          type: 2, // Counselor, not super admin
        },
      });

      // Act
      const { container } = render(<StatsCards />);

      // Assert: el componente no renderiza nada (retorna null)
      expect(container.firstChild).toBeNull();
      expect(getDashboardStats).not.toHaveBeenCalled();
    });
  });

  // ──── Step 2: Loading state test ────
  describe("estado de carga", () => {
    it("mientras getDashboardStats está pendiente, el texto 'Afiliados activos' NO está en el DOM", () => {
      // Arrange: a never-resolving promise keeps the component in loading state
      (getDashboardStats as any).mockReturnValue(new Promise(() => {}));
      mockAuth({ user: { id: 1, name: "Test", email: "test@test.com", user: "test", type: 1 } });

      // Act
      const { container } = render(<StatsCards />);

      // Assert: "Afiliados activos" is not in the DOM (StatsCardsSkeleton is showing instead)
      expect(screen.queryByText("Afiliados activos")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    it("al resolver getDashboardStats, el texto 'Afiliados activos' aparece", async () => {
      // Arrange
      const stats = makeDashboardStats();
      (getDashboardStats as any).mockResolvedValue(stats);
      mockAuth({ user: { id: 1, name: "Test", email: "test@test.com", user: "test", type: 1 } });

      // Act
      render(<StatsCards />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Afiliados activos")).toBeInTheDocument();
      });
    });
  });

  // ──── Step 3: Rendered values test ────
  describe("valores renderizados", () => {
    it("muestra los valores formateados en es-CO y los subtítulos correctos", async () => {
      // Arrange
      const stats = makeDashboardStats({
        affiliates: {
          active: 1234,
          inactive: 56,
          inactive_by_expiry: 12,
        },
        appointments: {
          this_month: 89,
        },
      });
      (getDashboardStats as any).mockResolvedValue(stats);
      mockAuth({ user: { id: 1, name: "Test", email: "test@test.com", user: "test", type: 1 } });

      // Act
      render(<StatsCards />);

      // Assert: wait for all 3 main titles to appear
      await waitFor(() => {
        // Verify "Afiliados activos" card with formatted value
        expect(screen.getByText("Afiliados activos")).toBeInTheDocument();
        expect(screen.getByText("1.234")).toBeInTheDocument(); // es-CO format: dot as thousands separator

        // Verify "Afiliados inactivos" card with formatted value and subtitle
        expect(screen.getByText("Afiliados inactivos")).toBeInTheDocument();
        expect(screen.getByText("56")).toBeInTheDocument(); // no decimal/thousands separator needed
        expect(screen.getByText("12 por vencimiento de vigencia")).toBeInTheDocument();

        // Verify "Citas este mes" card with formatted value
        expect(screen.getByText("Citas este mes")).toBeInTheDocument();
        expect(screen.getByText("89")).toBeInTheDocument();
      });
    });
  });
});
