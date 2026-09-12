import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickAccessSection } from "@/components/web/QuickAccessSection";

describe("QuickAccessSection", () => {
  describe("Paso 4: Tarjetas y enlaces", () => {
    it("muestra las 4 tarjetas y los links de 'Guía Médica' y 'Afíliate' con su href", () => {
      // Arrange & Act
      render(<QuickAccessSection />);

      // Assert: las 4 tarjetas están presentes
      expect(screen.getByText("Guía Médica")).toBeInTheDocument();
      expect(screen.getByText("Afíliate")).toBeInTheDocument();
      expect(screen.getByText("Laboratorios")).toBeInTheDocument();
      expect(screen.getByText("Urgencias")).toBeInTheDocument();

      // Assert: hrefs de los links con destino
      expect(screen.getByRole("link", { name: /Guía Médica/i })).toHaveAttribute(
        "href",
        "/web/guia-medica"
      );
      expect(screen.getByRole("link", { name: /Afíliate/i })).toHaveAttribute(
        "href",
        "/web/afiliarse"
      );
    });
  });
});
