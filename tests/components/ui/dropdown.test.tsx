import { useState } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
  DropdownClose,
} from "@/components/ui/dropdown";

type Align = "start" | "end" | "center";

type TestDropdownProps = {
  initialOpen?: boolean;
  align?: Align;
};

// Controlled wrapper mirroring how consumers actually use Dropdown (isOpen/setIsOpen owned
// by the caller via useState), so the tests exercise the real open/close state machine.
function TestDropdown({ initialOpen = false, align }: TestDropdownProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger>Abrir menú</DropdownTrigger>
      <DropdownContent align={align}>
        <DropdownClose>
          <button type="button">Cerrar</button>
        </DropdownClose>
        <div>Contenido del menú</div>
      </DropdownContent>
    </Dropdown>
  );
}

function renderDropdown(props?: TestDropdownProps) {
  return render(
    <div>
      <TestDropdown {...props} />
      <button type="button">Afuera</button>
    </div>,
  );
}

describe("Dropdown", () => {
  // The lock effect mutates document.body.style directly, which is not part of the React
  // tree torn down by testing-library's auto cleanup — reset it so tests do not bleed into
  // each other.
  afterEach(() => {
    document.body.style.removeProperty("pointer-events");
  });

  describe("apertura y cierre básico", () => {
    it("no renderiza DropdownContent cuando isOpen es false", () => {
      // Arrange & Act
      renderDropdown();

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("al hacer click en DropdownTrigger invoca setIsOpen(true) y renderiza DropdownContent con role='menu'", () => {
      // Arrange
      renderDropdown();

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

      // Assert
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("cierre por click-fuera y por Escape", () => {
    it("cierra el dropdown cuando ocurre un mousedown fuera del contenedor", () => {
      // Arrange
      renderDropdown({ initialOpen: true });
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Act: real mousedown outside DropdownContent's ref, as dispatched by useClickOutside
      fireEvent.mouseDown(screen.getByRole("button", { name: "Afuera" }));

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("no cierra el dropdown cuando el mousedown ocurre dentro del contenido", () => {
      // Arrange
      renderDropdown({ initialOpen: true });

      // Act
      fireEvent.mouseDown(screen.getByText("Contenido del menú"));

      // Assert
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("cierra el dropdown al presionar Escape dentro del contenedor", () => {
      // Arrange
      renderDropdown({ initialOpen: true });

      // Act: keydown bubbles up from the menu to the wrapping div's onKeyDown handler
      fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("align y pointer-events", () => {
    it("aplica la clase 'right-0' cuando align='end'", () => {
      // Arrange & Act
      renderDropdown({ initialOpen: true, align: "end" });

      // Assert
      expect(screen.getByRole("menu")).toHaveClass("right-0");
    });

    it("aplica la clase 'left-0' cuando align='start'", () => {
      // Arrange & Act
      renderDropdown({ initialOpen: true, align: "start" });

      // Assert
      expect(screen.getByRole("menu")).toHaveClass("left-0");
    });

    it("aplica 'left-1/2 -translate-x-1/2' por defecto (align='center')", () => {
      // Arrange & Act
      renderDropdown({ initialOpen: true });

      // Assert
      const menu = screen.getByRole("menu");
      expect(menu).toHaveClass("left-1/2");
      expect(menu).toHaveClass("-translate-x-1/2");
    });

    it("bloquea document.body.style.pointerEvents mientras isOpen es true, y lo restaura al cerrar", () => {
      // Arrange
      renderDropdown();
      expect(document.body.style.pointerEvents).toBe("");

      // Act: open
      fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

      // Assert: locked while open
      expect(document.body.style.pointerEvents).toBe("none");

      // Act: close via DropdownClose
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

      // Assert: property removed, not merely set to a falsy value
      expect(document.body.style.pointerEvents).toBe("");
    });
  });

  describe("DropdownTrigger y DropdownClose", () => {
    it("expone aria-expanded, aria-haspopup y data-state acorde a isOpen", () => {
      // Arrange
      renderDropdown();
      const trigger = screen.getByRole("button", { name: "Abrir menú" });

      // Assert: closed state
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
      expect(trigger).toHaveAttribute("data-state", "closed");

      // Act
      fireEvent.click(trigger);

      // Assert: open state
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(trigger).toHaveAttribute("data-state", "open");
    });

    it("al hacer click dentro de DropdownClose invoca handleClose y cierra el dropdown", () => {
      // Arrange
      renderDropdown({ initialOpen: true });
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

      // Assert: indirectly verifies handleClose ran setIsOpen(false)
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("reenvía props adicionales (ej. aria-label) al elemento button renderizado", () => {
      // Arrange & Act: DropdownTrigger must forward any prop it doesn't own itself
      // (className/children) so consumers like the notification bell keep an
      // accessible name.
      render(
        <Dropdown isOpen={false} setIsOpen={() => {}}>
          <DropdownTrigger aria-label="View Notifications">
            <span>Bell</span>
          </DropdownTrigger>
        </Dropdown>,
      );

      // Assert
      expect(
        screen.getByRole("button", { name: "View Notifications" }),
      ).toBeInTheDocument();
    });
  });
});
