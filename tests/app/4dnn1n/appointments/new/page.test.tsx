import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewAppointmentPage from "@/app/4dnn1n/appointments/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createAppointment } from "@/app/4dnn1n/appointments/fetch";
import type { CreateAppointmentPayload } from "@/app/4dnn1n/appointments/types";

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
  createAppointment: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `userId` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/appointments/_components/AppointmentForm", () => ({
  default: (props: any) => (
    <div data-testid="appointment-form" data-user-id={props.userId}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({
            afi_code: 123,
            doctor_id: 1,
            date: "2026-06-01",
            hour: "10:00",
            address: "Calle 1",
            city_id: 1,
            phone: "3001234567",
            value: 50000,
            type: 1,
            name: "Paciente Test",
            user_id: 1,
          } as CreateAppointmentPayload)
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function mockAuth(type: number, loading = false) {
  (useAuth as any).mockReturnValue({
    user: { id: 1, type },
    loading,
    isLoggingOut: false,
  });
}

describe("NewAppointmentPage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ push: pushMock });
  });

  // ──── Step 2: gate de permisos ────
  describe("gate de permisos", () => {
    it("muestra el mensaje de permisos insuficientes para user.type: 3", () => {
      // Arrange
      mockAuth(3);

      // Act
      render(<NewAppointmentPage />);

      // Assert
      expect(
        screen.getByText(/no tienes permisos suficientes para acceder a esta vista/i),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("appointment-form")).not.toBeInTheDocument();
    });

    it("renderiza AppointmentForm con el userId correcto cuando el usuario tiene acceso (type: 1)", () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewAppointmentPage />);

      // Assert
      const form = screen.getByTestId("appointment-form");
      expect(form).toHaveAttribute("data-user-id", "1");
    });

    it("no renderiza nada mientras authLoading es true", () => {
      // Arrange
      mockAuth(1, true);

      // Act
      const { container } = render(<NewAppointmentPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ──── Step 2 (cont.): handleSubmit ────
  describe("handleSubmit", () => {
    it("crea la cita, muestra alert.success y redirige a /4dnn1n/appointments", async () => {
      // Arrange
      mockAuth(1);
      (createAppointment as any).mockResolvedValue({ id: 99 });

      render(<NewAppointmentPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createAppointment).toHaveBeenCalledWith({
          afi_code: 123,
          doctor_id: 1,
          date: "2026-06-01",
          hour: "10:00",
          address: "Calle 1",
          city_id: 1,
          phone: "3001234567",
          value: 50000,
          type: 1,
          name: "Paciente Test",
          user_id: 1,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/appointments");
    });

    it("si createAppointment rechaza, llama alert.error con getApiErrorMessage y NO redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear la cita" } };
      (createAppointment as any).mockRejectedValue(apiError);

      render(<NewAppointmentPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear la cita"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
