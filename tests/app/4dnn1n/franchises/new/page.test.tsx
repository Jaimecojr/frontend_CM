import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewUserPage from "@/app/4dnn1n/franchises/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createUser } from "@/app/4dnn1n/franchises/fetch";

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
vi.mock("@/app/4dnn1n/franchises/fetch", () => ({
  createUser: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode` as a data attribute for assertions. A second
// "submit-stub-no-password" button omits `password` to exercise the
// page-level password guard, which the real FranchiseForm's own `canSubmit`
// normally prevents from ever being reached with a real user.
vi.mock("@/app/4dnn1n/franchises/_components/FranchiseForm", () => ({
  default: (props: any) => (
    <div data-testid="franchise-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({
            nit: "900123456",
            name: "Franquicia Nueva",
            email: "nueva@test.com",
            user: "nueva1",
            password: "secret1",
            city_id: 3,
            state: 1,
          })
        }
      >
        submit-stub
      </button>
      <button
        data-testid="submit-stub-no-password"
        onClick={() =>
          props.onSubmit?.({
            nit: "900123456",
            name: "Franquicia Nueva",
            email: "nueva@test.com",
            user: "nueva1",
            password: undefined,
            city_id: 3,
            state: 1,
          })
        }
      >
        submit-stub-no-password
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

function mockConfirm() {
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
}

describe("NewUserPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 2: synchronous gate with no redirect (inline message) ────
  describe("gate de permisos (chequeo síncrono, sin router.replace/push)", () => {
    it("loading: true → no renderiza nada (retorna null)", () => {
      // Arrange
      mockAuth(1, true);

      // Act
      const { container } = render(<NewUserPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("loading: false, user.type: 2 → muestra el mensaje de permisos insuficientes sin invocar router", () => {
      // Arrange
      mockAuth(2);

      // Act
      render(<NewUserPage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("franchise-form")).not.toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("loading: false, user.type: 1 → formulario visible", () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewUserPage />);

      // Assert
      expect(screen.getByTestId("franchise-form")).toHaveAttribute("data-mode", "create");
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });
  });

  // ──── Step 2 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, crea la franquicia, muestra alert.success y redirige a /4dnn1n/franchises", async () => {
      // Arrange
      mockAuth(1);
      (createUser as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<NewUserPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createUser).toHaveBeenCalledWith({
          nit: "900123456",
          name: "Franquicia Nueva",
          email: "nueva@test.com",
          user: "nueva1",
          password: "secret1",
          city_id: 3,
          state: 1,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/franchises");
    });

    it("si createUser rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear la franquicia" } };
      (createUser as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<NewUserPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear la franquicia"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("si el payload llega sin password, muestra alert.warn y no llama a createUser", async () => {
      // Arrange
      mockAuth(1);
      mockConfirm();

      render(<NewUserPage />);
      const submitButton = screen.getByTestId("submit-stub-no-password");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.warn).toHaveBeenCalledWith(
          "Faltan datos",
          "La contraseña es obligatoria para crear la franquicia.",
        ),
      );
      expect(createUser).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
