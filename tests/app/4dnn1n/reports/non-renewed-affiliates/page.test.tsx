import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import NonRenewedAffiliatesPage from "@/app/4dnn1n/reports/non-renewed-affiliates/page";
import { useAuth } from "@/context/AuthContext";
import { getNonRenewedAffiliatesReport } from "@/app/4dnn1n/reports/non-renewed-affiliates/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/non-renewed-affiliates",
  useSearchParams: () => new URLSearchParams(),
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
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getNonRenewedAffiliatesReport as any).mockResolvedValue({
      data: [
        { id: 1, validity_end: "2026-01-10", name: "MARIA TORRES", phone: "6011234567", movil: "3001234567", franchise: "FRANQUICIA NORTE" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas del reporte", async () => {
    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
  });

  it("solo muestra el filtro 'Desde', sin filtro 'Hasta'", async () => {
    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Vencidos desde")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Hasta")).not.toBeInTheDocument();
  });

  it("no muestra el filtro de Franquicia para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<NonRenewedAffiliatesPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("MARIA TORRES")).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });
});
