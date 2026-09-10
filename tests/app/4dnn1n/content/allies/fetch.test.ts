import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllies,
  createAlly,
  updateAlly,
  deleteAlly,
  reorderAllies,
} from "@/app/4dnn1n/content/allies/fetch";
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

describe("content/allies/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Test for getAllies ────
  describe("getAllies", () => {
    it("llama apiFetch con /api/content-allies", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getAllies();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-allies");
    });

    it("usa clave de caché 'content-allies:all'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getAllies();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        "content-allies:all",
        TTL_CATALOG,
        expect.any(Function),
      );
    });

    it("retorna res.data cuando apiFetch resuelve aliados", async () => {
      // Arrange
      const mockAllies = [
        { id: 1, image: "a.jpg", image_filename: "a.jpg", url: "https://a.com", position: 1 },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockAllies });

      // Act
      const result = await getAllies();

      // Assert
      expect(result).toEqual(mockAllies);
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getAllies();

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ──── Step 2: Tests for createAlly (goes through global fetch, not apiFetch) ────
  describe("createAlly", () => {
    const mockAlly = {
      id: 1,
      image: "x.jpg",
      image_filename: "x.jpg",
      url: "https://a.com",
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
        return { ok: true, json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }) };
      });
      const formData = new FormData();

      // Act
      await createAlly(formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "fetch"]);
    });

    it("llama fetch con la URL, método y headers correctos", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      await createAlly(formData);

      // Assert
      expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/content-allies", {
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
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      await createAlly(formData);

      // Assert
      expect(apiFetch).not.toHaveBeenCalled();
    });

    it("retorna res.data cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      const result = await createAlly(formData);

      // Assert
      expect(result).toEqual(mockAlly);
    });

    it("invalida caché con prefijo 'content-allies:' cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      await createAlly(formData);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-allies:");
    });

    it("rechaza con el mensaje del cuerpo de la respuesta cuando la petición falla", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        json: vi.fn().mockResolvedValue({ message: "La imagen es obligatoria" }),
      });

      // Act & Assert
      await expect(createAlly(formData)).rejects.toThrow("La imagen es obligatoria");
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
      await expect(createAlly(formData)).rejects.toThrow("Error 500");
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
      await expect(createAlly(formData)).rejects.toThrow();

      // Assert
      expect(memCache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Test for updateAlly (appends _method: PUT, still POSTs) ────
  describe("updateAlly", () => {
    const mockAlly = {
      id: 3,
      image: "y.jpg",
      image_filename: "y.jpg",
      url: "https://b.com",
      position: 2,
    };

    it("agrega '_method: PUT' al FormData recibido", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      await updateAlly(3, formData);

      // Assert
      expect(formData.get("_method")).toBe("PUT");
    });

    it("sigue enviando un POST real a /api/content-allies/{id}", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      await updateAlly(3, formData);

      // Assert
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("http://localhost:8000/api/content-allies/3");
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
        return { ok: true, json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }) };
      });
      const formData = new FormData();

      // Act
      await updateAlly(3, formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "fetch"]);
    });

    it("retorna res.data e invalida caché con prefijo 'content-allies:'", async () => {
      // Arrange
      const formData = new FormData();
      fetchMock.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "ok", data: mockAlly }),
      });

      // Act
      const result = await updateAlly(3, formData);

      // Assert
      expect(result).toEqual(mockAlly);
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-allies:");
    });
  });

  // ──── Step 4: Tests for deleteAlly and reorderAllies (normal apiFetch pattern) ────
  describe("deleteAlly", () => {
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
      await deleteAlly(3);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("llama apiFetch con DELETE a /api/content-allies/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await deleteAlly(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-allies/3", { method: "DELETE" });
    });

    it("invalida caché con prefijo 'content-allies:'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await deleteAlly(3);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-allies:");
    });
  });

  describe("reorderAllies", () => {
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
      await reorderAllies(items);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("llama apiFetch con PUT a /api/content-allies/reorder y el body serializado", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await reorderAllies(items);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-allies/reorder", {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
    });

    it("invalida caché con prefijo 'content-allies:'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await reorderAllies(items);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-allies:");
    });
  });
});
