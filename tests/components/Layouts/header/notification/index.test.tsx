import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Notification } from "@/components/Layouts/header/notification";
import { useIsMobile } from "@/hooks/use-mobile";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => false) }));

// Known finding, not a bug: the list rendered below (`notificationList` inside the
// component) is hardcoded example data — there is no real notifications endpoint yet.
// The interactive dropdown behavior around it (open/close, dot visibility) is real and
// is exercised below.
const EXAMPLE_TITLES = [
  "Piter Joined the Team!",
  "New message",
  "New Payment received",
  "Jolly completed tasks",
  "Roman Joined the Team!",
];

// DropdownTrigger (see src/components/ui/dropdown.tsx) forwards any extra
// prop (aria-label included) onto the rendered <button>, so the
// `aria-label="View Notifications"` passed by Notification reaches the DOM
// and gives the bell button its accessible name.
function getTrigger() {
  return screen.getByRole("button", { name: "View Notifications" });
}

function openDropdown() {
  fireEvent.click(getTrigger());
}

describe("Notification", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  describe("Paso 1: estado inicial", () => {
    it("expone aria-label='View Notifications' en el trigger para accesibilidad", () => {
      // Arrange & Act
      render(<Notification />);

      // Assert
      expect(
        screen.getByRole("button", { name: "View Notifications" }),
      ).toBeInTheDocument();
    });

    it("muestra el punto rojo (isDotVisible) junto al icono de campana", () => {
      // Arrange & Act
      render(<Notification />);

      // Assert
      expect(getTrigger().querySelector(".bg-red-light")).toBeInTheDocument();
    });

    it("no muestra el contenido del dropdown mientras está cerrado", () => {
      // Arrange & Act
      render(<Notification />);

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Paso 2: apertura del dropdown", () => {
    it("al hacer click en el trigger abre el dropdown y muestra 'Notifications' y '5 new'", () => {
      // Arrange
      render(<Notification />);

      // Act
      openDropdown();

      // Assert
      const menu = screen.getByRole("menu");
      expect(within(menu).getByText("Notifications")).toBeInTheDocument();
      expect(within(menu).getByText("5 new")).toBeInTheDocument();
    });

    it("al abrir el dropdown oculta el punto rojo (setIsDotVisible(false) se dispara al abrir)", () => {
      // Arrange
      render(<Notification />);

      // Act
      openDropdown();

      // Assert
      expect(getTrigger().querySelector(".bg-red-light")).not.toBeInTheDocument();
    });

    it("con isMobile=true alinea el dropdown a 'end' en vez de 'center'", () => {
      // Arrange
      vi.mocked(useIsMobile).mockReturnValue(true);
      render(<Notification />);

      // Act
      openDropdown();

      // Assert
      expect(screen.getByRole("menu")).toHaveClass("right-0");
    });
  });

  describe("Paso 3: listado de notificaciones de ejemplo", () => {
    it("lista los 5 items de ejemplo con imagen, título y subtítulo", () => {
      // Arrange
      render(<Notification />);

      // Act
      openDropdown();

      // Assert
      const items = screen.getAllByRole("menuitem");
      expect(items).toHaveLength(5);
      EXAMPLE_TITLES.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
      expect(screen.getAllByAltText("User")).toHaveLength(5);
    });
  });

  describe("Paso 4: cierre al navegar", () => {
    it("al hacer click en un item cierra el dropdown (setIsOpen(false))", () => {
      // Arrange
      render(<Notification />);
      openDropdown();
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByText(EXAMPLE_TITLES[0]));

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("al hacer click en 'See all notifications' cierra el dropdown (setIsOpen(false))", () => {
      // Arrange
      render(<Notification />);
      openDropdown();
      expect(screen.getByRole("menu")).toBeInTheDocument();

      // Act
      fireEvent.click(screen.getByText("See all notifications"));

      // Assert
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
