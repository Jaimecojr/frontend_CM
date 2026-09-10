import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ViewFranchisePage from "@/app/4dnn1n/franchises/[id]/page";
import { useParams } from "next/navigation";
import { getFranchise } from "@/app/4dnn1n/franchises/fetch";
import type { ApiFranchise } from "@/app/4dnn1n/franchises/fetch";

// NOTE (finding, not a defect to fix here): unlike `new/page.tsx` and
// `[id]/edit/page.tsx`, this view page does not import `useAuth` nor check
// any permission — any authenticated user who navigates to the URL can view
// the franchise. Tests below reflect that real behavior as-is.

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/franchises/fetch", () => ({
  getFranchise: vi.fn(),
}));

// Stub replacement for the real form (already tested in a previous task):
// surfaces `mode`/`initial` as data attributes for assertions.
vi.mock("@/app/4dnn1n/franchises/_components/FranchiseForm", () => ({
  default: (props: any) => (
    <div
      data-testid="franchise-form"
      data-mode={props.mode}
      data-initial={props.initial ? JSON.stringify(props.initial) : undefined}
    />
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

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewFranchisePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 3: no permission gate ────
  it("muestra FormPageSkeleton mientras getFranchise no ha resuelto, sin renderizar el formulario", () => {
    // Arrange
    mockParams("5");
    // Left pending on purpose: assertions run before it ever resolves.
    (getFranchise as any).mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<ViewFranchisePage />);

    // Assert: the skeleton renders its pulsing placeholders and the real form
    // never mounts while the fetch is still pending.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("franchise-form")).not.toBeInTheDocument();
  });

  it("cuando getFranchise(5) resuelve, renderiza FranchiseForm con mode='view' e initial=data", async () => {
    // Arrange
    mockParams("5");
    const franchise = createMockFranchise({ id: 5, name: "Franquicia Medellín" });
    (getFranchise as any).mockResolvedValue(franchise);

    // Act
    render(<ViewFranchisePage />);

    // Assert
    expect(getFranchise).toHaveBeenCalledWith(5);
    const form = await screen.findByTestId("franchise-form");
    expect(form).toHaveAttribute("data-mode", "view");
    expect(JSON.parse(form.getAttribute("data-initial") as string)).toEqual(franchise);
  });
});
