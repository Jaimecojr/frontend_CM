import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ChartsSection } from "@/app/4dnn1n/home/_components/charts-section";
import { useAuth } from "@/context/AuthContext";
import { getDashboardCharts, type DashboardCharts } from "@/app/4dnn1n/home/fetch";

// Mock @/context/AuthContext using alias (not relative import).
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

// Mock @/app/4dnn1n/home/fetch using alias.
vi.mock("@/app/4dnn1n/home/fetch", () => ({ getDashboardCharts: vi.fn() }));

// Mock react-apexcharts by its package name (no alias exists for it). The stub
// exposes `type` and `series` as data attributes so assertions can inspect the
// props ChartsSection passes down without depending on the real chart library.
vi.mock("react-apexcharts", () => ({
  default: (props: any) => (
    <div data-testid="apexchart" data-chart-type={props.type} data-series={JSON.stringify(props.series)} />
  ),
}));

// Helper to set up the auth mock with a given user type.
function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({
    user: { id: 1, name: "Test User", email: "test@test.com", user: "test", type },
    loading: false,
    isLoggingOut: false,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    logoutUser: vi.fn(),
  });
}

// Helper to build a minimal DashboardCharts payload with realistic defaults.
function makeCharts(overrides: Partial<DashboardCharts> = {}): DashboardCharts {
  return {
    appointments_by_month: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    affiliates_by_month: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ...overrides,
  };
}

describe("ChartsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Guard against any test in this file leaving fake timers active, which
    // would otherwise leak into unrelated test files.
    vi.useRealTimers();
  });

  // ──── Step 1: Year selector ────
  describe("selector de año", () => {
    it("muestra el año actual y los 2 anteriores, y llama a getDashboardCharts con el año actual al montar", async () => {
      // Arrange: fix the system clock to 2026 so the year options are deterministic
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-15T12:00:00"));
      mockAuth(2);
      (getDashboardCharts as any).mockResolvedValue(makeCharts());

      // Act
      render(<ChartsSection />);

      // Assert: the select shows 2026, 2025, 2024 as options
      const select = screen.getByRole("combobox");
      const optionLabels = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
      expect(optionLabels).toEqual(["2026", "2025", "2024"]);

      // Assert: fetch was called with the current year on mount
      expect(getDashboardCharts).toHaveBeenCalledWith(2026);
    });
  });

  // ──── Step 2: The 2 always-visible charts (non-admin role) ────
  describe("gráficas siempre visibles (rol no-admin)", () => {
    it("muestra 2 skeletons mientras está pendiente, sin apexchart en el DOM", () => {
      // Arrange: a never-resolving promise keeps the component in loading state
      mockAuth(2);
      (getDashboardCharts as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<ChartsSection />);

      // Assert: 2 skeletons visible, no apexchart yet
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
      expect(screen.queryByTestId("apexchart")).not.toBeInTheDocument();
    });

    it("al resolver, muestra exactamente 2 apexchart (bar de citas, area de afiliados) y ninguna de franquicia", async () => {
      // Arrange
      mockAuth(2);
      (getDashboardCharts as any).mockResolvedValue(makeCharts());

      // Act
      render(<ChartsSection />);

      // Assert: exactly 2 charts appear once the fetch resolves
      const charts = await screen.findAllByTestId("apexchart");
      expect(charts).toHaveLength(2);

      // Assert: appointments chart is a bar chart with the appointments series
      expect(charts[0]).toHaveAttribute("data-chart-type", "bar");
      expect(JSON.parse(charts[0].getAttribute("data-series")!)).toEqual([
        { name: "Citas", data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
      ]);

      // Assert: affiliates chart is an area chart with the affiliates series
      expect(charts[1]).toHaveAttribute("data-chart-type", "area");
      expect(JSON.parse(charts[1].getAttribute("data-series")!)).toEqual([
        { name: "Afiliados", data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
      ]);
    });
  });

  // ──── Step 3: Franchise charts (super admin only) — with and without by_franchise ────
  describe("gráficas de franquicia (solo super admin)", () => {
    it("sin by_franchise: las 2 gráficas base se muestran, pero las de franquicia siguen en skeleton", async () => {
      // Arrange: super admin, but the response has no by_franchise data
      mockAuth(1);
      (getDashboardCharts as any).mockResolvedValue(makeCharts());

      // Act
      const { container } = render(<ChartsSection />);

      // Assert: the 2 base charts render
      const charts = await screen.findAllByTestId("apexchart");
      expect(charts).toHaveLength(2);

      // Assert: franchise charts never render their apexchart — `loading ||
      // !data?.by_franchise` stays true even after loading finishes, so their
      // skeletons remain (2 base charts no longer show skeletons, so 2 remain
      // for the franchise slots).
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    });

    it("con by_franchise: aparecen 4 apexchart en total, con series construidas desde by_franchise", async () => {
      // Arrange: super admin with full franchise data
      mockAuth(1);
      (getDashboardCharts as any).mockResolvedValue(
        makeCharts({
          by_franchise: {
            users: [
              { id: 1, name: "Franquicia Norte" },
              { id: 2, name: "Franquicia Sur" },
            ],
            appointments_by_franchise: [[1, 2], [3, 4]],
            affiliates_by_franchise: [[5, 6], [7, 8]],
          },
        }),
      );

      // Act
      render(<ChartsSection />);

      // Assert: 4 charts total (2 base + 2 franchise)
      const charts = await screen.findAllByTestId("apexchart");
      expect(charts).toHaveLength(4);

      // Assert: franchise appointments chart (line) uses appointments_by_franchise per user
      const franchiseAppointments = charts[2];
      expect(franchiseAppointments).toHaveAttribute("data-chart-type", "line");
      expect(JSON.parse(franchiseAppointments.getAttribute("data-series")!)).toEqual([
        { name: "Franquicia Norte", data: [1, 2] },
        { name: "Franquicia Sur", data: [3, 4] },
      ]);

      // Assert: franchise affiliates chart (bar) uses affiliates_by_franchise per user
      const franchiseAffiliates = charts[3];
      expect(franchiseAffiliates).toHaveAttribute("data-chart-type", "bar");
      expect(JSON.parse(franchiseAffiliates.getAttribute("data-series")!)).toEqual([
        { name: "Franquicia Norte", data: [5, 6] },
        { name: "Franquicia Sur", data: [7, 8] },
      ]);
    });
  });

  // ──── Step 4: Year change ────
  describe("cambio de año", () => {
    it("al cambiar el select al año anterior, llama getDashboardCharts con ese año y vuelve a mostrar skeletons mientras carga", async () => {
      // Arrange: real timers throughout — `waitFor` polls with real timers
      // internally, which deadlocks under `vi.useFakeTimers()` unless those
      // timers are advanced manually, so this test avoids faking the clock.
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      mockAuth(2);
      (getDashboardCharts as any).mockResolvedValue(makeCharts());

      const { container } = render(<ChartsSection />);
      await screen.findAllByTestId("apexchart");

      // Arrange: the next call (triggered by the year change) never resolves,
      // so the loading state after the change can be observed deterministically.
      (getDashboardCharts as any).mockReturnValue(new Promise(() => {}));

      // Act
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: String(previousYear) } });

      // Assert: fetch re-triggered with the newly selected year
      expect(getDashboardCharts).toHaveBeenCalledWith(previousYear);

      // Assert: the 2 base charts fall back to skeletons while the new fetch is pending
      await waitFor(() => {
        expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThanOrEqual(2);
      });
      expect(screen.queryByTestId("apexchart")).not.toBeInTheDocument();
    });
  });

  // ──── Step 5: Error handling ────
  describe("manejo de errores", () => {
    it("cuando getDashboardCharts rechaza, no lanza excepción y renderiza las 2 gráficas base con series vacías", async () => {
      // Arrange
      mockAuth(2);
      (getDashboardCharts as any).mockRejectedValue(new Error("network error"));

      // Act
      render(<ChartsSection />);

      // Assert: the rejection is swallowed, loading finishes, and the base charts
      // still render with empty series (data stays null, so `?? []` applies)
      const charts = await screen.findAllByTestId("apexchart");
      expect(charts).toHaveLength(2);
      expect(JSON.parse(charts[0].getAttribute("data-series")!)).toEqual([{ name: "Citas", data: [] }]);
      expect(JSON.parse(charts[1].getAttribute("data-series")!)).toEqual([{ name: "Afiliados", data: [] }]);
    });
  });
});
