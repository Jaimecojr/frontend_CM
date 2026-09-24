import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FranchiseSelect } from "@/app/4dnn1n/reports/_components/FranchiseSelect";

describe("FranchiseSelect", () => {
  it("should render the 'Franquicia (Todas)' option and one option per franchise", () => {
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

  it("should call onChange with the selected id", () => {
    // Arrange
    const onChange = vi.fn();
    const options = [{ id: 3, name: "FRANQUICIA SUR" }];
    render(<FranchiseSelect value="" onChange={onChange} options={options} />);

    // Act
    fireEvent.change(screen.getByTitle("Filtrar por Franquicia"), { target: { value: "3" } });

    // Assert
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("should reflect the selected value", () => {
    // Arrange
    const options = [{ id: 4, name: "FRANQUICIA SUR" }];

    // Act
    render(<FranchiseSelect value="4" onChange={vi.fn()} options={options} />);

    // Assert
    expect(screen.getByTitle("Filtrar por Franquicia")).toHaveValue("4");
  });
});
