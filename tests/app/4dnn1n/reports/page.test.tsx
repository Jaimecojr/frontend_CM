import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportsPage from "@/app/4dnn1n/reports/page";
import { useAuth } from "@/context/AuthContext";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));

describe("ReportsPage", () => {
  it("should show the 6 cards for a super admin, including Carnets No Enviados", () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });

    // Act
    render(<ReportsPage />);

    // Assert
    // getByRole("heading", ...) instead of getByText: several card descriptions
    // repeat the sibling card's title as a plain word (e.g. "Ventas nuevas y
    // renovaciones..."), which would make a plain text match ambiguous.
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cartera" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Resumen de Afiliados" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Citas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sin Renovación" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carnets No Enviados" })).toBeInTheDocument();
  });

  it("should hide the Carnets No Enviados card for a franchise user", () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<ReportsPage />);

    // Assert
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Carnets No Enviados" })).not.toBeInTheDocument();
  });
});
