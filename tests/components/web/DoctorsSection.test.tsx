import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DoctorsSection } from "@/components/web/DoctorsSection";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function mockResponse(ok: boolean, data: unknown): Response {
  return {
    ok,
    json: async () => data,
  } as Response;
}

describe("DoctorsSection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Paso 1: Test con datos", () => {
    it("renderiza el nombre, la especialidad y la imagen apuntando a API_URL/storage/{photo}", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(
        mockResponse(true, {
          data: [{ id: 1, name: "Dra. Ana Ruiz", specialty: "Pediatría", photo: "ana.jpg", position: 1 }],
        })
      );

      // Act
      const jsx = await DoctorsSection();
      render(jsx);

      // Assert
      expect(screen.getByText("Dra. Ana Ruiz")).toBeInTheDocument();
      expect(screen.getByText("Pediatría")).toBeInTheDocument();

      const img = screen.getByRole("img", { name: "Dra. Ana Ruiz" });
      expect(img).toHaveAttribute("src", `${API_URL}/storage/ana.jpg`);
    });
  });

  describe("Paso 2: Test de los caminos vacíos", () => {
    it("retorna null cuando el fetch resuelve con data vacío", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(mockResponse(true, { data: [] }));

      // Act
      const jsx = await DoctorsSection();

      // Assert
      expect(jsx).toBeNull();
      render(jsx);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("retorna null cuando el fetch resuelve con ok:false", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue(mockResponse(false, {}));

      // Act
      const jsx = await DoctorsSection();

      // Assert
      expect(jsx).toBeNull();
    });

    it("retorna null cuando el fetch rechaza (error de red)", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

      // Act
      const jsx = await DoctorsSection();

      // Assert
      expect(jsx).toBeNull();
    });
  });
});
