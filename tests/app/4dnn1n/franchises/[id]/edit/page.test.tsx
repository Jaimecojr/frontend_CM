import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditFranchisePage from "@/app/4dnn1n/franchises/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getFranchise, updateFranchise } from "@/app/4dnn1n/franchises/fetch";
import type { ApiFranchise } from "@/app/4dnn1n/franchises/fetch";

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
  getFranchise: vi.fn(),
  updateFranchise: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/franchises/_components/FranchiseForm", () => ({
  default: (props: any) => (
    <div data-testid="franchise-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({
            nit: "900123456",
            name: "Franquicia Editada",
            email: "editada@test.com",
            user: "editada1",
            city_id: 4,
            state: 1,
          })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockFranchise(overrides: Partial<ApiFranchise> = {}): ApiFranchise {
  return {
    id: 5,
    nit: "900123456",
    name: "Franquicia Medellín",
    email: "franquicia@test.com",
    user: "franquicia1",
    state: 1,
    type: 2,
    city_id: 3,
    ...overrides,
  };
}

function mockAuth(type: number, loading = false) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading, isLoggingOut: false });
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

describe("EditFranchisePage", () => {
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
    (getFranchise as any).mockResolvedValue(createMockFranchise());
  });

  // ──── Step 4: permission check runs BEFORE the data check ────
  describe("gate de permisos (orden: authLoading → permiso → dato)", () => {
    it("authLoading: true → no renderiza nada (retorna null)", () => {
      // Arrange
      mockAuth(1, true);
      mockParams("5");

      // Act
      const { container } = render(<EditFranchisePage />);

      // Assert
      expect(container).toBeEmptyDOMElement();
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it("authUser.type: 2, incluso con getFranchise sin resolver → muestra el mensaje de permisos de inmediato (no el skeleton)", () => {
      // Arrange
      mockAuth(2);
      mockParams("5");
      // Left pending on purpose: the permission message must appear even
      // though this promise never resolves during the test.
      (getFranchise as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<EditFranchisePage />);

      // Assert
      expect(
        screen.getByText("No tienes permisos suficientes para acceder a esta vista."),
      ).toBeInTheDocument();
      expect(container.querySelectorAll(".animate-pulse").length).toBe(0);
      expect(screen.queryByTestId("franchise-form")).not.toBeInTheDocument();
    });

    it("authUser.type: 1, dato sin resolver → muestra FormPageSkeleton", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      // Left pending on purpose: assertions run before it ever resolves.
      (getFranchise as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<EditFranchisePage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("franchise-form")).not.toBeInTheDocument();
      expect(
        screen.queryByText("No tienes permisos suficientes para acceder a esta vista."),
      ).not.toBeInTheDocument();
    });

    it("authUser.type: 1, dato resuelto → renderiza FranchiseForm con mode='edit'", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getFranchise as any).mockResolvedValue(createMockFranchise({ id: 5 }));

      // Act
      render(<EditFranchisePage />);

      // Assert
      const form = await screen.findByTestId("franchise-form");
      expect(form).toHaveAttribute("data-mode", "edit");
    });
  });

  // ──── Step 4 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, actualiza la franquicia, muestra alert.success y redirige a /4dnn1n/franchises", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getFranchise as any).mockResolvedValue(createMockFranchise({ id: 5 }));
      (updateFranchise as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditFranchisePage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateFranchise).toHaveBeenCalledWith(5, {
          nit: "900123456",
          name: "Franquicia Editada",
          email: "editada@test.com",
          user: "editada1",
          city_id: 4,
          state: 1,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/franchises");
    });

    it("si updateFranchise rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getFranchise as any).mockResolvedValue(createMockFranchise({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar la franquicia" } };
      (updateFranchise as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditFranchisePage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar la franquicia"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
