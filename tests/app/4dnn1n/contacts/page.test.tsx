import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactsPage from "@/app/4dnn1n/contacts/page";
import { useServerTable } from "@/hooks/useServerTable";
import { deleteContact } from "@/app/4dnn1n/contacts/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { ApiContact } from "@/app/4dnn1n/contacts/fetch";

// `useServerTable` already has dedicated coverage — it is mocked here to return
// direct control values so this test focuses on what actually belongs to the
// page: the exact call shape used and the `onDelete` handler's optimistic
// update plus its error-path reversion.
vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({ getApiErrorMessage: vi.fn(() => "Mapped API error") }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/contacts/fetch", () => ({
  getContacts: vi.fn(),
  deleteContact: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildContactColumns`)
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

function createMockContact(overrides: Partial<ApiContact> = {}): ApiContact {
  return {
    id: 1,
    name: "Juan",
    email: "juan@example.com",
    phone: "3101234567",
    city_id: 1,
    city: { id: 1, name: "Bogotá" },
    subject: "Consulta",
    comment: "Un mensaje de prueba.",
    created_at: "2026-03-05T10:00:00Z",
    updated_at: "2026-03-05T10:00:00Z",
    ...overrides,
  };
}

function mockServerTable(data: ApiContact[]) {
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

async function clickDelete(contactId: number) {
  const row = screen.getByTestId(`row-${contactId}`);
  const { getByRole } = within(row);
  await userEvent.click(getByRole("button", { name: /eliminar mensaje/i }));
}

describe("ContactsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("invoca useServerTable(getContacts) sin un segundo argumento de opciones", () => {
    // Arrange
    mockServerTable([]);

    // Act
    render(<ContactsPage />);

    // Assert: unlike `membership-forms/page.tsx` (which passes
    // `{ defaultStade: "all" }`), this page relies on the hook's own default.
    expect(useServerTable).toHaveBeenCalledTimes(1);
    expect(useServerTable).toHaveBeenCalledWith(expect.any(Function));
    const call = (useServerTable as any).mock.calls[0];
    expect(call.length).toBe(1);
  });

  describe("onDelete: actualización optimista y reversión en error", () => {
    it("ejecuta setData/setMeta de forma síncrona dentro de onConfirm, antes de que deleteContact resuelva", async () => {
      // Arrange
      const contact = createMockContact({ id: 7 });
      const { setData, setMeta } = mockServerTable([contact]);
      let resolveDelete!: () => void;
      (deleteContact as any).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        const confirmPromise = onConfirm();
        // At this point `onConfirm` has only run up to its first `await` — the
        // deleteContact promise is still pending, yet the optimistic
        // setData/setMeta calls must already have happened synchronously.
        expect(setData).toHaveBeenCalledTimes(1);
        expect(setMeta).toHaveBeenCalledTimes(1);
        expect(deleteContact).toHaveBeenCalledWith(7);
        resolveDelete();
        await confirmPromise;
        return true;
      });

      // Act
      render(<ContactsPage />);
      await clickDelete(7);

      // Assert
      await waitFor(() => expect(alert.success).toHaveBeenCalled());

      const dataUpdater = (setData as any).mock.calls[0][0];
      expect(dataUpdater([contact])).toEqual([]);

      const metaUpdater = (setMeta as any).mock.calls[0][0];
      expect(metaUpdater({ current_page: 1, last_page: 1, per_page: 20, total: 5 })).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 4,
      });
    });

    it("muestra alert.success con el texto esperado una vez deleteContact resuelve", async () => {
      // Arrange
      const contact = createMockContact({ id: 3 });
      mockServerTable([contact]);
      (deleteContact as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        await onConfirm();
        return true;
      });

      // Act
      render(<ContactsPage />);
      await clickDelete(3);

      // Assert
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Eliminado", "Mensaje eliminado correctamente."),
      );
    });

    it("reagrega el mensaje eliminado al final de la lista y muestra alert.error cuando deleteContact rechaza", async () => {
      // Arrange
      const existing = createMockContact({ id: 1, name: "Existing" });
      const contact = createMockContact({ id: 9, name: "Ana" });
      const { setData } = mockServerTable([existing, contact]);
      const apiError = { data: { message: "No se pudo eliminar" } };
      (deleteContact as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        // `onConfirm` rejects because `deleteContact` rejects; the real
        // `alert.confirm` implementation stores that error and rethrows it once
        // the modal closes, which this mock reproduces directly.
        await onConfirm();
        return true;
      });

      // Act
      render(<ContactsPage />);
      await clickDelete(9);

      // Assert
      await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", "Mapped API error"));
      expect(getApiErrorMessage).toHaveBeenCalledWith(apiError);

      // The reversion setData call is the second one (first is the optimistic
      // removal); it appends the deleted item to the end, not its original slot.
      const revertUpdater = (setData as any).mock.calls[1][0];
      expect(revertUpdater([existing])).toEqual([existing, contact]);
      expect(alert.success).not.toHaveBeenCalled();
    });

    it("no llama a deleteContact ni a setData/setMeta cuando se cancela la confirmación", async () => {
      // Arrange
      const contact = createMockContact({ id: 4 });
      const { setData, setMeta } = mockServerTable([contact]);
      (alert.confirm as any).mockResolvedValue(false);

      // Act
      render(<ContactsPage />);
      await clickDelete(4);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(deleteContact).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(setMeta).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(alert.error).not.toHaveBeenCalled();
    });
  });
});
