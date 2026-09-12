import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SidebarProvider,
  useSidebarContext,
} from "@/components/Layouts/sidebar/sidebar-context";
import { useIsMobile } from "@/hooks/use-mobile";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn() }));

/** Small consumer that surfaces the context's state and actions as clickable/readable DOM. */
function Consumer() {
  const {
    isOpen,
    toggleSidebar,
    isCollapsed,
    toggleCollapse,
    isMobile,
  } = useSidebarContext();

  return (
    <div>
      <span data-testid="is-open">{String(isOpen)}</span>
      <span data-testid="is-collapsed">{String(isCollapsed)}</span>
      <span data-testid="is-mobile">{String(isMobile)}</span>
      <button onClick={toggleSidebar}>toggle-sidebar</button>
      <button onClick={toggleCollapse}>toggle-collapse</button>
    </div>
  );
}

describe("SidebarProvider / useSidebarContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paso 1: desktop (useIsMobile === false)", () => {
    it("isOpen arranca en false y toggleCollapse invierte isCollapsed", () => {
      // Arrange
      vi.mocked(useIsMobile).mockReturnValue(false);
      render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      expect(screen.getByTestId("is-open")).toHaveTextContent("false");
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("false");

      // Act
      fireEvent.click(screen.getByText("toggle-collapse"));

      // Assert
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("true");
    });
  });

  describe("Paso 2: mobile (useIsMobile === true)", () => {
    it("toggleSidebar invierte isOpen, y volver a desktop resetea isOpen a false", () => {
      // Arrange
      vi.mocked(useIsMobile).mockReturnValue(true);
      const { rerender } = render(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );
      expect(screen.getByTestId("is-open")).toHaveTextContent("false");

      // Act: toggle sidebar open while still mobile
      fireEvent.click(screen.getByText("toggle-sidebar"));

      // Assert
      expect(screen.getByTestId("is-open")).toHaveTextContent("true");

      // Act: switch back to desktop
      vi.mocked(useIsMobile).mockReturnValue(false);
      rerender(
        <SidebarProvider>
          <Consumer />
        </SidebarProvider>,
      );

      // Assert: the overlay-closing effect resets isOpen
      expect(screen.getByTestId("is-open")).toHaveTextContent("false");
    });
  });

  describe("Paso 3: uso fuera de un SidebarProvider", () => {
    it("lanza el error 'useSidebarContext must be used within a SidebarProvider'", () => {
      // Arrange
      vi.mocked(useIsMobile).mockReturnValue(false);
      // Suppress the expected React error boundary console noise for this render.
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act & Assert
      expect(() => render(<Consumer />)).toThrow(
        "useSidebarContext must be used within a SidebarProvider",
      );

      consoleError.mockRestore();
    });
  });

  describe("Paso 4: defaultCollapsed", () => {
    it("defaultCollapsed=true hace que isCollapsed arranque en true", () => {
      // Arrange & Act
      vi.mocked(useIsMobile).mockReturnValue(false);
      render(
        <SidebarProvider defaultCollapsed>
          <Consumer />
        </SidebarProvider>,
      );

      // Assert
      expect(screen.getByTestId("is-collapsed")).toHaveTextContent("true");
    });
  });
});
