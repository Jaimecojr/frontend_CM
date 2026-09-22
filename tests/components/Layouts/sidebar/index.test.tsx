import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "@/components/Layouts/sidebar";
import { useSidebarContext } from "@/components/Layouts/sidebar/sidebar-context";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

function DummyIcon() {
  return <svg data-testid="dummy-icon" />;
}

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));
vi.mock("@/components/Layouts/sidebar/sidebar-context", () => ({
  useSidebarContext: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

// Synthetic NAV_DATA, independent of the real menu (src/components/Layouts/sidebar/data). This
// suite tests the Sidebar's own mechanics — accordion expand/collapse, active-item detection, the
// superAdminOnly filter — without being coupled to (and breaking every time someone edits) the
// real production menu entries.
vi.mock("@/components/Layouts/sidebar/data", () => ({
  NAV_DATA: [
    {
      label: "SECTION ONE",
      items: [
        { title: "Leaf Item", icon: DummyIcon, url: "/leaf", items: [] },
        {
          title: "Parent Item",
          icon: DummyIcon,
          url: "/parent",
          items: [{ title: "Child Item", url: "/child" }],
        },
        {
          title: "Admin Only Item",
          icon: DummyIcon,
          url: "/admin-only",
          items: [],
          superAdminOnly: true,
        },
      ],
    },
  ],
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

function mockAuth(type: number | null) {
  vi.mocked(useAuth).mockReturnValue({
    user: type === null ? null : { id: 1, type },
    loading: false,
    isLoggingOut: false,
  } as any);
}

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSidebarContext();
    mockAuth(1); // super admin by default, so most tests aren't gated by the new filter
  });

  describe("Paso 1: sin coincidencia de pathname (home)", () => {
    it("con pathname '/4dnn1n/home' ningún acordeón queda expandido", () => {
      // Arrange & Act
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/home");
      render(<Sidebar />);

      // Assert
      expect(screen.queryByText("Child Item")).not.toBeInTheDocument();
    });

    // With a single "MAIN MENU" section in the real NAV_DATA, a visible heading served no
    // purpose (nothing else to distinguish it from) and was the one leftover English string in
    // an otherwise Spanish panel — `section.label` is kept only as the nav's accessible name.
    it("no muestra el nombre de la sección como texto visible, ni expandido ni colapsado", () => {
      // Arrange & Act (expanded)
      vi.mocked(usePathname).mockReturnValue("/4dnn1n/home");
      const { unmount } = render(<Sidebar />);

      // Assert
      expect(screen.queryByText("SECTION ONE")).not.toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "SECTION ONE" })).toBeInTheDocument();
      unmount();

      // Arrange & Act (collapsed)
      mockSidebarContext({ isMobile: false, isCollapsed: true });
      render(<Sidebar />);

      // Assert
      expect(screen.queryByText("SECTION ONE")).not.toBeInTheDocument();
    });
  });

  describe("Paso 2: pathname coincide con la URL de un subitem", () => {
    it("con pathname '/child' el acordeón 'Parent Item' se expande automáticamente", () => {
      // Arrange & Act
      vi.mocked(usePathname).mockReturnValue("/child");
      render(<Sidebar />);

      // Assert
      expect(screen.getByText("Child Item")).toBeInTheDocument();
    });
  });

  describe("Paso 3: click en el título de un item con subitems", () => {
    it("alterna el acordeón: primer click expande, segundo click lo colapsa", () => {
      // Arrange: pathname without any subitem match, nothing expanded on mount
      vi.mocked(usePathname).mockReturnValue("/leaf");
      render(<Sidebar />);
      expect(screen.queryByText("Child Item")).not.toBeInTheDocument();
      const parentButton = screen.getByRole("button", { name: "Parent Item" });

      // Act: first click expands
      fireEvent.click(parentButton);

      // Assert
      expect(screen.getByText("Child Item")).toBeInTheDocument();

      // Act: second click collapses
      fireEvent.click(parentButton);

      // Assert
      expect(screen.queryByText("Child Item")).not.toBeInTheDocument();
    });
  });

  describe("Paso 4: desktop colapsado (isCollapsed=true)", () => {
    it("un click en el acordeón NO lo expande", () => {
      // Arrange
      vi.mocked(usePathname).mockReturnValue("/leaf");
      mockSidebarContext({ isMobile: false, isCollapsed: true });
      render(<Sidebar />);
      const parentButton = screen.getByRole("button", { name: "Parent Item" });

      // Act
      fireEvent.click(parentButton);

      // Assert: toggleExpanded short-circuits, so the submenu never appears
      expect(screen.queryByText("Child Item")).not.toBeInTheDocument();
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

  // ──── Step 6: superAdminOnly filter — items only the super admin (type 1) should see ────
  describe("filtro superAdminOnly", () => {
    it("type 1 (super admin) → ve el ítem marcado superAdminOnly", () => {
      // Arrange
      mockAuth(1);
      vi.mocked(usePathname).mockReturnValue("/leaf");

      // Act
      render(<Sidebar />);

      // Assert
      expect(
        screen.getByRole("link", { name: "Admin Only Item" }),
      ).toBeInTheDocument();
    });

    it("type 2 (no super admin) → NO ve el ítem marcado superAdminOnly, pero sí los demás", () => {
      // Arrange
      mockAuth(2);
      vi.mocked(usePathname).mockReturnValue("/leaf");

      // Act
      render(<Sidebar />);

      // Assert
      expect(
        screen.queryByRole("link", { name: "Admin Only Item" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Leaf Item" })).toBeInTheDocument();
    });

    it("sin usuario resuelto todavía → NO ve el ítem marcado superAdminOnly", () => {
      // Arrange
      mockAuth(null);
      vi.mocked(usePathname).mockReturnValue("/leaf");

      // Act
      render(<Sidebar />);

      // Assert
      expect(
        screen.queryByRole("link", { name: "Admin Only Item" }),
      ).not.toBeInTheDocument();
    });
  });
});
