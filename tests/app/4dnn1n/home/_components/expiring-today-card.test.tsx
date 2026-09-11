import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { ExpiringTodayCard } from "@/app/4dnn1n/home/_components/expiring-today-card";
import { getExpiringToday, type ExpiringAffiliate } from "@/app/4dnn1n/affiliates/fetch";

// Cross-module mock: this widget imports the fetch helper from the affiliates
// module, not from home/fetch, so that is the module under mock here.
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({ getExpiringToday: vi.fn() }));

// Helper to build a minimal ExpiringAffiliate, with the fields the component
// actually reads defaulted and the rest overridable per test.
function createAffiliate(
  overrides: Partial<{
    id: number;
    name: string;
    lastname: string;
    movil: string | null;
    phone: string | null;
  }> = {},
): ExpiringAffiliate {
  return {
    id: 1,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1000000001",
    validity_end: "2026-08-29",
    movil: "3001234567",
    phone: null,
    ...overrides,
  };
}

// Builds N affiliates with distinct ids so >5/<=5 auto-scroll tests have
// unambiguous, non-colliding React keys.
function createAffiliates(count: number): ExpiringAffiliate[] {
  return Array.from({ length: count }, (_, i) =>
    createAffiliate({ id: i + 1, name: `Afiliado${i + 1}`, lastname: "Test" }),
  );
}

describe("ExpiringTodayCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Guard against any test in this file leaving fake timers active, which
    // would otherwise leak into unrelated test files.
    vi.useRealTimers();
  });

  // ──── Step 1: Loading and empty-list cycle ────
  describe("ciclo de carga y lista vacía", () => {
    it("mientras getExpiringToday está pendiente, el título no está en el DOM", () => {
      // Arrange: a never-resolving promise keeps the component in loading state
      (getExpiringToday as any).mockReturnValue(new Promise(() => {}));

      // Act
      render(<ExpiringTodayCard />);

      // Assert
      expect(screen.queryByText("Contratos que vencen hoy")).not.toBeInTheDocument();
    });

    it("al resolver con lista vacía, muestra el título con la fecha y el mensaje de lista vacía", async () => {
      // Arrange
      (getExpiringToday as any).mockResolvedValue({ data: [], date: "2026-08-29" });

      // Act
      render(<ExpiringTodayCard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Contratos que vencen hoy")).toBeInTheDocument();
      });
      expect(screen.getByText("2026-08-29")).toBeInTheDocument();
      expect(screen.getByText("No hay contratos que vencen hoy")).toBeInTheDocument();
    });
  });

  // ──── Step 2: List with data ────
  describe("lista con datos", () => {
    it("renderiza nombre completo, teléfono filtrado y link de edición por afiliado", async () => {
      // Arrange
      const affiliates = [
        createAffiliate({ id: 1, movil: "3001234567", phone: null }),
        createAffiliate({ id: 2, movil: null, phone: "6011234567" }),
      ];
      (getExpiringToday as any).mockResolvedValue({ data: affiliates, date: "2026-08-29" });

      // Act
      render(<ExpiringTodayCard />);

      // Assert: both rows render "{name} {lastname}"
      await waitFor(() => {
        expect(screen.getAllByText("Juan Pérez")).toHaveLength(2);
      });

      // Assert: null phone/movil is filtered out by `.filter(Boolean).join(' · ')`
      expect(screen.getByText("3001234567")).toBeInTheDocument();
      expect(screen.getByText("6011234567")).toBeInTheDocument();

      // Assert: each row links to the affiliate edit page
      const links = screen.getAllByTitle("Renovar");
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute("href", "/4dnn1n/affiliates/1/edit");
      expect(links[1]).toHaveAttribute("href", "/4dnn1n/affiliates/2/edit");
    });
  });

  // ──── Steps 3-4: Auto-scroll behavior (fake timers) ────
  describe("auto-scroll", () => {
    // Flushes the mocked fetch promise (a microtask, unaffected by fake
    // timers) plus the resulting state updates/effects, without touching the
    // interval timers under test.
    async function flushLoad() {
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    }

    it("no activa el auto-scroll con exactamente 5 elementos", async () => {
      // Arrange
      vi.useFakeTimers();
      const affiliates = createAffiliates(5);
      (getExpiringToday as any).mockResolvedValue({ data: affiliates, date: "2026-08-29" });

      const { container } = render(<ExpiringTodayCard />);
      await flushLoad();

      const scrollBox = container.querySelector(".overflow-y-auto") as HTMLDivElement;
      expect(scrollBox).toBeInTheDocument();

      // Act: advance 5 full interval cycles (5 * 40ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Assert: guard `affiliates.length <= 5` prevented the interval from
      // ever being created, so scrollTop never moves.
      expect(scrollBox.scrollTop).toBe(0);
    });

    it("activa el auto-scroll con 6 elementos y se pausa/reanuda en hover", async () => {
      // Arrange
      vi.useFakeTimers();
      const affiliates = createAffiliates(6);
      (getExpiringToday as any).mockResolvedValue({ data: affiliates, date: "2026-08-29" });

      const { container } = render(<ExpiringTodayCard />);
      await flushLoad();

      const scrollBox = container.querySelector(".overflow-y-auto") as HTMLDivElement;
      expect(scrollBox).toBeInTheDocument();
      expect(scrollBox.scrollTop).toBe(0);

      // jsdom does not lay out content, so scrollHeight/clientHeight default
      // to 0 — the component's wrap-to-0 check (`scrollTop + clientHeight >=
      // scrollHeight`) would otherwise fire on every tick. Stub realistic
      // dimensions so scrollTop increments are observable across ticks.
      Object.defineProperty(scrollBox, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollBox, "clientHeight", { value: 100, configurable: true });

      // Act: one interval tick (40ms) advances scrollTop by 1
      act(() => {
        vi.advanceTimersByTime(40);
      });
      expect(scrollBox.scrollTop).toBe(1);

      // Act: hovering pauses the interval
      fireEvent.mouseEnter(scrollBox);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(scrollBox.scrollTop).toBe(1);

      // Act: leaving resumes the interval
      fireEvent.mouseLeave(scrollBox);
      act(() => {
        vi.advanceTimersByTime(40);
      });
      expect(scrollBox.scrollTop).toBe(2);
    });
  });
});
