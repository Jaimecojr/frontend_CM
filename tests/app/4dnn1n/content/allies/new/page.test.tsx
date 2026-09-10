import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewAllyPage from "@/app/4dnn1n/content/allies/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createAlly } from "@/app/4dnn1n/content/allies/fetch";

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
vi.mock("@/app/4dnn1n/content/allies/fetch", () => ({
  createAlly: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed FormData
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/content/allies/_components/AllyForm", () => ({
  default: (props: any) => (
    <div data-testid="ally-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() => {
          const fd = new FormData();
          fd.append("url", "https://nuevo-aliado.com");
          fd.append("position", "3");
          props.onSubmit?.(fd);
        }}
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

describe("NewAllyPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 2: useEffect + redirect permission gate ────
  describe("gate de permisos", () => {
    it("user.type: 2 → no renderiza el formulario (retorna null) y redirige vía router.replace", async () => {
      // Arrange
      mockAuth(2);

      // Act
      const { container } = render(<NewAllyPage />);

      // Assert
      expect(screen.queryByTestId("ally-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content"));
    });

    it("user.type: 1 → formulario visible, sin redirección", async () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewAllyPage />);

      // Assert
      expect(await screen.findByTestId("ally-form")).toHaveAttribute("data-mode", "create");
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("user: null (aún no resuelto) → retorna null sin llamar router.replace todavía", () => {
      // Arrange
      mockAuth(null);

      // Act
      const { container } = render(<NewAllyPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // ──── Step 2 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, crea el aliado, muestra alert.success y redirige a /4dnn1n/content/allies", async () => {
      // Arrange
      mockAuth(1);
      (createAlly as any).mockResolvedValue({ id: 1 });
      mockConfirm();

      render(<NewAllyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(createAlly).toHaveBeenCalledTimes(1));
      const formData = (createAlly as any).mock.calls[0][0] as FormData;
      expect(formData.get("url")).toBe("https://nuevo-aliado.com");
      expect(formData.get("position")).toBe("3");
      await waitFor(() => expect(alert.success).toHaveBeenCalledWith("Creado", "Aliado agregado exitosamente."));
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/content/allies");
    });

    it("si createAlly rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear el aliado" } };
      (createAlly as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<NewAllyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear el aliado"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("no llama a createAlly ni redirige cuando se cancela la confirmación", async () => {
      // Arrange
      mockAuth(1);
      (alert.confirm as any).mockResolvedValue(false);

      render(<NewAllyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(createAlly).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
