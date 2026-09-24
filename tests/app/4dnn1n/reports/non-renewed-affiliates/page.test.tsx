import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NonRenewedAffiliatesPage from "@/app/4dnn1n/reports/non-renewed-affiliates/page";
import { useAuth } from "@/context/AuthContext";
import { getNonRenewedAffiliatesReport } from "@/app/4dnn1n/reports/non-renewed-affiliates/fetch";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/non-renewed-affiliates",
  useSearchParams: () => mockSearchParams,
}));
vi.mock("@/app/4dnn1n/reports/non-renewed-affiliates/fetch", () => ({
  getNonRenewedAffiliatesReport: vi.fn(),
}));
// The franchise catalog is loaded via the shared useFranchiseOptions hook,
// which reads from _lib/catalogs directly — not re-exported through fetch.ts
// anymore, so this is mocked at its real source.
vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("NonRenewedAffiliatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getNonRenewedAffiliatesReport as any).mockResolvedValue({
      data: [
        { id: 1, validity_end: "2026-01-10", name: "MARIA TORRES", phone: "6011234567", movil: "3001234567", franchise: "FRANQUICIA NORTE" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("should render the report rows", async () => {
    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
  });

  it("should only show the 'Desde' filter, without a 'Hasta' filter", async () => {
    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Vencidos desde")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Hasta")).not.toBeInTheDocument();
  });

  it("should not show the Franquicia filter for a franchise user (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });

  it("should remove from in a single replace when the 'Limpiar fechas' button is clicked (only the 'Desde' filter exists)", async () => {
    // Arrange — a bookmarked URL with the only date filter this report has
    mockSearchParams = new URLSearchParams("from=2026-01-01");

    // Act
    render(<NonRenewedAffiliatesPage />);
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("from=");
  });
});
