import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUrlFilters } from "@/app/4dnn1n/reports/_hooks/useUrlFilters";

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/4dnn1n/reports/affiliates-summary",
  useSearchParams: () => mockSearchParams,
}));

describe("useUrlFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("lee los filtros iniciales desde la URL", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("city_id=5&franchise_id=2&unrelated=x");

    // Act
    const { result } = renderHook(() => useUrlFilters(["city_id", "franchise_id"]));

    // Assert — only the requested keys come through, "unrelated" is ignored
    expect(result.current.filters).toEqual({ city_id: "5", franchise_id: "2" });
  });

  it("setParams agrega una clave nueva a la URL", () => {
    // Arrange
    const { result } = renderHook(() => useUrlFilters(["from"]));

    // Act
    act(() => result.current.setParams({ from: "2026-01-01" }));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/affiliates-summary?from=2026-01-01",
      { scroll: false },
    );
  });

  it("setParams con valor vacio o undefined elimina la clave en vez de dejarla vacia", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("from=2026-01-01&to=2026-01-31");
    const { result } = renderHook(() => useUrlFilters(["from", "to"]));

    // Act
    act(() => result.current.setParams({ from: undefined }));

    // Assert
    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("from=");
    expect(url).toContain("to=2026-01-31");
  });

  it("aplica varias claves en un solo replace (ej. limpiar city_id al cambiar department_id)", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("department_id=1&city_id=9");
    const { result } = renderHook(() => useUrlFilters(["department_id", "city_id"]));

    // Act
    act(() => result.current.setParams({ department_id: "2", city_id: undefined }));

    // Assert — a single call carries both changes, never two separate navigations
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("department_id=2");
    expect(url).not.toContain("city_id=");
  });

  it("setParams con resetPage fuerza page=1", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("page=3&from=2026-01-01");
    const { result } = renderHook(() => useUrlFilters(["from"]));

    // Act
    act(() => result.current.setParams({ from: "2026-02-01" }, { resetPage: true }));

    // Assert
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("page=1");
  });

  it("no resetea page cuando resetPage no se pide", () => {
    // Arrange
    mockSearchParams = new URLSearchParams("page=3");
    const { result } = renderHook(() => useUrlFilters([]));

    // Act
    act(() => result.current.setParams({ page: "4" }));

    // Assert
    expect(mockReplace).toHaveBeenCalledWith(
      "/4dnn1n/reports/affiliates-summary?page=4",
      { scroll: false },
    );
  });
});
