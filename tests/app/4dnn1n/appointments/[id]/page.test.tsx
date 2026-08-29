import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ViewAppointmentPage from "@/app/4dnn1n/appointments/[id]/page";
import { useParams } from "next/navigation";
import { alert } from "@/lib/alert";
import { getAppointment } from "@/app/4dnn1n/appointments/fetch";
import type { ApiAppointment } from "@/app/4dnn1n/appointments/types";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/appointments/fetch", () => ({
  getAppointment: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function createMockAppointment(overrides: Partial<ApiAppointment> = {}): ApiAppointment {
  return {
    id: 5,
    afi_code: 123,
    doctor_id: 1,
    date: "2026-05-14",
    hour: "10:00",
    address: "Carrera 7 #45-67",
    city_id: 1,
    phone: "3001234567",
    value: 50000,
    type: 1,
    name: "Juan García",
    user_id: 1,
    doctor: { id: 1, name: "Carlos", lastname: "Pérez" },
    city: { id: 1, name: "Bogotá" },
    owner: null,
    ...overrides,
  };
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewAppointmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 3: loading skeleton ────
  it("muestra el skeleton (por clase animate-pulse) mientras loading es true, sin mostrar el detalle", async () => {
    // Arrange
    mockParams("5");
    (getAppointment as any).mockResolvedValue(createMockAppointment());

    // Act
    const { container } = render(<ViewAppointmentPage />);

    // Assert
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText(/detalle de cita/i)).not.toBeInTheDocument();

    await waitFor(() => expect(getAppointment).toHaveBeenCalledWith(5));
  });

  // ──── Step 3: datos cargados ────
  describe("Step 3: getAppointment resuelve", () => {
    it("formatea la fecha, la moneda, y usa el nombre de owner cuando está presente", async () => {
      // Arrange
      mockParams("5");
      const appointment = createMockAppointment({
        date: "2026-05-14",
        value: 50000,
        owner: { id: 10, name: "María", lastname: "López" },
        name: "Nombre en la cita (no debería usarse)",
      });
      (getAppointment as any).mockResolvedValue(appointment);

      // Act
      render(<ViewAppointmentPage />);

      // Assert
      expect(await screen.findByText("14/05/2026")).toBeInTheDocument();

      // `getByText`'s default normalizer collapses all whitespace (including
      // the non-breaking space `Intl.NumberFormat` inserts between the
      // currency symbol and the amount) into a plain ' ' before comparing —
      // but only on the DOM side, not on the matcher string. Applying the
      // same collapse here keeps the assertion robust to whichever
      // whitespace character the ICU data in this environment produces.
      const expectedCurrency = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      })
        .format(50000)
        .replace(/\s+/g, " ");
      expect(screen.getByText(expectedCurrency)).toBeInTheDocument();

      expect(screen.getByText("María López")).toBeInTheDocument();
    });

    it("usa data.name como paciente cuando owner es null", async () => {
      // Arrange
      mockParams("5");
      const appointment = createMockAppointment({ owner: null, name: "Juan García" });
      (getAppointment as any).mockResolvedValue(appointment);

      // Act
      render(<ViewAppointmentPage />);

      // Assert
      expect(await screen.findByText("Juan García")).toBeInTheDocument();
    });
  });

  // ──── Step 3: error ────
  it("si getAppointment rechaza, llama alert.error y muestra el mensaje de carga fallida", async () => {
    // Arrange
    mockParams("5");
    const apiError = { data: { message: "No se pudo cargar la cita" } };
    (getAppointment as any).mockRejectedValue(apiError);

    // Act
    render(<ViewAppointmentPage />);

    // Assert
    await waitFor(() =>
      expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo cargar la cita"),
    );
    expect(
      await screen.findByText(/no se pudo cargar la cita o no existe/i),
    ).toBeInTheDocument();
  });
});
