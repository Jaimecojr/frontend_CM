import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewSpecialistPage from "@/app/4dnn1n/content/specialists/new/page";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createSpecialist } from "@/app/4dnn1n/content/specialists/fetch";

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
vi.mock("@/app/4dnn1n/content/specialists/fetch", () => ({
  createSpecialist: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed FormData
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/content/specialists/_components/SpecialistForm", () => ({
  default: (props: any) => (
    <div data-testid="specialist-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() => {
          const fd = new FormData();
          fd.append("name", "Dra. Nueva Especialista");
          fd.append("specialty", "Dermatología");
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

describe("NewSpecialistPage", () => {
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
      const { container } = render(<NewSpecialistPage />);

      // Assert
      expect(screen.queryByTestId("specialist-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content"));
    });

    it("user.type: 1 → formulario visible, sin redirección", async () => {
      // Arrange
      mockAuth(1);

      // Act
      render(<NewSpecialistPage />);

      // Assert
      expect(await screen.findByTestId("specialist-form")).toHaveAttribute("data-mode", "create");
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("user: null (aún no resuelto) → retorna null sin llamar router.replace todavía", () => {
      // Arrange
      mockAuth(null);

      // Act
      const { container } = render(<NewSpecialistPage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // ──── Step 2 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, crea el especialista, muestra alert.success y redirige a /4dnn1n/content/specialists", async () => {
      // Arrange
      mockAuth(1);
      (createSpecialist as any).mockResolvedValue({ id: 1 });
      mockConfirm();

      render(<NewSpecialistPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(createSpecialist).toHaveBeenCalledTimes(1));
      const formData = (createSpecialist as any).mock.calls[0][0] as FormData;
      expect(formData.get("name")).toBe("Dra. Nueva Especialista");
      expect(formData.get("specialty")).toBe("Dermatología");
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Creado", "Especialista agregado exitosamente."),
      );
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/content/specialists");
    });

    it("si createSpecialist rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      const apiError = { data: { message: "No se pudo crear el especialista" } };
      (createSpecialist as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<NewSpecialistPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear el especialista"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });

    it("no llama a createSpecialist ni redirige cuando se cancela la confirmación", async () => {
      // Arrange
      mockAuth(1);
      (alert.confirm as any).mockResolvedValue(false);

      render(<NewSpecialistPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(createSpecialist).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
