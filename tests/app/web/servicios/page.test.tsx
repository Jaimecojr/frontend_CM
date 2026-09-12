import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiciosPage from "@/app/web/servicios/page";

const HOME_SERVICE_TITLES = [
  "Laboratorio Clínico",
  "Imágenes Diagnósticas",
  "Ambulancia",
  "Médico a Domicilio",
  "Enfermería a Domicilio",
  "Fisioterapia y Terapia Respiratoria",
];

const SPECIALTIES = [
  "Medicina General",
  "Ginecología",
  "Pediatría",
  "Medicina Interna",
  "Gastroenterología",
  "Dermatología",
  "Neurocirugía",
  "Cardiología",
  "Ortopedia",
  "Odontología General y Especializada",
  "Optometría",
  "Cirugía Plástica",
  "Cirugía Vascular",
  "Urología",
  "Nefrología",
  "Otorrinolaringología",
  "Reumatología",
  "Endocrinología",
  "Oftalmología",
  "Neuropediatría",
];

describe("ServiciosPage", () => {
  describe("Paso 7: HOME_SERVICES, SPECIALTIES y CTAs finales", () => {
    it("lista los 6 HOME_SERVICES por título", () => {
      // Arrange & Act
      render(<ServiciosPage />);

      // Assert
      HOME_SERVICE_TITLES.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });

    it("lista las 20 SPECIALTIES por texto", () => {
      // Arrange & Act
      render(<ServiciosPage />);

      // Assert
      SPECIALTIES.forEach((specialty) => {
        expect(screen.getByText(specialty)).toBeInTheDocument();
      });
    });

    it("los 2 CTAs finales apuntan a /web/guia-medica y /web/afiliarse respectivamente", () => {
      // Arrange & Act
      render(<ServiciosPage />);

      // Assert
      expect(screen.getByRole("link", { name: /Ver Guía Médica/i })).toHaveAttribute(
        "href",
        "/web/guia-medica"
      );
      expect(screen.getByRole("link", { name: /Afíliate ahora/i })).toHaveAttribute(
        "href",
        "/web/afiliarse"
      );
    });
  });
});
