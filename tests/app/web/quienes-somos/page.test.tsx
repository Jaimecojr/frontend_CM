import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuienesSomosPage from "@/app/web/quienes-somos/page";

describe("QuienesSomosPage", () => {
  describe("Paso 6: STATS, checklist y CTA final", () => {
    it("muestra los 3 valores de STATS con sus labels", () => {
      // Arrange & Act
      render(<QuienesSomosPage />);

      // Assert
      expect(screen.getByText("15+")).toBeInTheDocument();
      expect(screen.getByText("Años")).toBeInTheDocument();
      expect(screen.getByText("+5")).toBeInTheDocument();
      expect(screen.getByText("Ciudades")).toBeInTheDocument();
      expect(screen.getByText("500+")).toBeInTheDocument();
      expect(screen.getByText("Médicos")).toBeInTheDocument();
    });

    it("muestra los 4 items de CHECKLIST_ITEMS", () => {
      // Arrange & Act
      render(<QuienesSomosPage />);

      // Assert
      expect(screen.getByText("Red de especialistas de alto nivel")).toBeInTheDocument();
      expect(screen.getByText("Atención prioritaria sin esperas")).toBeInTheDocument();
      expect(screen.getByText("Convenios de diagnóstico avanzado")).toBeInTheDocument();
      expect(screen.getByText("Seguimiento humano personalizado")).toBeInTheDocument();
    });

    it("el CTA final 'Afíliate ahora' apunta a /web/afiliarse", () => {
      // Arrange & Act
      render(<QuienesSomosPage />);

      // Assert
      expect(screen.getByRole("link", { name: /Afíliate ahora/i })).toHaveAttribute(
        "href",
        "/web/afiliarse"
      );
    });
  });
});
