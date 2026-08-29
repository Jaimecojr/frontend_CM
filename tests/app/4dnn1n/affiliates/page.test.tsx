import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AffiliatesPage from "@/app/4dnn1n/affiliates/page";
import { useAuth } from "@/context/AuthContext";
import { useServerTable } from "@/hooks/useServerTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { sendCarnet } from "@/app/4dnn1n/affiliates/fetch";
import { alert } from "@/lib/alert";
import type { ApiAffiliate } from "@/app/4dnn1n/affiliates/types";

// `useServerTable` and `useOptimisticToggle` already have dedicated coverage —
// they are mocked here to return direct control values so this test focuses
// on what actually belongs to the page: the hasAccess/canToggle gate,
// onSendCarnet, and the NoteModal wiring.
vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn(() => vi.fn()) }));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  getAffiliates: vi.fn(),
  updateAffiliateState: vi.fn(),
  sendCarnet: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildAffiliateColumns`)
// for each row — that's the only way to reach `onSendCarnet`/`onAddNote` as they
// are wired as closures over the page's own state, not exposed as page props.
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

function createMockAffiliate(overrides: Partial<ApiAffiliate> = {}): ApiAffiliate {
  return {
    id: 1,
    counselor_id: 1,
    contract_code: "CNT001",
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    phone: null,
    movil: "3001234567",
    address: "Calle 1",
    city_id: 1,
    email: "juan@example.com",
    validity: "2025-01-01",
    agreement_id: 1,
    company: "Company",
    photo: null,
    photo_rename: null,
    validity_end: "2026-01-01",
    payment_date: "2025-01-01",
    value: 100000,
    balance: 0,
    commission: 5000,
    payment_commission: "si",
    stade: 1,
    carnet: "no",
    state: 1,
    user_id: 1,
    city: { id: 1, name: "Bogotá" },
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({
    user: { id: 1, name: "Ana", email: "ana@test.com", user: "ana", type },
    loading: false,
    isLoggingOut: false,
  });
}

function mockServerTable(data: ApiAffiliate[]) {
  const setData = vi.fn();
  const setMeta = vi.fn();
  (useServerTable as any).mockReturnValue({
    data,
    setData,
    setMeta,
    stadeFilter: "1",
    tableProps: { data, loading: false },
    isInitialLoad: false,
  });
  return { setData, setMeta };
}

describe("AffiliatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOptimisticToggle as any).mockReturnValue(vi.fn());
  });

  // ──── Step 2: Permission gate for "Crear Afiliado" ────
  describe("gate de permisos", () => {
    it("no renderiza el botón 'Crear Afiliado' cuando el usuario no tiene acceso (type: 3)", () => {
      // Arrange
      mockAuth(3);
      mockServerTable([]);

      // Act
      render(<AffiliatesPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear afiliado/i })).not.toBeInTheDocument();
    });

    it("renderiza el botón 'Crear Afiliado' con el href correcto cuando el usuario tiene acceso (type: 1)", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);

      // Act
      render(<AffiliatesPage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear afiliado/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/affiliates/new");
    });
  });

  // ──── Step 3: onSendCarnet flow ────
  describe("flujo de onSendCarnet", () => {
    it("confirma, envía el carnet, actualiza el afiliado a carnet='si' y muestra alert.success", async () => {
      // Arrange
      const affiliate = createMockAffiliate({ id: 7, carnet: "no", movil: "3001234567" });
      mockAuth(1);
      const { setData } = mockServerTable([affiliate]);
      (sendCarnet as any).mockResolvedValue({ message: "ok" });
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<AffiliatesPage />);

      // Act
      const carnetButton = screen.getByRole("button", { name: /enviar carnet por whatsapp/i });
      await userEvent.click(carnetButton);

      // Assert
      await waitFor(() => expect(sendCarnet).toHaveBeenCalledWith(7));
      await waitFor(() => expect(alert.success).toHaveBeenCalled());
      expect(setData).toHaveBeenCalled();
      const updater = (setData as any).mock.calls[0][0];
      expect(updater([affiliate])).toEqual([{ ...affiliate, carnet: "si" }]);
    });

    it("muestra alert.error con el mensaje de la API cuando sendCarnet rechaza", async () => {
      // Arrange
      const affiliate = createMockAffiliate({ id: 8, carnet: "no", movil: "3001234567" });
      mockAuth(1);
      mockServerTable([affiliate]);
      const apiError = { data: { message: "No se pudo enviar el carnet" } };
      (sendCarnet as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<AffiliatesPage />);

      // Act
      const carnetButton = screen.getByRole("button", { name: /enviar carnet por whatsapp/i });
      await userEvent.click(carnetButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Envío fallido", "No se pudo enviar el carnet"),
      );
    });

    it("no envía el carnet ni actualiza datos cuando el usuario cancela la confirmación", async () => {
      // Arrange
      const affiliate = createMockAffiliate({ id: 9, carnet: "no", movil: "3001234567" });
      mockAuth(1);
      const { setData } = mockServerTable([affiliate]);
      (alert.confirm as any).mockResolvedValue(false);

      render(<AffiliatesPage />);

      // Act
      const carnetButton = screen.getByRole("button", { name: /enviar carnet por whatsapp/i });
      await userEvent.click(carnetButton);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(sendCarnet).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
    });
  });

  // ──── Step 4: NoteModal wiring ────
  describe("wiring del NoteModal", () => {
    it("no renderiza el NoteModal cuando no hay noteTarget seleccionado", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([createMockAffiliate()]);

      // Act
      render(<AffiliatesPage />);

      // Assert
      expect(screen.queryByPlaceholderText(/escribe la observación/i)).not.toBeInTheDocument();

      // NOTE (finding, not a test case): the button that triggers `onAddNote`
      // (which would open the NoteModal) is commented out as dead code in
      // `src/app/4dnn1n/affiliates/_components/columns.tsx`, making the
      // NoteModal-open-via-onAddNote path unreachable through real UI
      // interaction — that's why it isn't covered by a test here.
    });
  });
});
