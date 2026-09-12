import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LegalModal from "@/components/web/LegalModal";

describe("LegalModal", () => {
  beforeEach(() => {
    // Ensure clean state before each test
    document.body.style.overflow = "";
  });

  afterEach(() => {
    // Belt-and-suspenders: even though the component's own cleanup effect
    // resets this on unmount, guard against it leaking into other test files.
    document.body.style.overflow = "";
  });

  describe("contenido según type", () => {
    it("muestra título 'Política de Privacidad y Tratamiento de Datos' cuando type='privacy'", () => {
      // Arrange & Act
      render(<LegalModal type="privacy" onClose={vi.fn()} />);

      // Assert
      expect(
        screen.getByText("Política de Privacidad y Tratamiento de Datos")
      ).toBeInTheDocument();
    });

    it("incluye la sección '1. Responsable del Tratamiento' cuando type='privacy'", () => {
      // Arrange & Act
      render(<LegalModal type="privacy" onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("1. Responsable del Tratamiento")).toBeInTheDocument();
    });

    it("muestra título 'Términos y Condiciones' cuando type='terms'", () => {
      // Arrange & Act
      render(<LegalModal type="terms" onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("Términos y Condiciones")).toBeInTheDocument();
    });

    it("incluye la sección '1. Descripción del Servicio' cuando type='terms'", () => {
      // Arrange & Act
      render(<LegalModal type="terms" onClose={vi.fn()} />);

      // Assert
      expect(screen.getByText("1. Descripción del Servicio")).toBeInTheDocument();
    });
  });

  describe("cierre — Escape, backdrop, botones", () => {
    it("invoca onClose al presionar Escape", () => {
      // Arrange
      const onClose = vi.fn();
      render(<LegalModal type="privacy" onClose={onClose} />);

      // Act
      fireEvent.keyDown(document, { key: "Escape" });

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("invoca onClose al hacer click en el backdrop", () => {
      // Arrange
      const onClose = vi.fn();
      render(<LegalModal type="privacy" onClose={onClose} />);
      // Find the panel (white box), then get its parent (backdrop)
      const panel = screen
        .getByText("1. Responsable del Tratamiento")
        .closest(".bg-white") as HTMLElement;
      const backdrop = panel.parentElement as HTMLElement;

      // Act
      fireEvent.click(backdrop);

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("no invoca onClose al hacer click dentro del panel (stopPropagation)", () => {
      // Arrange
      const onClose = vi.fn();
      render(<LegalModal type="privacy" onClose={onClose} />);
      const panel = screen
        .getByText("1. Responsable del Tratamiento")
        .closest(".bg-white") as HTMLElement;

      // Act
      fireEvent.click(panel);

      // Assert
      expect(onClose).not.toHaveBeenCalled();
    });

    it("invoca onClose al hacer click en el botón cerrar (×) del header", () => {
      // Arrange
      const onClose = vi.fn();
      render(<LegalModal type="privacy" onClose={onClose} />);
      const closeButton = screen.getByRole("button", { name: "Cerrar" });

      // Act
      fireEvent.click(closeButton);

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("invoca onClose al hacer click en el botón 'Entendido' del footer", () => {
      // Arrange
      const onClose = vi.fn();
      render(<LegalModal type="privacy" onClose={onClose} />);
      const entendidoButton = screen.getByRole("button", { name: "Entendido" });

      // Act
      fireEvent.click(entendidoButton);

      // Assert
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("scroll-lock y portal", () => {
    it("bloquea el scroll del body al montar y lo restaura al desmontar", () => {
      // Arrange & Act
      const { unmount } = render(<LegalModal type="privacy" onClose={vi.fn()} />);

      // Assert: scroll is locked
      expect(document.body.style.overflow).toBe("hidden");

      // Act
      unmount();

      // Assert: scroll is restored
      expect(document.body.style.overflow).toBe("");
    });

    it("se renderiza mediante portal directamente en document.body, no dentro del contenedor de test", () => {
      // Arrange & Act
      const { container } = render(<LegalModal type="privacy" onClose={vi.fn()} />);

      // Assert: the container is empty because the modal is portaled to document.body
      expect(container).toBeEmptyDOMElement();

      // Assert: the modal content is found via screen (which searches document.body)
      expect(
        screen.getByText("Política de Privacidad y Tratamiento de Datos")
      ).toBeInTheDocument();
      expect(
        screen.getByText("1. Responsable del Tratamiento")
      ).toBeInTheDocument();
    });
  });
});
