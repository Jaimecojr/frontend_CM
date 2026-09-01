import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAgreementPage from "@/app/4dnn1n/agreements/[id]/edit/page";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getAgreement, updateAgreement } from "@/app/4dnn1n/agreements/fetch";
import type { ApiAgreement } from "@/app/4dnn1n/agreements/fetch";

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
  getAgreement: vi.fn(),
  updateAgreement: vi.fn(),
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
          props.onSubmit?.({ name: "Convenio Editado", amount: 60000, city_id: 4, state: 1 })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockAgreement(overrides: Partial<ApiAgreement> = {}): ApiAgreement {
  return {
    id: 5,
    name: "Convenio A",
    amount: 50000,
    state: 1,
    city_id: 3,
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

describe("EditAgreementPage", () => {
  let replaceMock: ReturnType<typeof vi.fn>;
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    replaceMock = vi.fn();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: replaceMock, push: pushMock });
    // Default resolved value: the gate-fetch effect fires unconditionally
    // (regardless of the permission check), so give it something to resolve
    // even in tests where the rendered result is discarded due to the gate.
    (getAgreement as any).mockResolvedValue(createMockAgreement());
  });

  // ──── Step 5: gate y skeleton ────
  describe("gate de permisos y skeleton", () => {
    it("user.type: 3 → redirige vía router.replace y no renderiza el formulario (retorna null)", async () => {
      // Arrange
      mockAuth(3);
      mockParams("5");

      // Act
      const { container } = render(<EditAgreementPage />);

      // Assert
      await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/4dnn1n/agreements"));
      expect(screen.queryByTestId("agreement-form")).not.toBeInTheDocument();
      expect(container).toBeEmptyDOMElement();
    });

    it("user.type: 1 mientras getAgreement no ha resuelto → muestra FormPageSkeleton", () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      // Left pending on purpose: assertions run before it ever resolves.
      (getAgreement as any).mockReturnValue(new Promise(() => {}));

      // Act
      const { container } = render(<EditAgreementPage />);

      // Assert
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
      expect(screen.queryByTestId("agreement-form")).not.toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // ──── Step 5 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, actualiza el convenio, muestra alert.success y redirige a /4dnn1n/agreements", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAgreement as any).mockResolvedValue(createMockAgreement({ id: 5 }));
      (updateAgreement as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditAgreementPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateAgreement).toHaveBeenCalledWith(5, {
          name: "Convenio Editado",
          amount: 60000,
          city_id: 4,
          state: 1,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/agreements");
    });

    it("si updateAgreement rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockAuth(1);
      mockParams("5");
      (getAgreement as any).mockResolvedValue(createMockAgreement({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar el convenio" } };
      (updateAgreement as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditAgreementPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar el convenio"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
