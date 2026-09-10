import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditSpecialistPage from "@/app/4dnn1n/content/specialists/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getSpecialists, updateSpecialist } from "@/app/4dnn1n/content/specialists/fetch";
import type { ApiSpecialist } from "@/app/4dnn1n/content/specialists/fetch";

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
// this page-level test. There is no individual `getSpecialist(id)` fetch --
// this page resolves its record by calling the full-list `getSpecialists()`
// and finding the matching item with `.find()`.
vi.mock("@/app/4dnn1n/content/specialists/fetch", () => ({
  getSpecialists: vi.fn(),
  updateSpecialist: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed FormData
// payload, and surfaces `mode`/`initial.id` as data attributes for assertions.
vi.mock("@/app/4dnn1n/content/specialists/_components/SpecialistForm", () => ({
  default: (props: any) => (
    <div data-testid="specialist-form" data-mode={props.mode} data-initial-id={props.initial?.id}>
      <button
        data-testid="submit-stub"
        onClick={() => {
          const fd = new FormData();
          fd.append("name", "Dra. Editada");
          fd.append("specialty", "Pediatría");
          props.onSubmit?.(fd);
        }}
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockSpecialist(overrides: Partial<ApiSpecialist> = {}): ApiSpecialist {
  return {
    id: 1,
    name: "Dra. Ana Perez",
    specialty: "Cardiología",
    photo: "specialists/ana.jpg",
    photo_filename: "ana.jpg",
    position: 1,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

function mockConfirm() {
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
}

describe("EditSpecialistPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 3.1 and 3.2: resolving the specialist by searching the full list ────
  describe("resolución del especialista a partir de getSpecialists()", () => {
    it("si el id de la URL no está en la lista, redirige a /4dnn1n/content/specialists y no renderiza el formulario", async () => {
      // Arrange
      mockAuth(1);
      mockParams("99");
      (getSpecialists as any).mockResolvedValue([
        createMockSpecialist({ id: 1 }),
        createMockSpecialist({ id: 2 }),
      ]);

      // Act
      render(<EditSpecialistPage />);

      // Assert
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content/specialists"));
      expect(screen.queryByTestId("specialist-form")).not.toBeInTheDocument();
    });

    it("si el id de la URL está en la lista, renderiza SpecialistForm en modo edit con el especialista encontrado como initial", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockSpecialist({ id: 2, name: "Dra. Encontrada" });
      (getSpecialists as any).mockResolvedValue([createMockSpecialist({ id: 1 }), target]);

      // Act
      render(<EditSpecialistPage />);

      // Assert
      const form = await screen.findByTestId("specialist-form");
      expect(form).toHaveAttribute("data-mode", "edit");
      expect(form).toHaveAttribute("data-initial-id", "2");
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3.3: permission gate ────
  describe("gate de permisos", () => {
    it("user.type: 2 → no renderiza el formulario (retorna null) y redirige vía router.replace a /4dnn1n/content", async () => {
      // Arrange
      mockAuth(2);
      mockParams("2");
      (getSpecialists as any).mockResolvedValue([createMockSpecialist({ id: 2 })]);

      // Act
      const { container } = render(<EditSpecialistPage />);

      // Assert
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content"));
      expect(screen.queryByTestId("specialist-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ──── Step 3.4: onSubmit ────
  describe("onSubmit", () => {
    it("confirma, actualiza el especialista, muestra alert.success y redirige a /4dnn1n/content/specialists", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockSpecialist({ id: 2 });
      (getSpecialists as any).mockResolvedValue([target]);
      (updateSpecialist as any).mockResolvedValue({ id: 2 });
      mockConfirm();

      render(<EditSpecialistPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(updateSpecialist).toHaveBeenCalledTimes(1));
      const [id, formData] = (updateSpecialist as any).mock.calls[0];
      expect(id).toBe(2);
      expect((formData as FormData).get("name")).toBe("Dra. Editada");
      expect((formData as FormData).get("specialty")).toBe("Pediatría");
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith(
          "Actualizado",
          "Especialista actualizado correctamente.",
        ),
      );
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/content/specialists");
    });

    it("si updateSpecialist rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockSpecialist({ id: 2 });
      (getSpecialists as any).mockResolvedValue([target]);
      const apiError = { data: { message: "No se pudo actualizar el especialista" } };
      (updateSpecialist as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditSpecialistPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar el especialista"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
