import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile, MOBILE_BREAKPOINT } from "@/hooks/use-mobile";

function mockMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return listeners;
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna true cuando window.innerWidth está por debajo del breakpoint", () => {
    // Arrange
    mockMatchMedia(true);
    setInnerWidth(MOBILE_BREAKPOINT - 1);

    // Act
    const { result } = renderHook(() => useIsMobile());

    // Assert
    expect(result.current).toBe(true);
  });

  it("retorna false cuando window.innerWidth es igual o mayor al breakpoint", () => {
    // Arrange
    mockMatchMedia(false);
    setInnerWidth(MOBILE_BREAKPOINT);

    // Act
    const { result } = renderHook(() => useIsMobile());

    // Assert
    expect(result.current).toBe(false);
  });

  it("re-renderiza con el nuevo valor cuando se dispara el listener de change", () => {
    // Arrange
    const listeners = mockMatchMedia(false);
    setInnerWidth(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Act
    setInnerWidth(MOBILE_BREAKPOINT - 1);
    act(() => {
      listeners.forEach((cb) => cb());
    });

    // Assert
    expect(result.current).toBe(true);
  });
});
