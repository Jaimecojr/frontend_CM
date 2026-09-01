import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewCounselorPage from "@/app/4dnn1n/counselors/new/page";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { createCounselor } from "@/app/4dnn1n/counselors/fetch";

// NOTE (finding, not a defect to fix here): unlike `agreements/new/page.tsx`,
// this page does not import `useAuth` nor check any permission — any
// authenticated user who navigates to `/4dnn1n/counselors/new` can create a
// counselor. Tests below reflect that real behavior as-is.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/counselors/fetch", () => ({
  createCounselor: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// exposes a "submit-stub" button that invokes `onSubmit` with a fixed test
// payload, and surfaces `mode` as a data attribute for assertions.
vi.mock("@/app/4dnn1n/counselors/_components/CounselorForm", () => ({
  default: (props: any) => (
    <div data-testid="counselor-form" data-mode={props.mode}>
      <button
        data-testid="submit-stub"
        onClick={() =>
          props.onSubmit?.({
            name: "Nuevo",
            lastname: "Asesor",
            id_card: "1000999",
            type_contra: "Término Fijo",
            password: "secret123",
            city_id: 3,
            user_id: 2,
          })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function mockConfirm() {
  (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
    if (onConfirm) await onConfirm();
    return true;
  });
}

describe("NewCounselorPage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: vi.fn(), push: pushMock });
  });

  // ──── Step 2: sin gate de permisos ────
  it("renderiza el formulario directamente, sin verificar user.type", () => {
    // Act
    render(<NewCounselorPage />);

    // Assert
    expect(screen.getByTestId("counselor-form")).toHaveAttribute("data-mode", "create");
  });

  // ──── Step 2 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, crea el asesor, muestra alert.success y redirige a /4dnn1n/counselors", async () => {
      // Arrange
      (createCounselor as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<NewCounselorPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(createCounselor).toHaveBeenCalledWith({
          name: "Nuevo",
          lastname: "Asesor",
          id_card: "1000999",
          type_contra: "Término Fijo",
          password: "secret123",
          city_id: 3,
          user_id: 2,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/counselors");
    });

    it("si createCounselor rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      const apiError = { data: { message: "No se pudo crear el asesor" } };
      (createCounselor as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<NewCounselorPage />);
      const submitButton = screen.getByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo crear el asesor"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
