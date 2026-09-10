import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewAgreementPage from "@/app/4dnn1n/agreements/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createAgreement } from "@/app/4dnn1n/agreements/fetch";

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
vi.mock("@/app/4dnn1n/agreements/fetch", () => ({
  createAgreement: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/agreements/_components/AgreementForm", () => ({
  default: (props: any) => (
    <div data-testid="agreement-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({ name: "Convenio Nuevo", amount: 50000, city_id: 3, state: 1 })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function mockAuth(type: number | null) {
  (useAuth as any).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading: false,
    isLoggingOut: false,
  });
}

function mockConfirm() {
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
}

describe("NewAgreementPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 3: gate via useEffect + redirect ────
  describe("gate de permisos", () => {
    it("user.type: 3 → no renderiza el formulario (retorna null) y redirige vía router.replace", async () => {
      // Arrange
      mockAuth(3);

      // Act
      const { container } = render(<NewAgreementPage />);

      // Assert
      expect(screen.queryByTestId("agreement-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/agreements"));
    });

    it("user.type: 1 → formulario visible, sin redirección", async () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewAgreementPage />);

      // Assert
      expect(await screen.findByTestId("agreement-form")).toHaveAttribute("data-mode", "create");
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("user: null (aún no resuelto por AuthContext) → no renderiza el formulario y NO redirige", async () => {
      // Arrange
      (useAuth as any).mockReturnValue({ user: null, loading: true, isLoggingOut: false });

      // Act
      const { container } = render(<NewAgreementPage />);

      // Assert
      expect(screen.queryByTestId("agreement-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, crea el convenio, muestra alert.success y redirige a /4dnn1n/agreements", async () => {
      // Arrange
      mockAuth(1);
      (createAgreement as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<NewAgreementPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createAgreement).toHaveBeenCalledWith({
          name: "Convenio Nuevo",
          amount: 50000,
          city_id: 3,
          state: 1,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/agreements");
    });

    it("si createAgreement rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear el convenio" } };
      (createAgreement as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<NewAgreementPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear el convenio"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
