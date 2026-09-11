import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useClientTable } from "@/hooks/useClientTable";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({
  getApiErrorMessage: vi.fn(),
}));

type Row = { id: number };

describe("useClientTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("carga los datos retornados por fetchFn y termina con loading en false", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }] as Row[]);

    // Act
    const { result } = renderHook(() => useClientTable(fetchFn));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("invoca alert.error con el mensaje de getApiErrorMessage cuando fetchFn falla", async () => {
    // Arrange
    const error = new Error("network down");
    const fetchFn = vi.fn().mockRejectedValue(error);
    vi.mocked(getApiErrorMessage).mockReturnValue("mensaje traducido");

    // Act
    const { result } = renderHook(() => useClientTable(fetchFn));

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(alert.error).toHaveBeenCalledWith("Error al cargar datos", "mensaje traducido");
    expect(result.current.data).toEqual([]);
  });

  it("permite actualizar data manualmente mediante setData", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue([] as Row[]);
    const { result } = renderHook(() => useClientTable(fetchFn));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    act(() => {
      result.current.setData([{ id: 9 }]);
    });

    // Assert
    expect(result.current.data).toEqual([{ id: 9 }]);
  });

  it("no actualiza data ni loading si el componente se desmonta antes de que fetchFn resuelva", async () => {
    // Arrange
    vi.useFakeTimers();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = vi.fn(
      () =>
        new Promise<Row[]>((resolve) => {
          setTimeout(() => resolve([{ id: 1 }]), 1000);
        }),
    );

    const { result, unmount } = renderHook(() => useClientTable(fetchFn));

    // Act
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Assert
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    // The last snapshot of result.current before unmount must remain untouched.
    expect(result.current.data).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
