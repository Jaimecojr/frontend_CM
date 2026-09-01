import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ViewCounselorPage from "@/app/4dnn1n/counselors/[id]/page";
import { useParams } from "next/navigation";
import { getCounselor } from "@/app/4dnn1n/counselors/fetch";
import type { ApiCounselor } from "@/app/4dnn1n/counselors/fetch";

// NOTE (finding, not a defect to fix here): this view page does not import
// `useAuth` nor check any permission — any authenticated user who navigates
// to the URL can view the counselor. Tests below reflect that real behavior
// as-is.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/counselors/fetch", () => ({
  getCounselor: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/counselors/_components/CounselorForm", () => ({
  default: (props: any) => (
    <div
      data-testid="counselor-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    />
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

describe("ViewCounselorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 3: sin gate de permisos ────
  it("muestra FormPageSkeleton mientras getCounselor no ha resuelto, sin renderizar el formulario", () => {
    // Arrange
    mockParams("5");
    // Left pending on purpose: assertions run before it ever resolves.
    (getCounselor as any).mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<ViewCounselorPage />);

    // Assert: the skeleton renders its pulsing placeholders and the real form
    // never mounts while the fetch is still pending.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("counselor-form")).not.toBeInTheDocument();
  });

  it("cuando getCounselor(5) resuelve, renderiza CounselorForm con mode='view' e initial=data", async () => {
    // Arrange
    mockParams("5");
    const counselor = createMockCounselor({ id: 5, name: "Juan" });
    (getCounselor as any).mockResolvedValue(counselor);

    // Act
    render(<ViewCounselorPage />);

    // Assert
    expect(getCounselor).toHaveBeenCalledWith(5);
    const form = await screen.findByTestId("counselor-form");
    expect(form).toHaveAttribute("data-mode", "view");
    expect(JSON.parse(form.getAttribute("data-initial") as string)).toEqual(counselor);
  });
});
