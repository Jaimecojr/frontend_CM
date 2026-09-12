import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AlliesSection } from "@/components/web/AlliesSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function mockResponse(ok: boolean, data: unknown): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe("AlliesSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Paso 1: Test con datos", () => {
    it("renderiza un link con href/target correctos y la imagen apuntando a API_URL/storage/{image}", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(
        mockResponse(true, {
          data: [{ id: 1, image: "logo1.png", url: "https://aliado.com", position: 1 }],
        })
      );

      // Act
      const jsx = await AlliesSection();
      render(jsx);

      // Assert
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "https://aliado.com");
      expect(link).toHaveAttribute("target", "_blank");

      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", `${API_URL}/storage/logo1.png`);
    });
  });

  describe("Paso 2: Test de los caminos vacíos", () => {
    it("retorna null cuando el fetch resuelve con data vacío", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(mockResponse(true, { data: [] }));

      // Act
      const jsx = await AlliesSection();

      // Assert
      expect(jsx).toBeNull();
      render(jsx);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("retorna null cuando el fetch resuelve con ok:false", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(mockResponse(false, {}));

      // Act
      const jsx = await AlliesSection();

      // Assert
      expect(jsx).toBeNull();
    });

    it("retorna null cuando el fetch rechaza (error de red)", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

      // Act
      const jsx = await AlliesSection();

      // Assert
      expect(jsx).toBeNull();
    });
  });
});
