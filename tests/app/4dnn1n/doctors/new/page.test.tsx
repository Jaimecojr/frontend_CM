import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewDoctorPage from "@/app/4dnn1n/doctors/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createDoctor } from "@/app/4dnn1n/doctors/fetch";

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
vi.mock("@/app/4dnn1n/doctors/fetch", () => ({
  createDoctor: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/doctors/_components/DoctorForm", () => ({
  default: (props: any) => (
    <div data-testid="doctor-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({
            name: "Carlos",
            lastname: "Pérez",
            specialty_id: 1,
            city_id: 1,
            phone: "6011234567",
            movil: "3001234567",
            address: "Calle 1",
            secretary_name: "Ana",
            value_agreement: 100000,
          })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function mockAuth(type: number | null, loading = false) {
  (useAuth as any).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading,
    isLoggingOut: false,
  });
}

describe("NewDoctorPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 2: inline gate (synchronous check, no redirect) ────
  describe("gate de permisos (type 1 y type 2 tienen acceso)", () => {
    it("authLoading: true → no renderiza nada (retorna null)", () => {
      // Arrange
      mockAuth(1, true);

      // Act
      const { container } = render(<NewDoctorPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("user.type: 3 → muestra el mensaje de permisos insuficientes sin invocar router", () => {
      // Arrange
      mockAuth(3);

      // Act
      render(<NewDoctorPage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("user.type: 1 → formulario visible", () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewDoctorPage />);

      // Assert
      expect(screen.getByTestId("doctor-form")).toHaveAttribute("data-mode", "create");
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });

    it("user.type: 2 → formulario visible (distinto del gate estricto type !== 1 de franchises)", () => {
      // Arrange
      mockAuth(2);

      // Act
      render(<NewDoctorPage />);

      // Assert
      expect(screen.getByTestId("doctor-form")).toHaveAttribute("data-mode", "create");
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });
  });

  // ──── Step 2 (cont.): handleSubmit ────
  describe("handleSubmit", () => {
    it("crea el médico, muestra alert.success y redirige a /4dnn1n/doctors", async () => {
      // Arrange
      mockAuth(1);
      (createDoctor as any).mockResolvedValue({ id: 5 });

      render(<NewDoctorPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createDoctor).toHaveBeenCalledWith({
          name: "Carlos",
          lastname: "Pérez",
          specialty_id: 1,
          city_id: 1,
          phone: "6011234567",
          movil: "3001234567",
          address: "Calle 1",
          secretary_name: "Ana",
          value_agreement: 100000,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/doctors");
    });

    it("si createDoctor rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear el médico" } };
      (createDoctor as any).mockRejectedValue(apiError);

      render(<NewDoctorPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear el médico"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
