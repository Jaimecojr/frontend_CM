import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlliesPage from "@/app/4dnn1n/content/allies/page";
import { useClientTable } from "@/hooks/useClientTable";
import { deleteAlly } from "@/app/4dnn1n/content/allies/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { ApiAlly } from "@/app/4dnn1n/content/allies/fetch";

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({ getApiErrorMessage: vi.fn(() => "Mapped API error") }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/content/allies/fetch", () => ({
  getAllies: vi.fn(),
  deleteAlly: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below surfaces
// `toolbarActions` directly for the ally-limit assertions, and invokes the
// "actions" column's `cell()` (built by the already-tested `buildAllyColumns`)
// for each row -- that is the only way to reach `onDelete`, since it is wired
// as a closure over the page's own state rather than exposed as a page prop.
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

function createMockAlly(overrides: Partial<ApiAlly> = {}): ApiAlly {
  return {
    id: 1,
    image: "allies/banner.jpg",
    image_filename: "banner.jpg",
    url: "https://empresa.com",
    position: 1,
    ...overrides,
  };
}

function mockClientTable(data: ApiAlly[]) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading: false });
  return { setData };
}

async function clickDelete(allyId: number) {
  const row = screen.getByTestId(`row-${allyId}`);
  const { getByRole } = within(row);
  await userEvent.click(getByRole("button", { name: /eliminar aliado/i }));
}

describe("AlliesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("límite de 6 aliados (atLimit)", () => {
    it("con 5 aliados, el botón 'Agregar aliado' está habilitado como link a /new", () => {
      // Arrange
      const data = Array.from({ length: 5 }, (_, i) => createMockAlly({ id: i + 1 }));
      mockClientTable(data);

      // Act
      render(<AlliesPage />);

      // Assert
      const link = screen.getByRole("link", { name: /agregar aliado/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/content/allies/new");
      expect(within(link).getByRole("button")).not.toBeDisabled();
    });

    it("con 6 aliados, el botón 'Agregar aliado' aparece deshabilitado y ya no es un link", () => {
      // Arrange
      const data = Array.from({ length: 6 }, (_, i) => createMockAlly({ id: i + 1 }));
      mockClientTable(data);

      // Act
      render(<AlliesPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /agregar aliado/i })).not.toBeInTheDocument();
      const button = screen.getByRole("button", { name: /agregar aliado/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Límite de 6 aliados alcanzado");
    });
  });

  describe("onDelete: actualización optimista y reversión en error", () => {
    it("ejecuta setData de forma síncrona dentro de onConfirm, antes de que deleteAlly resuelva", async () => {
      // Arrange
      const ally = createMockAlly({ id: 7 });
      const { setData } = mockClientTable([ally]);
      let resolveDelete!: () => void;
      (deleteAlly as any).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        const confirmPromise = onConfirm();
        // At this point `onConfirm` has only run up to its first `await` — the
        // deleteAlly promise is still pending, yet the optimistic setData call
        // must already have happened synchronously.
        expect(setData).toHaveBeenCalledTimes(1);
        expect(deleteAlly).toHaveBeenCalledWith(7);
        resolveDelete();
        await confirmPromise;
        return true;
      });

      // Act
      render(<AlliesPage />);
      await clickDelete(7);

      // Assert
      await waitFor(() => expect(alert.success).toHaveBeenCalled());

      const dataUpdater = (setData as any).mock.calls[0][0];
      expect(dataUpdater([ally])).toEqual([]);
    });

    it("muestra alert.success con el texto esperado una vez deleteAlly resuelve", async () => {
      // Arrange
      const ally = createMockAlly({ id: 3 });
      mockClientTable([ally]);
      (deleteAlly as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        await onConfirm();
        return true;
      });

      // Act
      render(<AlliesPage />);
      await clickDelete(3);

      // Assert
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Eliminado", "Aliado eliminado correctamente."),
      );
    });

    it("reagrega el aliado eliminado al final de la lista y muestra alert.error cuando deleteAlly rechaza", async () => {
      // Arrange
      const existing = createMockAlly({ id: 1 });
      const ally = createMockAlly({ id: 9 });
      const { setData } = mockClientTable([existing, ally]);
      const apiError = { data: { message: "No se pudo eliminar" } };
      (deleteAlly as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        // `onConfirm` rejects because `deleteAlly` rejects; the real
        // `alert.confirm` implementation stores that error and rethrows it once
        // the modal closes, which this mock reproduces directly.
        await onConfirm();
        return true;
      });

      // Act
      render(<AlliesPage />);
      await clickDelete(9);

      // Assert
      await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", "Mapped API error"));
      expect(getApiErrorMessage).toHaveBeenCalledWith(apiError);

      // The reversion setData call is the second one (first is the optimistic
      // removal); it appends the deleted item to the end, not its original slot.
      const revertUpdater = (setData as any).mock.calls[1][0];
      expect(revertUpdater([existing])).toEqual([existing, ally]);
      expect(alert.success).not.toHaveBeenCalled();
    });

    it("no llama a deleteAlly ni a setData cuando se cancela la confirmación", async () => {
      // Arrange
      const ally = createMockAlly({ id: 4 });
      const { setData } = mockClientTable([ally]);
      (alert.confirm as any).mockResolvedValue(false);

      // Act
      render(<AlliesPage />);
      await clickDelete(4);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(deleteAlly).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(alert.error).not.toHaveBeenCalled();
    });
  });
});
