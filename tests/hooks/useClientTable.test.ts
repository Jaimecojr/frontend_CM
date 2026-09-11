import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
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
  beforeEach(() => {
    // Call history for the `@/lib/alert` and `@/lib/getApiErrorMessage` mocks
    // otherwise leaks across tests (they're plain vi.fn()s from a vi.mock
    // factory, not spies, so restoreAllMocks alone does not clear them).
    vi.clearAllMocks();
  });

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

  it("no invoca alert.error cuando el componente se desmonta antes de que fetchFn rechace", async () => {
    // Arrange
    // A React state setter called after unmount is silently dropped by React itself
    // (it never applies to the unmounted fiber), so asserting on `result.current`
    // here would pass even if the `cancelled` guard were deleted from the hook —
    // it wouldn't actually exercise the guard. `alert.error` is a plain mock with
    // no such special-cased unmount behavior: it is called only if the `if
    // (!cancelled)` check inside the `.catch()` handler lets it through. That
    // makes it an effect we can use to prove the guard itself is what prevents it.
    vi.useFakeTimers();
    const error = new Error("network down");
    const fetchFn = vi.fn(
      () =>
        new Promise<Row[]>((_resolve, reject) => {
          setTimeout(() => reject(error), 1000);
        }),
    );
    vi.mocked(getApiErrorMessage).mockReturnValue("mensaje traducido");

    const { unmount } = renderHook(() => useClientTable(fetchFn));

    // Act: unmount (which flips `cancelled` to true via the effect cleanup)
    // before the rejection fires, then let the pending timer run out.
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Assert
    expect(alert.error).not.toHaveBeenCalled();
  });
});
