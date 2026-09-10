import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditCounselorPage from "@/app/4dnn1n/counselors/[id]/edit/page";
import { useParams, useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getCounselor, updateCounselor } from "@/app/4dnn1n/counselors/fetch";
import type { ApiCounselor } from "@/app/4dnn1n/counselors/fetch";

// NOTE (finding, not a defect to fix here): unlike `agreements/[id]/edit/page.tsx`,
// this page does not import `useAuth` nor check any permission — any
// authenticated user who navigates to the URL can edit the counselor. Tests
// below reflect that real behavior as-is.

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
  getCounselor: vi.fn(),
  updateCounselor: vi.fn(),
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
            name: "Juan Editado",
            lastname: "Pérez",
            city_id: 4,
          })
        }
      >
        submit-stub
      </button>
    </div>
  ),
}));

function createMockCounselor(overrides: Partial<ApiCounselor> = {}): ApiCounselor {
  return {
    id: 5,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1000123",
    type_contra: "Término Fijo",
    state: 1,
    city_id: 3,
    user_id: 2,
    ...overrides,
  };
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

describe("EditCounselorPage", () => {
  let pushMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    pushMock = vi.fn();
    (useRouter as any).mockReturnValue({ replace: vi.fn(), push: pushMock });
  });

  // ──── Step 4: no permission gate, and skeleton ────
  it("muestra FormPageSkeleton mientras getCounselor no ha resuelto, sin renderizar el formulario", () => {
    // Arrange
    mockParams("5");
    // Left pending on purpose: assertions run before it ever resolves.
    (getCounselor as any).mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<EditCounselorPage />);

    // Assert
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("counselor-form")).not.toBeInTheDocument();
  });

  // ──── Step 4 (cont.): onSubmit ────
  describe("onSubmit", () => {
    it("confirma, actualiza el asesor, muestra alert.success y redirige a /4dnn1n/counselors", async () => {
      // Arrange
      mockParams("5");
      (getCounselor as any).mockResolvedValue(createMockCounselor({ id: 5 }));
      (updateCounselor as any).mockResolvedValue({ message: "ok" });
      mockConfirm();

      render(<EditCounselorPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(updateCounselor).toHaveBeenCalledWith(5, {
          name: "Juan Editado",
          lastname: "Pérez",
          city_id: 4,
        }),
      );
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(pushMock).toHaveBeenCalledWith("/4dnn1n/counselors");
    });

    it("si updateCounselor rechaza, llama alert.error con el mensaje de la API y no redirige", async () => {
      // Arrange
      mockParams("5");
      (getCounselor as any).mockResolvedValue(createMockCounselor({ id: 5 }));
      const apiError = { data: { message: "No se pudo actualizar el asesor" } };
      (updateCounselor as any).mockRejectedValue(apiError);
      mockConfirm();

      render(<EditCounselorPage />);
      const submitButton = await screen.findByTestId("submit-stub");

      // Act
      await userEvent.click(submitButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo actualizar el asesor"),
      );
      expect(alert.success).not.toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    });
  });
});
