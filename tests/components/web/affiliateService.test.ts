import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Minimal Response stand-in for global.fetch mocks: checkAffiliateStatus only
// reads `ok` and `json()` off the resolved value, so this single cast is the
// mock's own, not a general `any`.
function mockResponse(init: { ok: boolean; json: () => Promise<unknown> }): Response {
  return init as unknown as Response;
}

describe("checkAffiliateStatus", () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
  let csrfMock: ReturnType<typeof vi.fn>;
  let getXsrfTokenMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let checkAffiliateStatus: typeof import("@/components/web/affiliateService").checkAffiliateStatus;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    // Reset modules to get fresh state for each test so cached state
    // (like console.error spy) doesn't leak between tests.
    vi.resetModules();

    fetchMock = vi.fn<typeof fetch>();
    csrfMock = vi.fn();
    getXsrfTokenMock = vi.fn().mockReturnValue("mock-xsrf-token");
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    global.fetch = fetchMock;

    // Mock the api module before importing affiliateService
    vi.doMock("@/lib/api", () => ({
      csrf: csrfMock,
      getXsrfToken: getXsrfTokenMock,
    }));

    // Import after mocking dependencies
    const module = await import("@/components/web/affiliateService");
    checkAffiliateStatus = module.checkAffiliateStatus;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleErrorSpy.mockRestore();
  });

  describe("camino exitoso", () => {
    it("llama csrf() antes de fetch y retorna la respuesta sin transformar cuando es exitosa", async () => {
      // Arrange
      const mockData = {
        success: true,
        message: "Encontrado",
        data: {
          name: "Juan",
          lastname: "Pérez",
          id_card: "12345678",
          stade: 1,
          validity_end: "2026-12-31",
          beneficiaries: [{ name: "María" }],
        },
      };

      csrfMock.mockResolvedValue(undefined);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: async () => mockData,
        })
      );

      // Act
      const result = await checkAffiliateStatus("12345678");

      // Assert
      expect(csrfMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("/api/public/affiliate-status");
      expect((init as RequestInit).method).toBe("POST");
      expect((init as RequestInit).credentials).toBe("include");
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["Accept"]).toBe("application/json");
      expect(headers["X-XSRF-TOKEN"]).toBe("mock-xsrf-token");
      expect(String((init as RequestInit).body)).toBe(JSON.stringify({ document_number: "12345678" }));
      expect(result).toEqual(mockData);
    });
  });

  describe("caminos de error", () => {
    it("retorna success:false con el mensaje cuando fetch resuelve ok:false y el cuerpo tiene message", async () => {
      // Arrange
      csrfMock.mockResolvedValue(undefined);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          json: async () => ({ message: "No encontrado" }),
        })
      );

      // Act
      const result = await checkAffiliateStatus("99999999");

      // Assert
      expect(result).toEqual({
        success: false,
        message: "No encontrado",
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("retorna success:false con mensaje por defecto cuando fetch resuelve ok:false sin message en el cuerpo", async () => {
      // Arrange
      csrfMock.mockResolvedValue(undefined);
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          ok: false,
          json: async () => ({}),
        })
      );

      // Act
      const result = await checkAffiliateStatus("88888888");

      // Assert
      expect(result).toEqual({
        success: false,
        message: "No se pudo consultar el estado. Intente nuevamente.",
      });
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("retorna success:false con mensaje de error de red cuando fetch rechaza", async () => {
      // Arrange
      csrfMock.mockResolvedValue(undefined);
      const networkError = new Error("Network timeout");
      fetchMock.mockRejectedValueOnce(networkError);

      // Act
      const result = await checkAffiliateStatus("77777777");

      // Assert
      expect(result).toEqual({
        success: false,
        message: "Ocurrió un error al consultar. Intente nuevamente.",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking affiliate status:", networkError);
    });

    it("retorna success:false con mensaje de error cuando csrf() rechaza", async () => {
      // Arrange
      const csrfError = new Error("CSRF cookie fetch failed");
      csrfMock.mockRejectedValue(csrfError);

      // Act
      const result = await checkAffiliateStatus("66666666");

      // Assert
      expect(result).toEqual({
        success: false,
        message: "Ocurrió un error al consultar. Intente nuevamente.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error checking affiliate status:", csrfError);
    });
  });
});
