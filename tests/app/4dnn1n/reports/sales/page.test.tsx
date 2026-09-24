import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import SalesReportPage from "@/app/4dnn1n/reports/sales/page";
import { useAuth } from "@/context/AuthContext";
import { getSalesReport } from "@/app/4dnn1n/reports/sales/fetch";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/sales",
  useSearchParams: () => mockSearchParams,
}));
vi.mock("@/app/4dnn1n/reports/sales/fetch", () => ({ getSalesReport: vi.fn() }));
// The franchise catalog is loaded via the shared useFranchiseOptions hook,
// which reads from _lib/catalogs directly — not re-exported through fetch.ts
// anymore, so this is mocked at its real source.
vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("SalesReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getSalesReport as any).mockResolvedValue({
      data: [
        {
          id: 1,
          payment_date: "2026-01-15",
          fecha_desde: "2026-01-15",
          validity_end: "2027-01-15",
          validity: "2026-01-15",
          counselor: "PEDRO GOMEZ",
          name: "ANA LOPEZ",
          franchise: "FRANQUICIA CENTRO",
          tipo_venta: "Nuevo",
          valor_venta: 150000,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      totals: { new_count: 1, new_value: 150000, renewal_count: 0, renewal_value: 0 },
    });
  });

  it("should render the report rows and the totals", async () => {
    // Act
    render(<SalesReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    // Exact match (not /Nuevo/i): the totals card label "Nuevos" also
    // contains "Nuevo" as a substring, which a case-insensitive regex would
    // match too and make this assertion ambiguous.
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("should not show the Franquicia filter for a franchise user (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<SalesReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });

  it("should remove from and to in a single replace when the 'Limpiar fechas' button is clicked", async () => {
    // Arrange — a bookmarked URL with both dates already set
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-31");

    // Act
    render(<SalesReportPage />);
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("from=");
    expect(url).not.toContain("to=");
  });
});
