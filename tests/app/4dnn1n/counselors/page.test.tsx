import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CounselorsPage from "@/app/4dnn1n/counselors/page";
import { useAuth } from "@/context/AuthContext";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { getCounselors, updateCounselorState } from "@/app/4dnn1n/counselors/fetch";
import type { ApiCounselor } from "@/app/4dnn1n/counselors/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

// Mocked so we can assert the exact `ApiCounselor` row object handed to the
// toggle function returned by the hook, without exercising its real
// confirm/optimistic-update logic (already covered by the hook's own tests).
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/counselors/fetch", () => ({
  getCounselors: vi.fn(),
  updateCounselorState: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildCounselorColumns`)
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

function createMockCounselor(overrides: Partial<ApiCounselor> = {}): ApiCounselor {
  return {
    id: 5,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1000123",
    type_contra: "Término Fijo",
    state: 1,
    city_id: 3,
    user_id: 2,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockClientTable(data: ApiCounselor[]) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading: false });
  return { setData };
}

describe("CounselorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOptimisticToggle as any).mockReturnValue(vi.fn());
  });

  // ──── Step 1: gate de hasAccess para el botón "Crear Asesor" ────
  describe("gate de hasAccess para el botón 'Crear Asesor'", () => {
    it("user.type: 3 → no renderiza el botón (toolbarActions vacío)", () => {
      // Arrange
      mockAuth(3);
      mockClientTable([]);

      // Act
      render(<CounselorsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear asesor/i })).not.toBeInTheDocument();
    });

    it("user.type: 1 → botón 'Crear Asesor' visible con el href correcto", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<CounselorsPage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear asesor/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/counselors/new");
    });

    it("user.type: 2 → botón 'Crear Asesor' también visible con el href correcto", () => {
      // Arrange
      mockAuth(2);
      mockClientTable([]);

      // Act
      render(<CounselorsPage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear asesor/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/counselors/new");
    });
  });

  // ──── Step 1 (cont.): click en el botón de toggle de una fila ────
  describe("toggle de estado desde la columna de acciones", () => {
    it("al hacer click en el botón de estado, invoca la función de useOptimisticToggle con el ApiCounselor de la fila", () => {
      // Arrange
      mockAuth(1);
      const counselor = createMockCounselor({ id: 5 });
      mockClientTable([counselor]);
      const toggleFn = vi.fn();
      (useOptimisticToggle as any).mockReturnValue(toggleFn);

      // Act
      render(<CounselorsPage />);
      const row = screen.getByTestId("row-5");
      const toggleButton = row.querySelector("button") as HTMLButtonElement;
      toggleButton.click();

      // Assert
      expect(toggleFn).toHaveBeenCalledWith(counselor);
    });
  });
});
