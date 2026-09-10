import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AgreementsPage from "@/app/4dnn1n/agreements/page";
import { useAuth } from "@/context/AuthContext";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { updateAgreementState } from "@/app/4dnn1n/agreements/fetch";
import type { ApiAgreement } from "@/app/4dnn1n/agreements/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

// Left WITHOUT a fixed `mockReturnValue` (unlike other pages' toggle mocks) so
// Step 2 can inspect `mock.calls[0][0].updateFn` — the page's own ref-based
// resolution logic passed into the hook, not the hook's internal behavior.
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/agreements/fetch", () => ({
  getAgreements: vi.fn(),
  updateAgreementState: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildAgreementColumns`)
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

function createMockAgreement(overrides: Partial<ApiAgreement> = {}): ApiAgreement {
  return {
    id: 5,
    name: "Convenio A",
    amount: 50000,
    state: 1,
    city_id: 3,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockClientTable(data: ApiAgreement[]) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading: false });
  return { setData };
}

describe("AgreementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: canView/canManage gates and the create button ────
  describe("gate de permisos para el botón 'Crear Convenio'", () => {
    it("user.type: 3 → no renderiza el botón (toolbarActions es null)", () => {
      // Arrange
      mockAuth(3);
      mockClientTable([]);

      // Act
      render(<AgreementsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear convenio/i })).not.toBeInTheDocument();
    });

    it("user.type: 2 → canView true / canManage false → sigue sin el botón de crear", () => {
      // Arrange
      mockAuth(2);
      mockClientTable([]);

      // Act
      render(<AgreementsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear convenio/i })).not.toBeInTheDocument();
    });

    it("user.type: 1 → botón 'Crear Convenio' visible con el href correcto", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<AgreementsPage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear convenio/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/agreements/new");
    });
  });

  // ──── Step 2: updateFn resolved by ref ────
  describe("updateFn pasado a useOptimisticToggle (resolución por ref)", () => {
    it("resuelve el convenio completo desde data por id y llama updateAgreementState con ese objeto", async () => {
      // Arrange
      mockAuth(1);
      const agreement = createMockAgreement({ id: 5 });
      mockClientTable([agreement]);
      (updateAgreementState as any).mockResolvedValue({ message: "ok" });

      // Act
      render(<AgreementsPage />);
      const updateFn = (useOptimisticToggle as any).mock.calls[0][0].updateFn;
      await updateFn(5, 0);

      // Assert
      expect(updateAgreementState).toHaveBeenCalledWith(5, agreement, 0);
    });

    it("id inexistente en data → rechaza con 'Convenio no encontrado en la lista actual' sin llamar updateAgreementState", async () => {
      // Arrange
      mockAuth(1);
      const agreement = createMockAgreement({ id: 5 });
      mockClientTable([agreement]);

      // Act
      render(<AgreementsPage />);
      const updateFn = (useOptimisticToggle as any).mock.calls[0][0].updateFn;

      // Assert
      await expect(updateFn(999, 0)).rejects.toThrow("Convenio no encontrado en la lista actual");
      expect(updateAgreementState).not.toHaveBeenCalled();
    });
  });
});
