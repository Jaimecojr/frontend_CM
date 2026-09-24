import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AffiliatesSummaryPage from "@/app/4dnn1n/reports/affiliates-summary/page";
import { useAuth } from "@/context/AuthContext";
import { getAffiliatesSummaryReport } from "@/app/4dnn1n/reports/affiliates-summary/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
// page.tsx gets getDepartments/getCitiesByDepartment through "./fetch" (which
// re-exports them from @/lib/geo) — the mock factory must cover all three,
// or the ones it omits come back `undefined` and crash the page on mount.
vi.mock("@/app/4dnn1n/reports/affiliates-summary/fetch", () => ({
  getAffiliatesSummaryReport: vi.fn(),
  getDepartments: vi.fn().mockResolvedValue([]),
  getCitiesByDepartment: vi.fn().mockResolvedValue([]),
}));
// The franchise catalog is loaded via the shared useFranchiseOptions hook,
// which reads from _lib/catalogs directly — not re-exported through fetch.ts,
// so this is mocked at its real source (see sales/page.test.tsx).
vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("AffiliatesSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getAffiliatesSummaryReport as any).mockResolvedValue({
      titulares: 100,
      titulares_activos: 80,
      titulares_inactivos: 20,
      beneficiarios: 40,
      beneficiarios_activos: 30,
      beneficiarios_inactivos: 10,
    });
  });

  it("renderiza los 6 indicadores", async () => {
    // Act
    render(<AffiliatesSummaryPage />);

    // Assert
    // Plain getByText("20") etc. would collide with flatpickr's day-grid
    // cells appended to document.body by the two date pickers on this page,
    // so each indicator card carries a stable data-testid instead.
    await waitFor(() => expect(screen.getByTestId("indicator-titulares")).toHaveTextContent("100"));
    expect(screen.getByTestId("indicator-titulares_activos")).toHaveTextContent("80");
    expect(screen.getByTestId("indicator-titulares_inactivos")).toHaveTextContent("20");
    expect(screen.getByTestId("indicator-beneficiarios")).toHaveTextContent("40");
    expect(screen.getByTestId("indicator-beneficiarios_activos")).toHaveTextContent("30");
    expect(screen.getByTestId("indicator-beneficiarios_inactivos")).toHaveTextContent("10");
  });

  it("no muestra el filtro de Franquicia para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<AffiliatesSummaryPage />);

    // Assert
    await waitFor(() => expect(screen.getByTestId("indicator-titulares")).toHaveTextContent("100"));
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });

  it("muestra un mensaje de error cuando la peticion de indicadores falla", async () => {
    // Arrange
    (getAffiliatesSummaryReport as any).mockRejectedValue(new Error("Fallo de red"));

    // Act
    render(<AffiliatesSummaryPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("Fallo de red")).toBeInTheDocument());
  });
});
