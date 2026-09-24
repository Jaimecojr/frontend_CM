import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BalanceReportPage from "@/app/4dnn1n/reports/balance/page";
import { useAuth } from "@/context/AuthContext";
import { getBalanceReport } from "@/app/4dnn1n/reports/balance/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/balance",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/balance/fetch", () => ({ getBalanceReport: vi.fn() }));
// The franchise catalog is loaded via the shared useFranchiseOptions hook,
// which reads from _lib/catalogs directly — not re-exported through fetch.ts
// anymore, so this is mocked at its real source.
vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("BalanceReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getBalanceReport as any).mockResolvedValue({
      data: [{ id: 1, counselor: "PEDRO GOMEZ", name: "JUAN PEREZ", balance: 50000, validity: "2026-01-01" }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      total_balance: 50000,
    });
  });

  it("renderiza las filas y el total de saldo", async () => {
    // Act
    render(<BalanceReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument());
    // Both the row's "balance" cell and the totals card render the same
    // formatted value ("$ 50.000"), so a single getByText would be ambiguous.
    const matches = screen.getAllByText(/50\.000/);
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("no muestra el filtro de Franquicia para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<BalanceReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("JUAN PEREZ")).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });
});
