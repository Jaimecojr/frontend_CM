import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAppointmentPage from "@/app/4dnn1n/appointments/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getAppointment, updateAppointment } from "@/app/4dnn1n/appointments/fetch";
import type { ApiAppointment, CreateAppointmentPayload } from "@/app/4dnn1n/appointments/types";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/appointments/fetch", () => ({
  getAppointment: vi.fn(),
  updateAppointment: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and captures the `onSubmit` prop itself so a test can call it
// directly and inspect the promise it returns.
let capturedOnSubmit: ((payload: CreateAppointmentPayload) => Promise<void>) | null = null;
const testPayload: CreateAppointmentPayload = {
  afi_code: 123,
  doctor_id: 2,
  date: "2026-07-01",
  hour: "11:00",
  address: "Calle 2",
  city_id: 2,
  phone: "3009876543",
  value: 60000,
  type: 1,
  name: "Paciente Editado",
  user_id: 1,
};

vi.mock("@/app/4dnn1n/appointments/_components/AppointmentEditForm", () => ({
  default: (props: any) => {
    capturedOnSubmit = props.onSubmit;
    return (
      <div data-testid="appointment-edit-form" data-initial-id={props.initial?.id}>
        <button data-testid="submit-stub" onClick={() => props.onSubmit?.(testPayload)}>
          submit-stub
        </button>
      </div>
    );
  },
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

function mockAuth(type: number, loading = false) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading, isLoggingOut: false });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("EditAppointmentPage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnSubmit = null;
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ push: pushMock });
  });

  // ──── Step 4: estados de carga/permisos ────
  describe("carga y permisos", () => {
    it("muestra el FormPageSkeleton mientras authLoading es true, sin renderizar el formulario", async () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");
      (getAppointment as any).mockResolvedValue(createMockAppointment());

      // Act
      const { container } = render(<EditAppointmentPage />);

      // Assert
      await waitFor(() => expect(getAppointment).toHaveBeenCalledWith(5));
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("appointment-edit-form")).not.toBeInTheDocument();
    });

    it("muestra el FormPageSkeleton mientras loading (fetch de la cita) es true", () => {
      // Arrange
      mockAuth(1, false);
      mockParams("5");
      (getAppointment as any).mockReturnValue(new Promise(() => {})); // never resolves

      // Act
      const { container } = render(<EditAppointmentPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("appointment-edit-form")).not.toBeInTheDocument();
    });

    it("muestra el mensaje de permisos insuficientes para user.type: 3", async () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      (getAppointment as any).mockResolvedValue(createMockAppointment());

      // Act
      render(<EditAppointmentPage />);

      // Assert
      expect(
        await screen.findByText(/no tienes permisos suficientes para acceder a esta vista/i),
      ).toBeInTheDocument();
    });

    it("si getAppointment rechaza, llama alert.error y muestra el mensaje de carga fallida", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      const apiError = { data: { message: "No se pudo cargar la cita" } };
      (getAppointment as any).mockRejectedValue(apiError);

      // Act
      render(<EditAppointmentPage />);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo cargar la cita"),
      );
      expect(
        await screen.findByText(/no se pudo cargar la cita o no existe/i),
      ).toBeInTheDocument();
    });
  });

  // ──── Step 4: handleSubmit ────
  describe("handleSubmit", () => {
    it("llama updateAppointment(id, payload) directamente (sin alert.confirm), muestra alert.success y redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAppointment as any).mockResolvedValue(createMockAppointment({ id: 5 }));
      (updateAppointment as any).mockResolvedValue({ id: 5 });

      render(<EditAppointmentPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      expect(alert.confirm).not.toHaveBeenCalled();
      await waitFor(() => expect(updateAppointment).toHaveBeenCalledWith(5, testPayload));
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/appointments");
    });

    it("si updateAppointment rechaza, llama alert.error con el mensaje de la API, no redirige y no propaga la excepción", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAppointment as any).mockResolvedValue(createMockAppointment({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar la cita" } };
      (updateAppointment as any).mockRejectedValue(apiError);

      render(<EditAppointmentPage />);
      await screen.findByTestId("appointment-edit-form");

      // Act / Assert: calling the captured `onSubmit` prop directly confirms
      // the page's `handleSubmit` catches the rejection itself instead of
      // letting it propagate to the form's `try/finally`.
      expect(capturedOnSubmit).not.toBeNull();
      await expect(capturedOnSubmit!(testPayload)).resolves.toBeUndefined();

      expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar la cita");
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
