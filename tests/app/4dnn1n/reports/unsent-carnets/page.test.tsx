import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import UnsentCarnetsPage from "@/app/4dnn1n/reports/unsent-carnets/page";
import { useAuth } from "@/context/AuthContext";
import { getUnsentCarnetsReport } from "@/app/4dnn1n/reports/unsent-carnets/fetch";

const mockReplace = vi.fn();
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/unsent-carnets",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/unsent-carnets/fetch", () => ({ getUnsentCarnetsReport: vi.fn() }));
// The franchise catalog is loaded via the shared useFranchiseOptions hook,
// which reads from _lib/catalogs directly — not re-exported through fetch.ts
// anymore, so this is mocked at its real source.
vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("UnsentCarnetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getUnsentCarnetsReport as any).mockResolvedValue({
      data: [{ date: "2026-09-01", name: "PEDRO RUIZ", phone: null, movil: "3001112233", franchise: "FRANQUICIA SUR" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas para super admin", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("PEDRO RUIZ")).toBeInTheDocument());
  });

  it("muestra el filtro de Franquicia para super admin", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(screen.getByText("PEDRO RUIZ")).toBeInTheDocument());
    expect(screen.getByTitle("Filtrar por Franquicia")).toBeInTheDocument();
  });

  it("redirige a /4dnn1n/home si el usuario es franquicia", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/4dnn1n/home"));
    expect(screen.queryByText("PEDRO RUIZ")).not.toBeInTheDocument();
  });

  it("no llama getUnsentCarnetsReport para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<UnsentCarnetsPage />);

    // Assert
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/4dnn1n/home"));
    expect(getUnsentCarnetsReport).not.toHaveBeenCalled();
  });
});
