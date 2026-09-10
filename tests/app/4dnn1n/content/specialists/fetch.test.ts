import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSpecialists,
  createSpecialist,
  updateSpecialist,
  deleteSpecialist,
  reorderSpecialists,
} from "@/app/4dnn1n/content/specialists/fetch";
import { apiFetch, csrf, getXsrfToken } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
  getXsrfToken: vi.fn(() => "test-xsrf-token"),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_CATALOG: 300000,
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("content/specialists/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Test for getSpecialists ────
  describe("getSpecialists", () => {
    it("llama apiFetch con /api/content-specialists", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getSpecialists();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-specialists");
    });

    it("usa clave de caché 'content-specialists:all'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getSpecialists();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        "content-specialists:all",
        TTL_CATALOG,
        expect.any(Function),
      );
    });

    it("retorna res.data cuando apiFetch resuelve especialistas", async () => {
      // Arrange
      const mockSpecialists = [
        {
          id: 1,
          name: "Dr. Smith",
          specialty: "Cardiología",
          photo: "photo.jpg",
          photo_filename: "photo.jpg",
          position: 1,
        },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockSpecialists });

      // Act
      const result = await getSpecialists();

      // Assert
      expect(result).toEqual(mockSpecialists);
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getSpecialists();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ──── Step 2: Tests for createSpecialist (goes through global fetch, not apiFetch) ────
  describe("createSpecialist", () => {
    const mockSpecialist = {
      id: 1,
      name: "Dr. Smith",
      specialty: "Cardiología",
      photo: "photo.jpg",
      photo_filename: "photo.jpg",
      position: 1,
    };

    it("llama csrf antes que fetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      fetchMock.mockImplementation(async () => {
        callOrder.push("fetch");
        return { ok: true, json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }) };
      });
      const formData = new FormData();

      // Act
      await createSpecialist(formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "fetch"]);
    });

    it("llama fetch con la URL, método y headers correctos", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      await createSpecialist(formData);

      // Assert
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/content-specialists", {
        method: "POST",
        credentials: "include",
        body: formData,
        headers: {
          Accept: "application/json",
          "X-XSRF-TOKEN": "test-xsrf-token",
        },
      });
      expect(getXsrfToken).toHaveBeenCalled();
    });

    it("nunca llama apiFetch en este flujo", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      await createSpecialist(formData);

      // Assert
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("retorna res.data cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      const result = await createSpecialist(formData);

      // Assert
      expect(result).toEqual(mockSpecialist);
    });

    it("invalida caché con prefijo 'content-specialists:' cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      await createSpecialist(formData);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-specialists:");
    });

    it("rechaza con el mensaje del cuerpo de la respuesta cuando la petición falla", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({ message: "La foto es obligatoria" }),
      });

      // Act & Assert
      await expect(createSpecialist(formData)).rejects.toThrow("La foto es obligatoria");
    });

    it("rechaza con el fallback 'Error {status}' cuando el cuerpo no trae mensaje", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      });

      // Act & Assert
      await expect(createSpecialist(formData)).rejects.toThrow("Error 500");
    });

    it("no invalida caché cuando la petición falla", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      });

      // Act
      await expect(createSpecialist(formData)).rejects.toThrow();

      // Assert
      expect(memCache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Test for updateSpecialist (appends _method: PUT, still POSTs) ────
  describe("updateSpecialist", () => {
    const mockSpecialist = {
      id: 3,
      name: "Dr. Johnson",
      specialty: "Neurocirugía",
      photo: "photo2.jpg",
      photo_filename: "photo2.jpg",
      position: 2,
    };

    it("agrega '_method: PUT' al FormData recibido", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      await updateSpecialist(3, formData);

      // Assert
      expect(formData.get("_method")).toBe("PUT");
    });

    it("sigue enviando un POST real a /api/content-specialists/{id}", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      await updateSpecialist(3, formData);

      // Assert
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:8000/api/content-specialists/3");
      expect(options.method).toBe("POST");
      expect(options.body.get("_method")).toBe("PUT");
    });

    it("llama csrf antes que fetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      fetchMock.mockImplementation(async () => {
        callOrder.push("fetch");
        return { ok: true, json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }) };
      });
      const formData = new FormData();

      // Act
      await updateSpecialist(3, formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "fetch"]);
    });

    it("retorna res.data e invalida caché con prefijo 'content-specialists:'", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockSpecialist }),
      });

      // Act
      const result = await updateSpecialist(3, formData);

      // Assert
      expect(result).toEqual(mockSpecialist);
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-specialists:");
    });
  });

  // ──── Step 4: Tests for deleteSpecialist and reorderSpecialists (normal apiFetch pattern) ────
  describe("deleteSpecialist", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return undefined;
      });

      // Act
      await deleteSpecialist(3);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("llama apiFetch con DELETE a /api/content-specialists/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await deleteSpecialist(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-specialists/3", { method: "DELETE" });
    });

    it("invalida caché con prefijo 'content-specialists:'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await deleteSpecialist(3);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-specialists:");
    });
  });

  describe("reorderSpecialists", () => {
    const items = [
      { id: 1, position: 2 },
      { id: 2, position: 1 },
    ];

    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return undefined;
      });

      // Act
      await reorderSpecialists(items);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("llama apiFetch con PUT a /api/content-specialists/reorder y el body serializado", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await reorderSpecialists(items);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-specialists/reorder", {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
    });

    it("invalida caché con prefijo 'content-specialists:'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await reorderSpecialists(items);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-specialists:");
    });
  });
});
