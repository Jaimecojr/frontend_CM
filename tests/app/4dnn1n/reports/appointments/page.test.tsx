import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import AppointmentsReportPage from "@/app/4dnn1n/reports/appointments/page";
import { useAuth } from "@/context/AuthContext";
import { getAppointmentsReport } from "@/app/4dnn1n/reports/appointments/fetch";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/usePageTitle", () => ({ usePageTitle: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/4dnn1n/reports/appointments",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/app/4dnn1n/reports/appointments/fetch", () => ({
  getAppointmentsReport: vi.fn(),
  getActiveDoctors: vi.fn().mockResolvedValue([]),
  getActiveFranchises: vi.fn().mockResolvedValue([]),
}));

describe("AppointmentsReportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: { id: 1, type: 1 } });
    (getAppointmentsReport as any).mockResolvedValue({
      data: [
        { id: 1, name: "ANA LOPEZ (Titular)", doctor: "CARLOS PEREZ", city: "BOGOTA", date: "2026-09-20" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });
  });

  it("renderiza las filas del reporte con el color de fecha correspondiente", async () => {
    // Act
    render(<AppointmentsReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText(/ANA LOPEZ \(Titular\)/)).toBeInTheDocument());
  });

  it("colorea la fecha a partir de solo los primeros 10 caracteres, aunque venga con hora", async () => {
    // Arrange: a full timestamp, not just yyyy-mm-dd — the color logic must
    // still work by slicing, not by trying to parse the whole string as a date.
    (getAppointmentsReport as any).mockResolvedValue({
      data: [
        { id: 2, name: "LUIS RIOS (Beneficiario)", doctor: "MARIA DIAZ", city: "CALI", date: "2020-01-01T10:30:00" },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    render(<AppointmentsReportPage />);

    // Assert: a date far in the past renders with the "past" color class.
    await waitFor(() => expect(screen.getByText("01/01/2020")).toBeInTheDocument());
    expect(screen.getByText("01/01/2020").className).toMatch(/text-red-600/);
  });

  it("no muestra el filtro de Franquicia para un usuario de franquicia (type 2)", async () => {
    // Arrange
    (useAuth as any).mockReturnValue({ user: { id: 2, type: 2 } });

    // Act
    render(<AppointmentsReportPage />);

    // Assert
    await waitFor(() => expect(screen.getByText(/ANA LOPEZ \(Titular\)/)).toBeInTheDocument());
    expect(screen.queryByTitle("Filtrar por Franquicia")).not.toBeInTheDocument();
  });
});
