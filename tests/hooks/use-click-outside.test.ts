import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClickOutside } from "@/hooks/use-click-outside";

describe("useClickOutside", () => {
  let container: HTMLDivElement;
  let outside: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    outside = document.createElement("div");
    document.body.appendChild(outside);
  });

  afterEach(() => {
    container.remove();
    outside.remove();
  });

  it("invoca el callback cuando el mousedown ocurre fuera del elemento referenciado", () => {
    // Arrange
    const callback = vi.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(callback));
    // Simulate assigning the ref to a real DOM node inside the container.
    const target = document.createElement("div");
    container.appendChild(target);
    result.current.current = target;

    // Act
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    // Assert
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("no invoca el callback cuando el mousedown ocurre dentro del elemento referenciado", () => {
    // Arrange
    const callback = vi.fn();
    const { result } = renderHook(() => useClickOutside<HTMLDivElement>(callback));
    const target = document.createElement("div");
    const child = document.createElement("span");
    target.appendChild(child);
    container.appendChild(target);
    result.current.current = target;

    // Act
    child.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    // Assert
    expect(callback).not.toHaveBeenCalled();
  });

  it("remueve el listener al desmontar, por lo que un mousedown posterior no invoca el callback", () => {
    // Arrange
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useClickOutside<HTMLDivElement>(callback));
    const target = document.createElement("div");
    container.appendChild(target);
    result.current.current = target;

    callback.mockReset();
    unmount();

    // Act
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    // Assert
    expect(callback).not.toHaveBeenCalled();
  });
});
