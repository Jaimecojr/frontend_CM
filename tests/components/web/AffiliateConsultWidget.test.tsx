import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AffiliateConsultWidget } from "@/components/web/AffiliateConsultWidget";
import { checkAffiliateStatus, AffiliateStatusResponse } from "@/components/web/affiliateService";

// This widget only calls checkAffiliateStatus() and hands the result to
// AffiliateStatusModal (rendered for real here — its own behavior is covered
// in AffiliateStatusModal.test.tsx) — so only the service needs mocking.
vi.mock("@/components/web/affiliateService", () => ({
  checkAffiliateStatus: vi.fn(),
}));

const checkAffiliateStatusMock = vi.mocked(checkAffiliateStatus);

describe("AffiliateConsultWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Guard against a test leaving the modal's scroll-lock side effect
    // active, which would otherwise leak into unrelated test files.
    document.body.style.overflow = "";
  });

  describe("Tipo de Documento", () => {
    it("muestra el select deshabilitado, fijo en Cédula de Ciudadanía (CC)", () => {
      // Arrange & Act
      render(<AffiliateConsultWidget />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;

      // Assert: intentional current behavior — no other document type is supported yet
      expect(select).toBeDisabled();
      expect(select.value).toBe("CC");
    });
  });

  describe("filtrado del número de documento", () => {
    it("conserva solo los dígitos al escribir texto con caracteres no numéricos", () => {
      // Arrange
      render(<AffiliateConsultWidget />);
      const input = screen.getByPlaceholderText("Ej. 1023456789") as HTMLInputElement;

      // Act
      fireEvent.change(input, { target: { value: "10a2-3b456" } });

      // Assert
      expect(input.value).toBe("1023456");
    });
  });

  describe("habilitación del botón de envío", () => {
    it("deshabilita 'Consultar Estado' cuando el documento está vacío", () => {
      // Arrange & Act
      render(<AffiliateConsultWidget />);

      // Assert
      expect(screen.getByRole("button", { name: "Consultar Estado" })).toBeDisabled();
    });

    it("habilita 'Consultar Estado' apenas hay al menos un dígito", () => {
      // Arrange
      render(<AffiliateConsultWidget />);
      const input = screen.getByPlaceholderText("Ej. 1023456789");

      // Act
      fireEvent.change(input, { target: { value: "1" } });

      // Assert
      expect(screen.getByRole("button", { name: "Consultar Estado" })).not.toBeDisabled();
    });
  });

  describe("envío y estado pendiente", () => {
    it("llama a checkAffiliateStatus con el número de documento y muestra 'Consultando...' deshabilitado mientras está pendiente", async () => {
      // Arrange
      let resolvePending: (value: AffiliateStatusResponse) => void = () => {};
      const pending = new Promise<AffiliateStatusResponse>((resolve) => {
        resolvePending = resolve;
      });
      checkAffiliateStatusMock.mockReturnValue(pending);

      render(<AffiliateConsultWidget />);
      const input = screen.getByPlaceholderText("Ej. 1023456789");
      fireEvent.change(input, { target: { value: "12345678" } });

      // Act
      fireEvent.click(screen.getByRole("button", { name: "Consultar Estado" }));

      // Assert: called with the filtered document number, pending UI shown
      expect(checkAffiliateStatusMock).toHaveBeenCalledWith("12345678");
      const pendingButton = await screen.findByRole("button", { name: "Consultando..." });
      expect(pendingButton).toBeDisabled();

      // Cleanup: resolve so the pending promise doesn't leak into the next test
      resolvePending({ success: false, message: "No encontrado" });
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Consultar Estado" })).toBeInTheDocument();
      });
    });
  });

  describe("modal de resultado", () => {
    it("renderiza AffiliateStatusModal con el resultado tras resolver, y al cerrarlo el resultado vuelve a null", async () => {
      // Arrange
      checkAffiliateStatusMock.mockResolvedValue({
        success: false,
        message: "Documento no encontrado",
      });

      render(<AffiliateConsultWidget />);
      const input = screen.getByPlaceholderText("Ej. 1023456789");
      fireEvent.change(input, { target: { value: "99999999" } });

      // Act: submit and wait for the modal to appear with the resolved result
      fireEvent.click(screen.getByRole("button", { name: "Consultar Estado" }));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Documento no encontrado")).toBeInTheDocument();

      // Act: close the modal via its header close button
      fireEvent.click(screen.getByLabelText("Cerrar"));

      // Assert: modal unmounts (result state reset to null)
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });
});
