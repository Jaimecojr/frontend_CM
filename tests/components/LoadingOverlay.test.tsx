import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { LoadingOverlay } from "@/components/LoadingOverlay";

// Mock the LogoIcon component
vi.mock("@/components/logo", () => ({
  LogoIcon: vi.fn(() => <div data-testid="logo-icon">Logo</div>),
}));

describe("LoadingOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 1: Mount guard y lógica de isLoading", () => {
    it("no renderiza nada cuando isLoading es false", () => {
      // Arrange & Act
      const { container } = render(<LoadingOverlay isLoading={false} />);

      // Assert
      expect(container.firstChild).toBeNull();
    });

    it("renderiza el overlay con el mensaje por defecto después de montarse", () => {
      // Arrange & Act
      render(<LoadingOverlay isLoading={true} />);

      // Assert
      const overlay = document.body.querySelector(".fixed.inset-0.z-\\[9999\\]");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveTextContent("Cargando");
    });

    it("renderiza con el mensaje personalizado cuando se proporciona", () => {
      // Arrange & Act
      render(<LoadingOverlay isLoading={true} message="Enviando" />);

      // Assert
      const overlay = document.body.querySelector(".fixed.inset-0.z-\\[9999\\]");
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveTextContent("Enviando");
      expect(overlay).not.toHaveTextContent("Cargando");
    });

    it("renderiza los tres puntos animados", () => {
      // Arrange & Act
      render(<LoadingOverlay isLoading={true} />);

      // Assert
      const dots = document.querySelectorAll(".animate-bounce");
      expect(dots).toHaveLength(3);
      expect(dots[0]).toHaveStyle({ animationDelay: "0ms" });
      expect(dots[1]).toHaveStyle({ animationDelay: "150ms" });
      expect(dots[2]).toHaveStyle({ animationDelay: "300ms" });
    });
  });

  describe("Step 2: Portal rendering en document.body", () => {
    it("renderiza el overlay en document.body y no en el contenedor local", () => {
      // Arrange
      const { container } = render(<LoadingOverlay isLoading={true} />);

      // Act & Assert
      // El contenedor local debe estar vacío
      expect(container.firstChild).toBeNull();

      // El overlay debe estar directamente en document.body
      const overlay = document.body.querySelector(".fixed.inset-0.z-\\[9999\\]");
      expect(overlay).toBeInTheDocument();
      expect(overlay?.parentElement).toBe(document.body);
    });

    it("renderiza el LogoIcon dentro del overlay portal", () => {
      // Arrange & Act
      render(<LoadingOverlay isLoading={true} />);

      // Assert
      const logoIcon = document.body.querySelector("[data-testid='logo-icon']");
      expect(logoIcon).toBeInTheDocument();
      expect(logoIcon?.parentElement?.classList.contains("animate-pulse")).toBe(true);
    });
  });
});
