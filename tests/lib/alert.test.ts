import { describe, expect, it, vi, beforeEach } from "vitest";
import { alert } from "@/lib/alert";

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
    isLoading: vi.fn(() => false),
    close: vi.fn(),
  },
}));

describe("alert", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const Swal = await import("sweetalert2");
    // Reset fire to basic resolved value for new tests
    (Swal.default.fire as any).mockResolvedValue({ isConfirmed: true });
  });

  describe("success", () => {
    it("llama a Swal.fire con icon success, título y texto provistos", async () => {
      // Arrange
      const Swal = await import("sweetalert2");
      const fireMock = Swal.default.fire as any;

      // Act
      await alert.success("Listo", "texto");

      // Assert
      expect(fireMock).toHaveBeenCalled();
      const callArgs = fireMock.mock.calls[0][0];
      expect(callArgs.icon).toBe("success");
      expect(callArgs.title).toBe("Listo");
      expect(callArgs.text).toBe("texto");
      expect(callArgs.confirmButtonText).toBe("Aceptar");
    });
  });

  describe("error", () => {
    it("usa defaults (title: Ups) cuando no se pasan argumentos", async () => {
      // Arrange
      const Swal = await import("sweetalert2");
      const fireMock = Swal.default.fire as any;

      // Act
      await alert.error();

      // Assert
      expect(fireMock).toHaveBeenCalled();
      const callArgs = fireMock.mock.calls[0][0];
      expect(callArgs.icon).toBe("error");
      expect(callArgs.title).toBe("Ups");
    });
  });

  describe("confirm", () => {
    it("sin onConfirm retorna res.isConfirmed", async () => {
      // Arrange
      const Swal = await import("sweetalert2");
      const fireMock = Swal.default.fire as any;
      fireMock.mockResolvedValue({ isConfirmed: true });

      // Act
      const result = await alert.confirm();

      // Assert
      expect(result).toBe(true);
    });

    it("con onConfirm resuelto normalmente, invoca onConfirm en preConfirm y retorna true", async () => {
      // Arrange
      const Swal = await import("sweetalert2");
      const fireMock = Swal.default.fire as any;
      const onConfirmMock = vi.fn().mockResolvedValue(undefined);

      // Mock fire to call preConfirm if provided
      fireMock.mockImplementation(async (opts: any) => {
        if (opts.preConfirm) {
          await opts.preConfirm();
        }
        return { isConfirmed: true };
      });

      // Act
      const result = await alert.confirm({ onConfirm: onConfirmMock });

      // Assert
      expect(onConfirmMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("con onConfirm rechazado, relanza el error después de cerrar", async () => {
      // Arrange
      const Swal = await import("sweetalert2");
      const fireMock = Swal.default.fire as any;
      const closeMock = Swal.default.close as any;
      const testError = new Error("fallo");
      const onConfirmMock = vi.fn().mockRejectedValue(testError);

      // Mock fire to call preConfirm if provided
      fireMock.mockImplementation(async (opts: any) => {
        if (opts.preConfirm) {
          try {
            await opts.preConfirm();
          } catch (e) {
            // preConfirm throws, but we still return normally
          }
        }
        return { isConfirmed: false };
      });

      // Act & Assert
      await expect(alert.confirm({ onConfirm: onConfirmMock })).rejects.toThrow(
        testError
      );
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
