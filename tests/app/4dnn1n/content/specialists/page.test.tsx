import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SpecialistsPage from "@/app/4dnn1n/content/specialists/page";
import { useClientTable } from "@/hooks/useClientTable";
import { deleteSpecialist } from "@/app/4dnn1n/content/specialists/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { ApiSpecialist } from "@/app/4dnn1n/content/specialists/fetch";

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({ getApiErrorMessage: vi.fn(() => "Mapped API error") }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/content/specialists/fetch", () => ({
  getSpecialists: vi.fn(),
  deleteSpecialist: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below surfaces
// `toolbarActions` directly for the specialist-limit assertions, and invokes
// the "actions" column's `cell()` (built by the already-tested
// `buildSpecialistColumns`) for each row -- that is the only way to reach
// `onDelete`, since it is wired as a closure over the page's own state rather
// than exposed as a page prop.
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

function createMockSpecialist(overrides: Partial<ApiSpecialist> = {}): ApiSpecialist {
  return {
    id: 1,
    name: "Dra. Ana Perez",
    specialty: "Cardiología",
    photo: "specialists/ana.jpg",
    photo_filename: "ana.jpg",
    position: 1,
    ...overrides,
  };
}

function mockClientTable(data: ApiSpecialist[]) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading: false });
  return { setData };
}

async function clickDelete(specialistId: number) {
  const row = screen.getByTestId(`row-${specialistId}`);
  const { getByRole } = within(row);
  await userEvent.click(getByRole("button", { name: /eliminar especialista/i }));
}

describe("SpecialistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("límite de 4 especialistas (atLimit)", () => {
    it("con 3 especialistas, el botón 'Agregar especialista' está habilitado como link a /new", () => {
      // Arrange
      const data = Array.from({ length: 3 }, (_, i) => createMockSpecialist({ id: i + 1 }));
      mockClientTable(data);

      // Act
      render(<SpecialistsPage />);

      // Assert
      const link = screen.getByRole("link", { name: /agregar especialista/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/content/specialists/new");
      expect(within(link).getByRole("button")).not.toBeDisabled();
    });

    it("con 4 especialistas, el botón 'Agregar especialista' aparece deshabilitado y ya no es un link", () => {
      // Arrange
      const data = Array.from({ length: 4 }, (_, i) => createMockSpecialist({ id: i + 1 }));
      mockClientTable(data);

      // Act
      render(<SpecialistsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /agregar especialista/i })).not.toBeInTheDocument();
      const button = screen.getByRole("button", { name: /agregar especialista/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("title", "Límite de 4 especialistas alcanzado");
    });
  });

  describe("onDelete: actualización optimista y reversión en error", () => {
    it("ejecuta setData de forma síncrona dentro de onConfirm, antes de que deleteSpecialist resuelva", async () => {
      // Arrange
      const specialist = createMockSpecialist({ id: 7 });
      const { setData } = mockClientTable([specialist]);
      let resolveDelete!: () => void;
      (deleteSpecialist as any).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        const confirmPromise = onConfirm();
        // At this point `onConfirm` has only run up to its first `await` — the
        // deleteSpecialist promise is still pending, yet the optimistic
        // setData call must already have happened synchronously.
        expect(setData).toHaveBeenCalledTimes(1);
        expect(deleteSpecialist).toHaveBeenCalledWith(7);
        resolveDelete();
        await confirmPromise;
        return true;
      });

      // Act
      render(<SpecialistsPage />);
      await clickDelete(7);

      // Assert
      await waitFor(() => expect(alert.success).toHaveBeenCalled());

      const dataUpdater = (setData as any).mock.calls[0][0];
      expect(dataUpdater([specialist])).toEqual([]);
    });

    it("muestra alert.success con el texto esperado una vez deleteSpecialist resuelve", async () => {
      // Arrange
      const specialist = createMockSpecialist({ id: 3 });
      mockClientTable([specialist]);
      (deleteSpecialist as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        await onConfirm();
        return true;
      });

      // Act
      render(<SpecialistsPage />);
      await clickDelete(3);

      // Assert
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith("Eliminado", "Especialista eliminado correctamente."),
      );
    });

    it("reagrega el especialista eliminado al final de la lista y muestra alert.error cuando deleteSpecialist rechaza", async () => {
      // Arrange
      const existing = createMockSpecialist({ id: 1 });
      const specialist = createMockSpecialist({ id: 9 });
      const { setData } = mockClientTable([existing, specialist]);
      const apiError = { data: { message: "No se pudo eliminar" } };
      (deleteSpecialist as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        // `onConfirm` rejects because `deleteSpecialist` rejects; the real
        // `alert.confirm` implementation stores that error and rethrows it once
        // the modal closes, which this mock reproduces directly.
        await onConfirm();
        return true;
      });

      // Act
      render(<SpecialistsPage />);
      await clickDelete(9);

      // Assert
      await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", "Mapped API error"));
      expect(getApiErrorMessage).toHaveBeenCalledWith(apiError);

      // The reversion setData call is the second one (first is the optimistic
      // removal); it appends the deleted item to the end, not its original slot.
      const revertUpdater = (setData as any).mock.calls[1][0];
      expect(revertUpdater([existing])).toEqual([existing, specialist]);
      expect(alert.success).not.toHaveBeenCalled();
    });

    it("no llama a deleteSpecialist ni a setData cuando se cancela la confirmación", async () => {
      // Arrange
      const specialist = createMockSpecialist({ id: 4 });
      const { setData } = mockClientTable([specialist]);
      (alert.confirm as any).mockResolvedValue(false);

      // Act
      render(<SpecialistsPage />);
      await clickDelete(4);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(deleteSpecialist).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
      expect(alert.error).not.toHaveBeenCalled();
    });
  });
});
