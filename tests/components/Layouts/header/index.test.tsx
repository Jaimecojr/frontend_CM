import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Header } from "@/components/Layouts/header";
import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/components/Layouts/sidebar/sidebar-context", () => ({
  useSidebarContext: vi.fn(),
}));

// Header composes the real Notification and UserInfo widgets (they are not mocked here,
// per the brief — they get their own dedicated test files). Both pull in hooks that need
// a mock to render at all in jsdom: Notification calls the real useIsMobile (jsdom has no
// window.matchMedia), and UserInfo calls the real useAuth (throws outside <AuthProvider>).
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

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

function mockAuthenticatedUser() {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, name: "Juan Pérez", email: "j@x.com", user: "jperez", type: 2 },
    loading: false,
    isLoggingOut: false,
    refreshUser: vi.fn(),
    logoutUser: vi.fn(),
  });
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobile).mockReturnValue(false);
    mockAuthenticatedUser();
  });

  describe("Paso 1: modo mobile", () => {
    it("muestra el logo junto al botón de menú, enlazando a /4dnn1n/home", () => {
      // Arrange & Act
      mockSidebarContext({ isMobile: true });
      render(<Header />);

      // Assert
      const logoLink = screen.getByRole("link");
      expect(logoLink).toHaveAttribute("href", "/4dnn1n/home");
    });

    it("al hacer click en el botón hamburguesa (visible solo en mobile, lg:hidden) invoca toggleSidebar", () => {
      // Arrange
      const toggleSidebar = vi.fn();
      mockSidebarContext({ isMobile: true, toggleSidebar });
      render(<Header />);
      const menuButton = screen.getByRole("button", { name: "Toggle Sidebar" });
      expect(menuButton).toHaveClass("lg:hidden");

      // Act
      fireEvent.click(menuButton);

      // Assert
      expect(toggleSidebar).toHaveBeenCalledTimes(1);
    });
  });

  describe("Paso 2: modo desktop con sidebar expandido", () => {
    it("el botón de colapsar (visible solo en desktop, lg:inline-flex) tiene title='Colapsar sidebar' e invoca toggleCollapse al hacer click", () => {
      // Arrange
      const toggleCollapse = vi.fn();
      mockSidebarContext({ isMobile: false, isCollapsed: false, toggleCollapse });
      render(<Header />);
      const collapseButton = screen.getByTitle("Colapsar sidebar");
      expect(collapseButton).toHaveClass("lg:inline-flex");

      // Act
      fireEvent.click(collapseButton);

      // Assert
      expect(toggleCollapse).toHaveBeenCalledTimes(1);
    });

    it("no muestra el logo cuando isMobile es false", () => {
      // Arrange & Act
      mockSidebarContext({ isMobile: false });
      render(<Header />);

      // Assert: no dropdown is open, so the mobile logo is the only possible <a> link
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });

  describe("Paso 3: modo desktop con sidebar colapsado", () => {
    it("el mismo botón cambia su title a 'Expandir sidebar'", () => {
      // Arrange & Act
      mockSidebarContext({ isMobile: false, isCollapsed: true });
      render(<Header />);

      // Assert
      expect(screen.getByTitle("Expandir sidebar")).toBeInTheDocument();
    });
  });

  describe("Paso 4: composición real de Notification y UserInfo", () => {
    it("renderiza el trigger real de Notification y el nombre real de UserInfo", () => {
      // Arrange & Act
      mockSidebarContext({ isMobile: false });
      render(<Header />);

      // Assert: distinctive markers of each real child, not stubs.
      // Notification's trigger carries aria-label="View Notifications", forwarded to the
      // DOM by DropdownTrigger (src/components/ui/dropdown.tsx), so it can be queried by
      // accessible name directly instead of reaching for an incidental UI detail.
      expect(
        screen.getByRole("button", { name: "View Notifications" }),
      ).toBeInTheDocument();
      expect(screen.getByText("jperez")).toBeInTheDocument();
    });
  });
});
