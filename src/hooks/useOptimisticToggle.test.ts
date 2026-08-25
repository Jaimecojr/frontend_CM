import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOptimisticToggle } from "./useOptimisticToggle";
import { alert } from "@/lib/alert";

vi.mock("@/lib/alert", () => ({
  alert: {
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type Item = { id: number; stade: 1 | 2 };

function crearOpts(overrides: Partial<Parameters<typeof useOptimisticToggle<Item, "stade">>[0]> = {}) {
  return {
    field: "stade" as const,
    activeValue: 1 as const,
    inactiveValue: 2 as const,
    setData: vi.fn(),
    setMeta: vi.fn(),
    stadeFilter: "all",
    updateFn: vi.fn().mockResolvedValue(undefined),
    confirmTitle: () => "¿Confirmas?",
    confirmText: () => "texto",
    successMessage: () => "listo",
    ...overrides,
  };
}

describe("useOptimisticToggle", () => {
  it("actualiza el dato de forma optimista y llama updateFn con el valor invertido", async () => {
    const opts = crearOpts();
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(opts.updateFn).toHaveBeenCalledWith(1, 2);
    expect(opts.setData).toHaveBeenCalled();
  });

  it("revierte el dato optimista si updateFn falla", async () => {
    const error = new Error("falló la red");
    const opts = crearOpts({
      updateFn: vi.fn().mockRejectedValue(error),
    });
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(alert.error).toHaveBeenCalled();
    // Dos llamadas a setData: la optimista y la de revertir.
    expect(opts.setData).toHaveBeenCalledTimes(2);
  });

  it("quita el ítem de la lista y decrementa el total si hay un filtro de estado activo", async () => {
    const opts = crearOpts({ stadeFilter: "1" });
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    const { result } = renderHook(() => useOptimisticToggle<Item, "stade">(opts));
    await act(async () => {
      await result.current({ id: 1, stade: 1 });
    });

    expect(opts.setMeta).toHaveBeenCalled();
  });
});
