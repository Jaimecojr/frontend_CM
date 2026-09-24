import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExportReportButton } from "@/app/4dnn1n/reports/_components/ExportReportButton";
import { downloadFile } from "@/lib/download";
import { alert } from "@/lib/alert";

vi.mock("@/lib/download", () => ({ downloadFile: vi.fn() }));
vi.mock("@/lib/alert", () => ({ alert: { error: vi.fn() } }));

describe("ExportReportButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("llama downloadFile con la ruta y los params serializados en el query string", async () => {
    // Arrange
    (downloadFile as any).mockResolvedValue(undefined);

    // Act
    render(
      <ExportReportButton
        path="/api/reports/sales/export"
        params={{ from: "2026-01-01", franchise_id: "" }}
        fallbackFilename="Reporte_Ventas.xlsx"
      />,
    );
    fireEvent.click(screen.getByRole("button"));

    // Assert
    await waitFor(() =>
      expect(downloadFile).toHaveBeenCalledWith(
        "/api/reports/sales/export?from=2026-01-01",
        "Reporte_Ventas.xlsx",
      ),
    );
  });

  it("muestra una alerta de error si downloadFile falla", async () => {
    // Arrange
    (downloadFile as any).mockRejectedValue(new Error("Error 500"));

    // Act
    render(<ExportReportButton path="/api/reports/sales/export" params={{}} fallbackFilename="f.xlsx" />);
    fireEvent.click(screen.getByRole("button"));

    // Assert
    await waitFor(() => expect(alert.error).toHaveBeenCalled());
  });

  it("deshabilita el botón mientras exporta", async () => {
    // Arrange
    let resolveDownload: () => void = () => {};
    (downloadFile as any).mockReturnValue(new Promise<void>((res) => { resolveDownload = res; }));

    // Act
    render(<ExportReportButton path="/api/reports/sales/export" params={{}} fallbackFilename="f.xlsx" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Assert
    await waitFor(() => expect(button).toBeDisabled());
    resolveDownload();
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});
