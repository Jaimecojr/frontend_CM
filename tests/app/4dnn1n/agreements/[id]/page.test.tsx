import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ViewAgreementPage from "@/app/4dnn1n/agreements/[id]/page";
import { useParams } from "next/navigation";
import { getAgreement } from "@/app/4dnn1n/agreements/fetch";
import type { ApiAgreement } from "@/app/4dnn1n/agreements/fetch";

// NOTE (finding, not a defect to fix here): unlike `new/page.tsx` and
// `[id]/edit/page.tsx`, this view page does not import `useAuth` nor check
// any permission — any authenticated user who navigates to the URL can view
// the agreement. Tests below reflect that real behavior as-is.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/agreements/fetch", () => ({
  getAgreement: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/agreements/_components/AgreementForm", () => ({
  default: (props: any) => (
    <div
      data-testid="agreement-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    />
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

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewAgreementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 4: no permission gate ────
  it("muestra FormPageSkeleton mientras getAgreement no ha resuelto, sin renderizar el formulario", () => {
    // Arrange
    mockParams("5");
    // Left pending on purpose: assertions run before it ever resolves.
    (getAgreement as any).mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<ViewAgreementPage />);

    // Assert: the skeleton renders its pulsing placeholders and the real form
    // never mounts while the fetch is still pending.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("agreement-form")).not.toBeInTheDocument();
  });

  it("cuando getAgreement(5) resuelve, renderiza AgreementForm con mode='view' e initial=data", async () => {
    // Arrange
    mockParams("5");
    const agreement = createMockAgreement({ id: 5, name: "Convenio A" });
    (getAgreement as any).mockResolvedValue(agreement);

    // Act
    render(<ViewAgreementPage />);

    // Assert
    expect(getAgreement).toHaveBeenCalledWith(5);
    const form = await screen.findByTestId("agreement-form");
    expect(form).toHaveAttribute("data-mode", "view");
    expect(JSON.parse(form.getAttribute("data-initial") as string)).toEqual(agreement);
  });
});
