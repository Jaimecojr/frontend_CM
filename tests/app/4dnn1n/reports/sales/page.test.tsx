import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SalesReportPage from "@/app/4dnn1n/reports/sales/page";
import { useAuth } from "@/context/AuthContext";
import { getSalesReport } from "@/app/4dnn1n/reports/sales/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/sales",
  useSearchParams: () => new URLSearchParams(),
}));
// getActiveFranchises is added here (not in the brief's mock) because the
// page now renders <FranchiseSelect>, which is populated from this call for
// a super admin — leaving it unmocked would reject with "not a function".
vi.mock("@/app/4dnn1n/reports/sales/fetch", () => ({
  getSalesReport: vi.fn(),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("SalesReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renderiza las filas del reporte y los totales", async () => {
    // Act
    render(<SalesReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    // Exact match (not /Nuevo/i): the totals card label "Nuevos" also
    // contains "Nuevo" as a substring, which a case-insensitive regex would
    // match too and make this assertion ambiguous.
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("no muestra el filtro de Franquicia para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<SalesReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("ANA LOPEZ")).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });
});
