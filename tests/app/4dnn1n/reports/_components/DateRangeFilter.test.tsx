import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateRangeFilter } from "@/app/4dnn1n/reports/_components/DateRangeFilter";

describe("DateRangeFilter", () => {
  it("should render the 'Desde' and 'Hasta' fields by default", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} />);

    // Assert
    expect(screen.getByPlaceholderText("Desde")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Hasta")).toBeInTheDocument();
  });

  it("should only show the 'Vencidos desde' field, without 'Hasta', when hideTo is set", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} hideTo />);

    // Assert
    expect(screen.getByPlaceholderText("Vencidos desde")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Hasta")).not.toBeInTheDocument();
  });

  it("should not show the 'Limpiar fechas' button when there is no value", () => {
    // Act
    render(<DateRangeFilter from="" to="" onChange={vi.fn()} />);

    // Assert
    expect(screen.queryByTitle("Limpiar fechas")).not.toBeInTheDocument();
  });

  it("should show the 'Limpiar fechas' button and clear both keys in a single onChange when only 'from' has a value", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<DateRangeFilter from="2026-01-01" to="" onChange={onChange} />);
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ from: undefined, to: undefined });
  });

  it("should only clear 'from' via the 'Limpiar fechas' button when hideTo is set", () => {
    // Arrange
    const onChange = vi.fn();

    // Act
    render(<DateRangeFilter from="2026-01-01" to="" onChange={onChange} hideTo />);
    fireEvent.click(screen.getByTitle("Limpiar fechas"));

    // Assert
    expect(onChange).toHaveBeenCalledWith({ from: undefined });
  });
});
