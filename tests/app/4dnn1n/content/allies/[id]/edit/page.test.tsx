import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAllyPage from "@/app/4dnn1n/content/allies/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getAllies, updateAlly } from "@/app/4dnn1n/content/allies/fetch";
import type { ApiAlly } from "@/app/4dnn1n/content/allies/fetch";

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
// this page-level test. There is no individual `getAlly(id)` fetch — this page
// resolves its record by calling the full-list `getAllies()` and finding the
// matching item with `.find()`.
vi.mock("@/app/4dnn1n/content/allies/fetch", () => ({
  getAllies: vi.fn(),
  updateAlly: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed FormData
// payload, and surfaces `mode`/`initial.id` as data attributes for assertions.
vi.mock("@/app/4dnn1n/content/allies/_components/AllyForm", () => ({
  default: (props: any) => (
    <div data-testid="ally-form" data-mode={props.mode} data-initial-id={props.initial?.id}>
      <button
        data-testid="submit-stub"
        onClick={() => {
          const fd = new FormData();
          fd.append("url", "https://editado.com");
          fd.append("position", "2");
          props.onSubmit?.(fd);
        }}
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockAlly(overrides: Partial<ApiAlly> = {}): ApiAlly {
  return {
    id: 1,
    image: "allies/banner.jpg",
    image_filename: "banner.jpg",
    url: "https://empresa.com",
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

describe("EditAllyPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
  });

  // ──── Step 3.1 and 3.2: resolving the ally by searching the full list ────
  describe("resolución del aliado a partir de getAllies()", () => {
    it("si el id de la URL no está en la lista, redirige a /4dnn1n/content/allies y no renderiza el formulario", async () => {
      // Arrange
      mockAuth(1);
      mockParams("99");
      (getAllies as any).mockResolvedValue([createMockAlly({ id: 1 }), createMockAlly({ id: 2 })]);

      // Act
      render(<EditAllyPage />);

      // Assert
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content/allies"));
      expect(screen.queryByTestId("ally-form")).not.toBeInTheDocument();
    });

    it("si el id de la URL está en la lista, renderiza AllyForm en modo edit con el aliado encontrado como initial", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockAlly({ id: 2, url: "https://encontrado.com" });
      (getAllies as any).mockResolvedValue([createMockAlly({ id: 1 }), target]);

      // Act
      render(<EditAllyPage />);

      // Assert
      const form = await screen.findByTestId("ally-form");
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
      (getAllies as any).mockResolvedValue([createMockAlly({ id: 2 })]);

      // Act
      const { container } = render(<EditAllyPage />);

      // Assert
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/content"));
      expect(screen.queryByTestId("ally-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });
  });

  // ──── Step 3.4: onSubmit ────
  describe("onSubmit", () => {
    it("confirma, actualiza el aliado, muestra alert.success y redirige a /4dnn1n/content/allies", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockAlly({ id: 2 });
      (getAllies as any).mockResolvedValue([target]);
      (updateAlly as any).mockResolvedValue({ id: 2 });
      mockConfirm();

      render(<EditAllyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() => expect(updateAlly).toHaveBeenCalledTimes(1));
      const [id, formData] = (updateAlly as any).mock.calls[0];
      expect(id).toBe(2);
      expect((formData as FormData).get("url")).toBe("https://editado.com");
      expect((formData as FormData).get("position")).toBe("2");
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Actualizado", "Aliado actualizado correctamente."),
      );
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/content/allies");
    });

    it("si updateAlly rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("2");
      const target = createMockAlly({ id: 2 });
      (getAllies as any).mockResolvedValue([target]);
      const apiError = { data: { message: "No se pudo actualizar el aliado" } };
      (updateAlly as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditAllyPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar el aliado"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
