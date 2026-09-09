import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewSpecialtyPage from "@/app/4dnn1n/doctors/specialties/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

// Same inline gate pattern as `doctors/new/page.tsx`: `authLoading` blocks
// render entirely (returns null), then a synchronous
// `type !== 1 && type !== 2` check shows an inline message — no redirect.

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
vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  createSpecialty: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload.
vi.mock("@/app/4dnn1n/doctors/specialties/_components/SpecialtyForm", () => ({
  default: (props: any) => (
    <div data-testid="specialty-form">
      <button
        data-testid="submit-stub"
        onClick={() => props.onSubmit?.({ name: "Cardiología", state: 1 })}
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

describe("NewSpecialtyPage", () => {
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
      const { container } = render(<NewSpecialtyPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("user.type: 3 → muestra el mensaje de permisos insuficientes sin invocar router", () => {
      // Arrange
      mockAuth(3);

      // Act
      render(<NewSpecialtyPage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("specialty-form")).not.toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("user.type: 1 → formulario visible", () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewSpecialtyPage />);

      // Assert
      expect(screen.getByTestId("specialty-form")).toBeInTheDocument();
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });

    it("user.type: 2 → formulario visible", () => {
      // Arrange
      mockAuth(2);

      // Act
      render(<NewSpecialtyPage />);

      // Assert
      expect(screen.getByTestId("specialty-form")).toBeInTheDocument();
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });
  });

  // ──── Step 2 (cont.): handleSubmit (loading state via try/finally) ────
  describe("handleSubmit", () => {
    it("crea la especialidad, muestra alert.success y redirige a /4dnn1n/doctors/specialties", async () => {
      // Arrange
      mockAuth(1);
      (createSpecialty as any).mockResolvedValue({ id: 5, name: "Cardiología", state: 1 });

      render(<NewSpecialtyPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createSpecialty).toHaveBeenCalledWith({ name: "Cardiología", state: 1 }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/doctors/specialties");
    });

    it("si createSpecialty rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear la especialidad" } };
      (createSpecialty as any).mockRejectedValue(apiError);

      render(<NewSpecialtyPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear la especialidad"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
