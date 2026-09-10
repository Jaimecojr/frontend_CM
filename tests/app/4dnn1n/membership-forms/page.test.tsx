import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MembershipFormsPage from "@/app/4dnn1n/membership-forms/page";
import { useServerTable } from "@/hooks/useServerTable";
import { deleteMembershipForm } from "@/app/4dnn1n/membership-forms/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { ApiMembershipForm } from "@/app/4dnn1n/membership-forms/fetch";

// `useServerTable` already has dedicated coverage — it is mocked here to return
// direct control values so this test focuses on what actually belongs to the
// page: the `onDelete` handler's optimistic update and its error-path reversion.
vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({ getApiErrorMessage: vi.fn(() => "Mapped API error") }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/membership-forms/fetch", () => ({
  getMembershipForms: vi.fn(),
  deleteMembershipForm: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildMembershipFormColumns`)
// for each row — that's the only way to reach `onDelete`, since it is wired as a
// closure over the page's own state rather than exposed as a page prop.
vi.mock("@/components/data-table/DataTable", () => ({
  DataTable: (props: any) => (
    <div data-testid="data-table">
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

function createMockMembershipForm(overrides: Partial<ApiMembershipForm> = {}): ApiMembershipForm {
  return {
    id: 1,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    phone: "3101234567",
    email: "juan@example.com",
    address: "Calle 1 #1-1",
    city_id: 1,
    city: { id: 1, name: "Bogotá" },
    date: "2026-03-05",
    seller: "Carlos",
    state: 0,
    ...overrides,
  };
}

function mockServerTable(data: ApiMembershipForm[]) {
  const setData = vi.fn();
  const setMeta = vi.fn();
  (useServerTable as any).mockReturnValue({
    data,
    setData,
    setMeta,
    tableProps: { data, loading: false },
    isInitialLoad: false,
  });
  return { setData, setMeta };
}

async function clickDelete(formId: number) {
  const row = screen.getByTestId(`row-${formId}`);
  const { getByRole } = within(row);
  await userEvent.click(getByRole("button", { name: /eliminar solicitud/i }));
}

describe("MembershipFormsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onDelete: actualización optimista y reversión en error", () => {
    it("ejecuta setData/setMeta de forma síncrona dentro de onConfirm, antes de que deleteMembershipForm resuelva", async () => {
      // Arrange
      const form = createMockMembershipForm({ id: 7 });
      const { setData, setMeta } = mockServerTable([form]);
      let resolveDelete!: () => void;
      (deleteMembershipForm as any).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        const confirmPromise = onConfirm();
        // At this point `onConfirm` has only run up to its first `await` — the
        // deleteMembershipForm promise is still pending, yet the optimistic
        // setData/setMeta calls must already have happened synchronously.
        expect(setData).toHaveBeenCalledTimes(1);
        expect(setMeta).toHaveBeenCalledTimes(1);
        expect(deleteMembershipForm).toHaveBeenCalledWith(7);
        resolveDelete();
        await confirmPromise;
        return true;
      });

      // Act
      render(<MembershipFormsPage />);
      await clickDelete(7);

      // Assert
      await waitFor(() => expect(alert.success).toHaveBeenCalled());

      const dataUpdater = (setData as any).mock.calls[0][0];
      expect(dataUpdater([form])).toEqual([]);

      const metaUpdater = (setMeta as any).mock.calls[0][0];
      expect(metaUpdater({ current_page: 1, last_page: 1, per_page: 20, total: 5 })).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 4,
      });
    });

    it("muestra alert.success con el texto esperado una vez deleteMembershipForm resuelve", async () => {
      // Arrange
      const form = createMockMembershipForm({ id: 3 });
      mockServerTable([form]);
      (deleteMembershipForm as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        await onConfirm();
        return true;
      });

      // Act
      render(<MembershipFormsPage />);
      await clickDelete(3);

      // Assert
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Eliminado", "Solicitud eliminada correctamente."),
      );
    });

    it("reagrega la solicitud eliminada al final de la lista y muestra alert.error cuando deleteMembershipForm rechaza", async () => {
      // Arrange
      const existing = createMockMembershipForm({ id: 1, name: "Existing" });
      const form = createMockMembershipForm({ id: 9, name: "Ana" });
      const { setData } = mockServerTable([existing, form]);
      const apiError = { data: { message: "No se pudo eliminar" } };
      (deleteMembershipForm as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        // `onConfirm` rejects because `deleteMembershipForm` rejects; the real
        // `alert.confirm` implementation stores that error and rethrows it once
        // the modal closes, which this mock reproduces directly.
        await onConfirm();
        return true;
      });

      // Act
      render(<MembershipFormsPage />);
      await clickDelete(9);

      // Assert
      await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", "Mapped API error"));
      expect(getApiErrorMessage).toHaveBeenCalledWith(apiError);

      // The reversion setData call is the second one (first is the optimistic
      // removal); it appends the deleted item to the end, not its original slot.
      const revertUpdater = (setData as any).mock.calls[1][0];
      expect(revertUpdater([existing])).toEqual([existing, form]);
      expect(alert.success).not.toHaveBeenCalled();
    });

    it("no llama a deleteMembershipForm ni a setData/setMeta cuando se cancela la confirmación", async () => {
      // Arrange
      const form = createMockMembershipForm({ id: 4 });
      const { setData, setMeta } = mockServerTable([form]);
      (alert.confirm as any).mockResolvedValue(false);

      // Act
      render(<MembershipFormsPage />);
      await clickDelete(4);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(deleteMembershipForm).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(setMeta).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(alert.error).not.toHaveBeenCalled();
    });
  });
});
