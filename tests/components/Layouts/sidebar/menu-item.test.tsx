import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuItem } from "@/components/Layouts/sidebar/menu-item";
import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";

vi.mock("@/components/Layouts/sidebar/sidebar-context", () => ({
  useSidebarContext: vi.fn(),
}));

function mockSidebarContext(
  overrides: Partial<ReturnType<typeof useSidebarContext>> = {},
) {
  vi.mocked(useSidebarContext).mockReturnValue({
    isOpen: false,
    setIsOpen: vi.fn(),
    toggleSidebar: vi.fn(),
    isCollapsed: false,
    setIsCollapsed: vi.fn(),
    toggleCollapse: vi.fn(),
    isMobile: false,
    ...overrides,
  });
}

describe("MenuItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Paso 1: as='link' — clases según isActive", () => {
    it("isActive=true aplica las clases de estado activo", () => {
      // Arrange & Act
      mockSidebarContext();
      render(
        <MenuItem as="link" href="/foo" isActive>
          Foo
        </MenuItem>,
      );

      // Assert
      const link = screen.getByRole("link", { name: "Foo" });
      expect(link).toHaveClass("bg-[rgba(87,80,241,0.07)]");
      expect(link).toHaveClass("text-primary");
    });

    it("isActive=false aplica las clases neutras de hover", () => {
      // Arrange & Act
      mockSidebarContext();
      render(
        <MenuItem as="link" href="/foo" isActive={false}>
          Foo
        </MenuItem>,
      );

      // Assert
      const link = screen.getByRole("link", { name: "Foo" });
      expect(link).not.toHaveClass("bg-[rgba(87,80,241,0.07)]");
      expect(link).toHaveClass("hover:bg-gray-100");
    });
  });

  describe("Paso 2: as='link' — click y toggleSidebar en mobile", () => {
    it("isMobile=true invoca toggleSidebar al hacer click (cierra el overlay al navegar)", () => {
      // Arrange
      const toggleSidebar = vi.fn();
      mockSidebarContext({ isMobile: true, toggleSidebar });
      render(
        <MenuItem as="link" href="/foo" isActive={false}>
          Foo
        </MenuItem>,
      );

      // Act
      fireEvent.click(screen.getByRole("link", { name: "Foo" }));

      // Assert
      expect(toggleSidebar).toHaveBeenCalledTimes(1);
    });

    it("isMobile=false NO invoca toggleSidebar al hacer click", () => {
      // Arrange
      const toggleSidebar = vi.fn();
      mockSidebarContext({ isMobile: false, toggleSidebar });
      render(
        <MenuItem as="link" href="/foo" isActive={false}>
          Foo
        </MenuItem>,
      );

      // Act
      fireEvent.click(screen.getByRole("link", { name: "Foo" }));

      // Assert
      expect(toggleSidebar).not.toHaveBeenCalled();
    });
  });

  describe("Paso 3: as='button' (default)", () => {
    it("renderiza un <button> con aria-expanded igual a isActive y ejecuta el onClick recibido", () => {
      // Arrange
      const onClick = vi.fn();
      mockSidebarContext();
      render(
        <MenuItem isActive onClick={onClick}>
          Bar
        </MenuItem>,
      );

      // Act
      const button = screen.getByRole("button", { name: "Bar" });

      // Assert
      expect(button).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("aria-expanded es false cuando isActive es false", () => {
      // Arrange & Act
      mockSidebarContext();
      render(
        <MenuItem isActive={false} onClick={vi.fn()}>
          Bar
        </MenuItem>,
      );

      // Assert
      expect(screen.getByRole("button", { name: "Bar" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });
  });
});
