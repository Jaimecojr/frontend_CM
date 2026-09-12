import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Layouts/sidebar";
import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";
import { usePathname } from "next/navigation";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));
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

// Sidebar renders the real NAV_DATA (src/components/Layouts/sidebar/data/index.ts).
// The "Authentication" -> "Sign In" pair is the only section with a subitem in the real
// data, so it anchors every accordion-expansion assertion below.

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarContext();
  });

  describe("Paso 1: sin coincidencia de pathname (home)", () => {
    it("con pathname '/4dnn1n/home' ningún acordeón queda expandido", () => {
      // Arrange & Act
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/home");
      render(<Sidebar />);

      // Assert
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });
  });

  describe("Paso 2: pathname coincide con la URL de un subitem", () => {
    it("con pathname '/auth/sign-in' el acordeón 'Authentication' se expande automáticamente", () => {
      // Arrange & Act
      vi.mocked(usePathname).mockReturnValue("/auth/sign-in");
      render(<Sidebar />);

      // Assert
      expect(screen.getByText("Sign In")).toBeInTheDocument();
    });
  });

  describe("Paso 3: click en el título de un item con subitems", () => {
    it("alterna el acordeón: primer click expande, segundo click lo colapsa", () => {
      // Arrange: pathname without any subitem match, nothing expanded on mount
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/affiliates");
      render(<Sidebar />);
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
      const authButton = screen.getByRole("button", { name: "Authentication" });

      // Act: first click expands
      fireEvent.click(authButton);

      // Assert
      expect(screen.getByText("Sign In")).toBeInTheDocument();

      // Act: second click collapses
      fireEvent.click(authButton);

      // Assert
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });
  });

  describe("Paso 4: desktop colapsado (isCollapsed=true)", () => {
    it("un click en el acordeón NO lo expande y las etiquetas de sección no se muestran", () => {
      // Arrange
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/affiliates");
      mockSidebarContext({ isMobile: false, isCollapsed: true });
      render(<Sidebar />);
      const authButton = screen.getByRole("button", { name: "Authentication" });

      // Act
      fireEvent.click(authButton);

      // Assert: toggleExpanded short-circuits, so the submenu never appears
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
      // Assert: section labels are hidden entirely when collapsed on desktop
      expect(screen.queryByText("MAIN MENU")).not.toBeInTheDocument();
      expect(screen.queryByText("OTHERS")).not.toBeInTheDocument();
    });
  });

  describe("Paso 5: overlay móvil", () => {
    it("isMobile=true e isOpen=true muestra el overlay oscuro y el click en él invoca setIsOpen(false)", () => {
      // Arrange
      const setIsOpen = vi.fn();
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/home");
      mockSidebarContext({ isMobile: true, isOpen: true, setIsOpen });
      const { container } = render(<Sidebar />);
      const overlay = container.querySelector('[class*="bg-black/50"]');
      expect(overlay).toBeInTheDocument();

      // Act
      fireEvent.click(overlay as Element);

      // Assert
      expect(setIsOpen).toHaveBeenCalledWith(false);
    });

    it("isMobile=true e isOpen=false: el <aside> tiene aria-hidden='true' e inert, y no hay overlay", () => {
      // Arrange & Act
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/home");
      mockSidebarContext({ isMobile: true, isOpen: false });
      const { container } = render(<Sidebar />);

      // Assert: `inert` strips the accessible name too, so the element is queried
      // directly from the DOM instead of through an accessibility-tree role query.
      const aside = container.querySelector("aside");
      expect(aside).not.toBeNull();
      expect(aside).toHaveAttribute("aria-hidden", "true");
      expect(aside).toHaveAttribute("inert");
      expect(
        container.querySelector('[class*="bg-black/50"]'),
      ).not.toBeInTheDocument();
    });
  });
});
