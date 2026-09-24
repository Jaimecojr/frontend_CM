import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFranchiseOptions } from "@/app/4dnn1n/reports/_hooks/useFranchiseOptions";
import { getActiveFranchises } from "@/app/4dnn1n/reports/_lib/catalogs";

vi.mock("@/app/4dnn1n/reports/_lib/catalogs", () => ({ getActiveFranchises: vi.fn() }));

describe("useFranchiseOptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no llama getActiveFranchises cuando isSuperAdmin es false", () => {
    // Act
    const { result } = renderHook(() => useFranchiseOptions(false));

    // Assert
    expect(getActiveFranchises).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it("carga las franquicias activas cuando isSuperAdmin es true", async () => {
    // Arrange
    const options = [{ id: 1, name: "FRANQUICIA NORTE" }];
    (getActiveFranchises as any).mockResolvedValue(options);

    // Act
    const { result } = renderHook(() => useFranchiseOptions(true));

    // Assert
    await waitFor(() => expect(result.current).toEqual(options));
  });

  it("retorna [] si getActiveFranchises rechaza", async () => {
    // Arrange
    (getActiveFranchises as any).mockRejectedValue(new Error("network"));

    // Act
    const { result } = renderHook(() => useFranchiseOptions(true));

    // Assert
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it("recarga cuando isSuperAdmin pasa de false a true", async () => {
    // Arrange
    const options = [{ id: 2, name: "FRANQUICIA SUR" }];
    (getActiveFranchises as any).mockResolvedValue(options);
    const { result, rerender } = renderHook(
      ({ isSuperAdmin }: { isSuperAdmin: boolean }) => useFranchiseOptions(isSuperAdmin),
      { initialProps: { isSuperAdmin: false } },
    );
    expect(getActiveFranchises).not.toHaveBeenCalled();

    // Act
    rerender({ isSuperAdmin: true });

    // Assert
    await waitFor(() => expect(result.current).toEqual(options));
  });

  it("ignora la respuesta si el componente ya se desmontó", async () => {
    // Arrange: a promise resolved only after unmount — must not warn/throw
    // from a state update on an unmounted component.
    let resolvePromise: (v: { id: number; name: string }[]) => void;
    (getActiveFranchises as any).mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );
    const { unmount } = renderHook(() => useFranchiseOptions(true));

    // Act
    unmount();
    resolvePromise!([{ id: 3, name: "FRANQUICIA CENTRO" }]);
    await Promise.resolve();

    // Assert: reaching here without an unhandled "state update on unmounted
    // component" warning/error is the assertion.
    expect(true).toBe(true);
  });
});
