import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FranchiseSelect } from "@/app/4dnn1n/reports/_components/FranchiseSelect";

describe("FranchiseSelect", () => {
  it("renderiza la opción 'Franquicia (Todas)' y una opción por cada franquicia", () => {
    // Arrange
    const options = [
      { id: 1, name: "FRANQUICIA CENTRO" },
      { id: 2, name: "FRANQUICIA NORTE" },
    ];

    // Act
    render(<FranchiseSelect value="" onChange={vi.fn()} options={options} />);

    // Assert
    expect(screen.getByText("Franquicia (Todas)")).toBeInTheDocument();
    expect(screen.getByText("FRANQUICIA CENTRO")).toBeInTheDocument();
    expect(screen.getByText("FRANQUICIA NORTE")).toBeInTheDocument();
  });

  it("llama onChange con el id seleccionado", () => {
    // Arrange
    const onChange = vi.fn();
    const options = [{ id: 3, name: "FRANQUICIA SUR" }];
    render(<FranchiseSelect value="" onChange={onChange} options={options} />);

    // Act
    fireEvent.change(screen.getByTitle("Filtrar por Franquicia"), { target: { value: "3" } });

    // Assert
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("refleja el value seleccionado", () => {
    // Arrange
    const options = [{ id: 4, name: "FRANQUICIA SUR" }];

    // Act
    render(<FranchiseSelect value="4" onChange={vi.fn()} options={options} />);

    // Assert
    expect(screen.getByTitle("Filtrar por Franquicia")).toHaveValue("4");
  });
});
