import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReportsTable } from "@/app/4dnn1n/reports/_hooks/useReportsTable";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/sales",
  useSearchParams: () => mockSearchParams,
}));

describe("useReportsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("llama fetchFn con page=1 y per_page=25 por defecto", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    renderHook(() => useReportsTable(fetchFn, { filterKeys: ["from", "to"] }));
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(fetchFn).toHaveBeenCalledWith({ page: 1, per_page: "25" });
  });

  it("lee filtros iniciales desde la URL", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&franchise_id=3");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });

    // Act
    renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from", "franchise_id"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(fetchFn).toHaveBeenCalledWith({
      page: 1,
      per_page: "25",
      from: "2026-01-01",
      franchise_id: "3",
    });
  });

  it("setFilter actualiza la URL y resetea a page=1", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("page=3");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setFilter("from", "2026-02-01"));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/sales?page=1&from=2026-02-01",
      { scroll: false },
    );
  });

  it("setFilter con valor vacío elimina la clave de la URL en vez de dejarla vacía", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-31");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from", "to"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setFilter("from", undefined));

    // Assert
    const [url] = mockReplace.mock.calls[mockReplace.mock.calls.length - 1];
    expect(url).not.toContain("from=");
    expect(url).toContain("to=2026-01-31");
  });

  it("setPage NO resetea la página (a diferencia de setFilter)", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 3, per_page: 25, total: 60 },
    });
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: [] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Act
    act(() => result.current.setPage(2));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/sales?page=2",
      { scroll: false },
    );
  });

  it("extra captura los campos de la respuesta más allá de data/meta, sin una segunda llamada", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
      totals: { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 },
    });

    // Act
    const { result } = renderHook(() =>
      useReportsTable<unknown, { totals: unknown }>(fetchFn, { filterKeys: [] }),
    );
    await waitFor(() => expect(result.current.extra).not.toBeNull());

    // Assert
    expect(result.current.extra).toEqual({
      totals: { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("exportParams refleja los filtros actuales, sin page ni per_page", async () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&page=2&per_page=50");
    const fetchFn = vi.fn().mockResolvedValue({
      data: [],
      meta: { current_page: 2, last_page: 3, per_page: 50, total: 120 },
    });

    // Act
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: ["from"] }),
    );
    await waitFor(() => expect(fetchFn).toHaveBeenCalled());

    // Assert
    expect(result.current.exportParams).toEqual({ from: "2026-01-01" });
  });

  it("expone error cuando fetchFn rechaza, y lo limpia en el siguiente fetch exitoso", async () => {
    // Arrange
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Fallo de red"))
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
      });
    const { result, rerender } = renderHook(() => useReportsTable(fetchFn, { filterKeys: [] }));

    // Act & Assert — the failure surfaces, data stays empty
    await waitFor(() => expect(result.current.error).toBe("Fallo de red"));
    expect(result.current.data).toEqual([]);

    // Act — a new fetch (the URL changing, e.g. via paging) must clear the
    // previous error. `mockSearchParams` is mutated directly (rather than
    // through `setPage`) because the mocked `useSearchParams()` isn't wired
    // to `router.replace` — it only reflects whatever this test assigns.
    mockSearchParams = new URLSearchParams("page=2");
    rerender();
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2));

    // Assert
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.data).toEqual([{ id: 1 }]);
  });

  it("mantiene los datos del fetch anterior cuando un fetch posterior falla", async () => {
    // Arrange
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        meta: { current_page: 1, last_page: 2, per_page: 25, total: 2 },
      })
      .mockRejectedValueOnce(new Error("Fallo de red"));
    const { result, rerender } = renderHook(() => useReportsTable(fetchFn, { filterKeys: [] }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));

    // Act
    mockSearchParams = new URLSearchParams("page=2");
    rerender();

    // Assert
    await waitFor(() => expect(result.current.error).toBe("Fallo de red"));
    expect(result.current.data).toEqual([{ id: 1 }]);
  });

  it("no llama fetchFn cuando enabled es false, y loading queda en false", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    const { result } = renderHook(() =>
      useReportsTable(fetchFn, { filterKeys: [], enabled: false }),
    );

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.data).toEqual([]);
  });

  it("dispara el fetch en cuanto enabled pasa de false a true", async () => {
    // Arrange
    const fetchFn = vi.fn().mockResolvedValue({
      data: [{ id: 1 }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useReportsTable(fetchFn, { filterKeys: [], enabled }),
      { initialProps: { enabled: false } },
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchFn).not.toHaveBeenCalled();

    // Act
    rerender({ enabled: true });

    // Assert
    await waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
  });
});
