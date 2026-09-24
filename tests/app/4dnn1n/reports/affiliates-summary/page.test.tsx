import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AffiliatesSummaryPage from "@/app/4dnn1n/reports/affiliates-summary/page";
import { useAuth } from "@/context/AuthContext";
import {
  getAffiliatesSummaryReport,
  getDepartments,
  getCitiesByDepartment,
} from "@/app/4dnn1n/reports/affiliates-summary/fetch";

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

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

// Filters live in the URL via the shared useUrlFilters hook (used by
// useAffiliatesSummaryData), same as every other report page's tests.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/affiliates-summary",
  useSearchParams: () => mockSearchParams,
}));

describe("AffiliatesSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getAffiliatesSummaryReport as any).mockResolvedValue({
      titulares: 100,
      titulares_activos: 80,
      titulares_inactivos: 20,
      beneficiarios: 40,
      beneficiarios_activos: 30,
      beneficiarios_inactivos: 10,
    });
    (getDepartments as any).mockResolvedValue([]);
    (getCitiesByDepartment as any).mockResolvedValue([]);
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

  it("lee los filtros iniciales desde la URL", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("city_id=5");

    // Act
    render(<AffiliatesSummaryPage />);

    // Assert
    await waitFor(() =>
      expect(getAffiliatesSummaryReport).toHaveBeenCalledWith(
        expect.objectContaining({ city_id: "5" }),
      ),
    );
  });

  it("cambiar el departamento quita city_id de la URL en el mismo replace", async () => {
    // Arrange — a bookmarked URL with both a department and a city selected
    mockSearchParams = new URLSearchParams("department_id=1&city_id=9");
    (getDepartments as any).mockResolvedValue([
      { id: 1, name: "ANTIOQUIA" },
      { id: 2, name: "CUNDINAMARCA" },
    ]);
    (getCitiesByDepartment as any).mockResolvedValue([{ id: 9, name: "MEDELLIN" }]);
    render(<AffiliatesSummaryPage />);
    await waitFor(() => expect(screen.getByTitle("Filtrar por Departamento")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("ANTIOQUIA")).toBeInTheDocument());

    // Act — switch to a different department
    fireEvent.change(screen.getByTitle("Filtrar por Departamento"), { target: { value: "2" } });

    // Assert — a single replace carries the new department AND drops city_id
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    const [url] = mockReplace.mock.calls[mockReplace.mock.calls.length - 1];
    expect(url).toContain("department_id=2");
    expect(url).not.toContain("city_id=");
  });

  it("el botón 'Limpiar fechas' quita from y to en un solo replace", async () => {
    // Arrange — a bookmarked URL with both dates already set
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-31");

    // Act
    render(<AffiliatesSummaryPage />);
    await waitFor(() => expect(screen.getByTestId("indicator-titulares")).toHaveTextContent("100"));
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("from=");
    expect(url).not.toContain("to=");
  });
});
