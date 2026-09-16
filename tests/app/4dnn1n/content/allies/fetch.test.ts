import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAllies,
  createAlly,
  updateAlly,
  deleteAlly,
  reorderAllies,
} from "@/app/4dnn1n/content/allies/fetch";
import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_CATALOG: 300000,
}));

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

  // ──── Step 2: Tests for createAlly (uses apiFetch, same client as the rest of the app) ────
  describe("createAlly", () => {
    const mockAlly = {
      id: 1,
      image: "x.jpg",
      image_filename: "x.jpg",
      url: "https://a.com",
      position: 1,
    };

    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { message: "ok", data: mockAlly };
      });
      const formData = new FormData();

      // Act
      await createAlly(formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("llama apiFetch con POST y el FormData como body", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

      // Act
      await createAlly(formData);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/content-allies", {
        method: "POST",
        body: formData,
      });
    });

    it("retorna res.data cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

      // Act
      const result = await createAlly(formData);

      // Assert
      expect(result).toEqual(mockAlly);
    });

    it("invalida caché con prefijo 'content-allies:' cuando la petición es exitosa", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

      // Act
      await createAlly(formData);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("content-allies:");
    });

    it("no invalida caché cuando apiFetch rechaza", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockRejectedValue(new Error("La imagen es obligatoria"));

      // Act
      await expect(createAlly(formData)).rejects.toThrow("La imagen es obligatoria");

      // Assert
      expect(memCache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Test for updateAlly (appends _method: PUT, still POSTs via apiFetch) ────
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
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

      // Act
      await updateAlly(3, formData);

      // Assert
      expect(formData.get("_method")).toBe("PUT");
    });

    it("sigue enviando un POST real a /api/content-allies/{id}", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

      // Act
      await updateAlly(3, formData);

      // Assert
      const [path, options] = (apiFetch as any).mock.calls[0];
      expect(path).toBe("/api/content-allies/3");
      expect(options.method).toBe("POST");
      expect(options.body.get("_method")).toBe("PUT");
    });

    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { message: "ok", data: mockAlly };
      });
      const formData = new FormData();

      // Act
      await updateAlly(3, formData);

      // Assert
      expect(callOrder).toEqual(["csrf", "apiFetch"]);
    });

    it("retorna res.data e invalida caché con prefijo 'content-allies:'", async () => {
      // Arrange
      const formData = new FormData();
      (apiFetch as any).mockResolvedValue({ message: "ok", data: mockAlly });

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
