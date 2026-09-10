import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import FranchisePage from "@/app/4dnn1n/franchises/page";
import { useAuth } from "@/context/AuthContext";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import type { ApiFranchise } from "@/app/4dnn1n/franchises/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

// Mocked so we can assert the exact `ApiFranchise` row object handed to the
// toggle function returned by the hook, without exercising its real
// confirm/optimistic-update logic (already covered by the hook's own tests).
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/franchises/fetch", () => ({
  getFranchises: vi.fn(),
  updateFranchiseState: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildUserColumns`)
// for each row, and separately surfaces `toolbarActions` for the create-button
// assertions.
vi.mock("@/components/data-table/DataTable", () => ({
  DataTable: (props: any) => (
    <div data-testid="data-table">
      <div data-testid="toolbar-actions">{props.toolbarActions}</div>
      {props.data?.map((item: any) => {
        const actionsColumn = props.columns?.find((col: any) => col.id === "actions");
        return (
          <div key={item.id} data-testid={`row-${item.id}`}>
            {actionsColumn?.cell?.({ row: { original: item } })}
          </div>
        );
      })}
    </div>
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

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockClientTable(data: ApiFranchise[]) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading: false });
  return { setData };
}

describe("FranchisePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOptimisticToggle as any).mockReturnValue(vi.fn());
  });

  // ──── Step 1: isSuperAdmin gate for the "Crear Franquicia" button ────
  describe("gate isSuperAdmin para el botón 'Crear Franquicia'", () => {
    it("user.type: 2 → no renderiza el botón (toolbarActions vacío)", () => {
      // Arrange
      mockAuth(2);
      mockClientTable([]);

      // Act
      render(<FranchisePage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear franquicia/i })).not.toBeInTheDocument();
    });

    it("user.type: 1 → botón 'Crear Franquicia' visible con el href correcto", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<FranchisePage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear franquicia/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/franchises/new");
    });
  });

  // ──── Step 1 (cont.): click on a row's toggle button ────
  describe("toggle de estado desde la columna de acciones", () => {
    it("al hacer click en el botón de estado, invoca la función de useOptimisticToggle con el ApiFranchise de la fila", () => {
      // Arrange
      mockAuth(1);
      const franchise = createMockFranchise({ id: 5 });
      mockClientTable([franchise]);
      const toggleFn = vi.fn();
      (useOptimisticToggle as any).mockReturnValue(toggleFn);

      // Act
      render(<FranchisePage />);
      const row = screen.getByTestId("row-5");
      const toggleButton = row.querySelector("button") as HTMLButtonElement;
      toggleButton.click();

      // Assert
      expect(toggleFn).toHaveBeenCalledWith(franchise);
    });
  });
});
