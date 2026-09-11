import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { TodayAppointmentsCard } from "@/app/4dnn1n/home/_components/today-appointments-card";
import { getTodayAppointments, type TodayAppointment } from "@/app/4dnn1n/home/fetch";

// Mock the home fetch module, which this component consumes directly.
vi.mock("@/app/4dnn1n/home/fetch", () => ({ getTodayAppointments: vi.fn() }));

// Helper to build a minimal TodayAppointment with realistic defaults.
function createAppointment(
  overrides: Partial<{
    id: number;
    name: string;
    hour: string;
    doctor: { id: number; name: string; lastname: string };
  }> = {},
): TodayAppointment {
  return {
    id: 1,
    name: "Ana Gómez",
    hour: "09:00",
    doctor: { id: 1, name: "Carlos", lastname: "Ruiz" },
    ...overrides,
  };
}

// Helper to build N appointments with distinct IDs so >5/<=5 auto-scroll
// tests have unambiguous, non-colliding React keys.
function createAppointments(count: number): TodayAppointment[] {
  return Array.from({ length: count }, (_, i) =>
    createAppointment({
      id: i + 1,
      name: `Paciente${i + 1}`,
      hour: `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${String((i % 2) * 30).padStart(2, "0")}`,
      doctor: {
        id: i + 1,
        name: `Doctor${i + 1}`,
        lastname: "Specialist",
      },
    }),
  );
}

describe("TodayAppointmentsCard", () => {
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
    it("mientras getTodayAppointments está pendiente, el título no está en el DOM", () => {
      // Arrange: a never-resolving promise keeps the component in loading state
      (getTodayAppointments as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<TodayAppointmentsCard />);

      // Assert
      expect(screen.queryByText("Citas pendientes del día")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    });

    it("al resolver con lista vacía, muestra el título y el mensaje de lista vacía", async () => {
      // Arrange
      (getTodayAppointments as any).mockResolvedValue({
        data: [],
        date: "2026-08-29",
      });

      // Act
      render(<TodayAppointmentsCard />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Citas pendientes del día")).toBeInTheDocument();
      });
      expect(screen.getByText("No hay citas para hoy")).toBeInTheDocument();
    });
  });

  // ──── Step 2: List with data ────
  describe("lista con datos", () => {
    it("renderiza nombre del paciente, hora y doctor, y link de edición por cita", async () => {
      // Arrange
      const appointments = [
        createAppointment({
          id: 1,
          name: "Juan López",
          hour: "09:00",
          doctor: { id: 1, name: "Carlos", lastname: "Ruiz" },
        }),
        createAppointment({
          id: 2,
          name: "María García",
          hour: "10:30",
          doctor: { id: 2, name: "Laura", lastname: "Martínez" },
        }),
      ];
      (getTodayAppointments as any).mockResolvedValue({
        data: appointments,
        date: "2026-08-29",
      });

      // Act
      render(<TodayAppointmentsCard />);

      // Assert: patient names are rendered
      await waitFor(() => {
        expect(screen.getByText("Juan López")).toBeInTheDocument();
      });
      expect(screen.getByText("María García")).toBeInTheDocument();

      // Assert: hour and doctor info in the format "{hour} · {doctor.name} {doctor.lastname}"
      expect(screen.getByText("09:00 · Carlos Ruiz")).toBeInTheDocument();
      expect(screen.getByText("10:30 · Laura Martínez")).toBeInTheDocument();

      // Assert: each row links to the appointment detail page
      const links = screen.getAllByTitle("Ver cita");
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute("href", "/4dnn1n/appointments/1");
      expect(links[1]).toHaveAttribute("href", "/4dnn1n/appointments/2");
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
      const appointments = createAppointments(5);
      (getTodayAppointments as any).mockResolvedValue({
        data: appointments,
        date: "2026-08-29",
      });

      const { container } = render(<TodayAppointmentsCard />);
      await flushLoad();

      const scrollBox = container.querySelector(".overflow-y-auto") as HTMLDivElement;
      expect(scrollBox).toBeInTheDocument();

      // Act: advance 5 full interval cycles (5 * 40ms)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Assert: guard `appointments.length <= 5` prevented the interval from
      // ever being created, so scrollTop never moves.
      expect(scrollBox.scrollTop).toBe(0);
    });

    it("activa el auto-scroll con 6 elementos y se pausa/reanuda en hover", async () => {
      // Arrange
      vi.useFakeTimers();
      const appointments = createAppointments(6);
      (getTodayAppointments as any).mockResolvedValue({
        data: appointments,
        date: "2026-08-29",
      });

      const { container } = render(<TodayAppointmentsCard />);
      await flushLoad();

      const scrollBox = container.querySelector(".overflow-y-auto") as HTMLDivElement;
      expect(scrollBox).toBeInTheDocument();
      expect(scrollBox.scrollTop).toBe(0);

      // jsdom does not lay out content, so scrollHeight/clientHeight default
      // to 0 — the component's wrap-to-0 check (`scrollTop + clientHeight >=
      // scrollHeight`) would otherwise fire on every tick. Stub realistic
      // dimensions proportionate to the container's actual max-height (280px).
      Object.defineProperty(scrollBox, "scrollHeight", { value: 400, configurable: true });
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
