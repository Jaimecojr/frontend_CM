import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useServerTable } from "@/hooks/useServerTable";

type Row = { id: number };

function createFetchFn() {
  return vi.fn().mockResolvedValue({
    data: [{ id: 1 }] as Row[],
    meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
  });
}

describe("useServerTable", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispara fetchFn una vez al montar con los parámetros por defecto", async () => {
    const fetchFn = createFetchFn();

    const { result } = renderHook(() => useServerTable(fetchFn));

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    expect(fetchFn).toHaveBeenCalledWith({ stade: "1", search: "", page: 1, per_page: 20 });

    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
    expect(result.current.meta.total).toBe(1);
  });

  it("onPageChange dispara un nuevo fetch con la página actualizada", async () => {
    const fetchFn = createFetchFn();
    const { result } = renderHook(() => useServerTable(fetchFn));

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.tableProps.onPageChange(2);
    });

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));
    expect(fetchFn).toHaveBeenLastCalledWith({ stade: "1", search: "", page: 2, per_page: 20 });
  });

  it("onSearchChange propaga el término de búsqueda tras el debounce y reinicia la página", async () => {
    const fetchFn = createFetchFn();
    vi.useFakeTimers();

    const { result } = renderHook(() => useServerTable(fetchFn, { debounceMs: 100 }));

    // Lets the initial load (mount effect) resolve its promise.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // First move the page to confirm that searching resets it back to 1.
    act(() => {
      result.current.tableProps.onPageChange(2);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.tableProps.onSearchChange("foo");
    });

    // Before the debounce window closes, there should be no new fetch.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(fetchFn).toHaveBeenLastCalledWith({ stade: "1", search: "foo", page: 1, per_page: 20 });
  });

  it("onStateFilterChange propaga el filtro de estado y reinicia la página", async () => {
    const fetchFn = createFetchFn();
    const { result } = renderHook(() => useServerTable(fetchFn));

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.tableProps.onPageChange(2);
    });
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));

    act(() => {
      result.current.tableProps.onStateFilterChange("2");
    });

    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(3));
    expect(fetchFn).toHaveBeenLastCalledWith({ stade: "2", search: "", page: 1, per_page: 20 });
  });
});
