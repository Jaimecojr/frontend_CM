import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Alert } from "@/components/ui-elements/alert";

describe("Alert", () => {
  it("renderiza el título y la descripción con role='alert'", () => {
    // Arrange & Act
    render(<Alert variant="error" title="Error de validación" description="Revisa el formulario." />);

    // Assert
    const alertEl = screen.getByRole("alert");
    expect(alertEl).toHaveTextContent("Error de validación");
    expect(alertEl).toHaveTextContent("Revisa el formulario.");
  });

  it.each([
    ["success", "border-green"],
    ["warning", "border-[#FFB800]"],
    ["error", "border-red-light"],
  ] as const)("aplica la clase de borde correcta para variant=%s", (variant, expectedClass) => {
    // Arrange & Act
    render(<Alert variant={variant} title="T" description="D" />);

    // Assert
    expect(screen.getByRole("alert")).toHaveClass(expectedClass);
  });

  it("usa variant='error' por defecto (defaultVariants de cva)", () => {
    // Arrange & Act
    render(<Alert variant="error" title="T" description="D" />);

    // Assert
    expect(screen.getByRole("alert")).toHaveClass("border-red-light");
  });

  it("aplica className adicional pasado por props junto a las clases del variant", () => {
    // Arrange & Act
    render(<Alert variant="success" title="T" description="D" className="mi-clase-extra" />);

    // Assert
    const alertEl = screen.getByRole("alert");
    expect(alertEl).toHaveClass("mi-clase-extra");
    expect(alertEl).toHaveClass("border-green");
  });

  it("pasa el resto de props HTML (spread) al div raíz", () => {
    // Arrange & Act
    render(<Alert variant="warning" title="T" description="D" data-testid="alerta-custom" />);

    // Assert
    expect(screen.getByTestId("alerta-custom")).toBeInTheDocument();
  });

  it("renderiza un ícono SVG distinto por cada variant", () => {
    // Arrange & Act
    const { container, rerender } = render(<Alert variant="success" title="T" description="D" />);
    const successIconHtml = container.querySelector("svg")?.outerHTML;

    rerender(<Alert variant="error" title="T" description="D" />);
    const errorIconHtml = container.querySelector("svg")?.outerHTML;

    // Assert
    expect(successIconHtml).toBeTruthy();
    expect(errorIconHtml).toBeTruthy();
    expect(successIconHtml).not.toBe(errorIconHtml);
  });
});
