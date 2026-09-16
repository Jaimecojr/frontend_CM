import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditDoctorPage from "@/app/4dnn1n/doctors/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getDoctor, updateDoctor } from "@/app/4dnn1n/doctors/fetch";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";

// Same check order as `[id]/page.tsx`: authLoading → permission → data loading
// → data-fail. Unlike `new/page.tsx`, `handleSubmit` here has no local
// `loading` state — just a plain try/catch.

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
  getDoctor: vi.fn(),
  updateDoctor: vi.fn(),
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
            lastname: "Pérez Editado",
            specialty_id: 2,
            city_id: 4,
            phone: "6011234567",
            movil: "3009876543",
            address: "Calle 2",
            secretary_name: "Ana",
            value_agreement: 120000,
          })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockDoctor(overrides: Partial<ApiDoctor> = {}): ApiDoctor {
  return {
    id: 5,
    name: "Carlos",
    lastname: "Pérez",
    specialty_id: 1,
    city_id: 1,
    phone: "6011234567",
    movil: "3001234567",
    email: "carlos@test.com",
    address: "Calle 1",
    secretary_name: "Ana",
    value_agreement: 100000,
    state: 1,
    ...overrides,
  };
}

function mockAuth(type: number | null, loading = false) {
  (useAuth as any).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading,
    isLoggingOut: false,
  });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("EditDoctorPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
    // Default resolved value: the data-fetch effect fires unconditionally
    // (regardless of the permission check), so give it something to resolve
    // even in tests where the rendered result is discarded due to the gate.
    (getDoctor as any).mockResolvedValue(createMockDoctor());
  });

  describe("orden de checks (authLoading → permiso → loading → dato)", () => {
    it("authLoading: true → no renderiza nada (retorna null)", () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");

      // Act
      const { container } = render(<EditDoctorPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
    });

    it("user.type: 3 → muestra el mensaje de permisos insuficientes sin esperar a getDoctor", () => {
      // Arrange
      mockAuth(3);
      mockParams("5");
      (getDoctor as any).mockReturnValue(new Promise(() => {}));

      // Act
      render(<EditDoctorPage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("con permiso, loading: true → muestra FormPageSkeleton, sin renderizar el formulario", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      // Left pending on purpose: assertions run before it ever resolves.
      (getDoctor as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<EditDoctorPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("con permiso, getDoctor rechaza → tras terminar loading, muestra 'No se pudo cargar el médico.'", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getDoctor as any).mockRejectedValue({ data: { message: "No encontrado" } });

      // Act
      render(<EditDoctorPage />);

      // Assert
      await waitFor(() =>
        expect(screen.getByText("No se pudo cargar el médico.")).toBeInTheDocument(),
      );
      expect(alert.error).toHaveBeenCalled();
      expect(screen.queryByTestId("doctor-form")).not.toBeInTheDocument();
    });

    it("dato cargado, user.type: 1 → renderiza DoctorForm con mode='edit'", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor({ id: 5 }));

      // Act
      render(<EditDoctorPage />);

      // Assert
      const form = await screen.findByTestId("doctor-form");
      expect(form).toHaveAttribute("data-mode", "edit");
    });
  });

  // ──── Step 4 (cont.): handleSubmit with no local `loading` state ────
  describe("handleSubmit (try/catch simple, sin loading local)", () => {
    it("actualiza el médico, muestra alert.success y redirige a /4dnn1n/doctors", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor({ id: 5 }));
      (updateDoctor as any).mockResolvedValue({ id: 5 });

      render(<EditDoctorPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateDoctor).toHaveBeenCalledWith(5, {
          name: "Carlos",
          lastname: "Pérez Editado",
          specialty_id: 2,
          city_id: 4,
          phone: "6011234567",
          movil: "3009876543",
          address: "Calle 2",
          secretary_name: "Ana",
          value_agreement: 120000,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/doctors");
    });

    it("si updateDoctor rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getDoctor as any).mockResolvedValue(createMockDoctor({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar el médico" } };
      (updateDoctor as any).mockRejectedValue(apiError);

      render(<EditDoctorPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar el médico"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
