import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangeFilter } from "@/app/4dnn1n/reports/_components/DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renderiza los campos 'Desde' y 'Hasta' por defecto", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} />);

    // Assert
    expect(screen.getByPlaceholderText("Desde")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Hasta")).toBeInTheDocument();
  });

  it("con hideTo solo muestra el campo 'Vencidos desde', sin 'Hasta'", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} hideTo />);

    // Assert
    expect(screen.getByPlaceholderText("Vencidos desde")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Hasta")).not.toBeInTheDocument();
  });

  it("no muestra el botón 'Limpiar fechas' cuando no hay ningún valor", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} />);

    // Assert
    expect(screen.queryByTitle("Limpiar fechas")).not.toBeInTheDocument();
  });

  it("muestra el botón 'Limpiar fechas' cuando solo 'from' tiene valor, y limpia ambas claves en un solo onChange", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<DateRangeFilter from="2026-01-01" to="" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it("con hideTo, el botón 'Limpiar fechas' solo limpia 'from'", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<DateRangeFilter from="2026-01-01" to="" onChange={onChange} hideTo />);
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ from: undefined });
  });
});
