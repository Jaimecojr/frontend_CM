import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getContacts,
  getContact,
  deleteContact,
  type ApiContact,
} from "@/app/4dnn1n/contacts/fetch";
import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_LIST } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_LIST: 120000,
}));

describe("contacts/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getContacts ────
  describe("getContacts", () => {
    it("llama apiFetch con /api/contacts cuando no hay params", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getContacts();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/contacts");
      expect(result).toEqual({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      });
    });

    it("construye query string correcto con todos los parámetros", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getContacts({
        search: "ana",
        page: 1,
        per_page: 20,
      });

      // Assert
      const callUrl = (apiFetch as any).mock.calls[0][0];
      expect(callUrl).toContain("search=ana");
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("per_page=20");
      expect(callUrl).toEqual(
        expect.stringMatching(/^\/api\/contacts\?/)
      );
    });

    it("no declara ni agraga parámetro stade (a diferencia de membership-forms)", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getContacts({ search: "test" });

      // Assert
      const callUrl = (apiFetch as any).mock.calls[0][0];
      expect(callUrl).not.toContain("stade");
    });

    it("retorna { data, meta } correctamente", async () => {
      // Arrange
      const mockContact: ApiContact = {
        id: 1,
        name: "Juan Pérez",
        email: "juan@example.com",
        phone: "3001234567",
        city_id: 1,
        subject: "Consulta",
        comment: "Tengo una pregunta",
        created_at: "2025-01-01T10:00:00Z",
        updated_at: "2025-01-01T10:00:00Z",
        city: { id: 1, name: "Bogotá" },
      };
      const mockResponse = {
        data: [mockContact],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 35 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getContacts();

      // Assert
      expect(result).toEqual({
        data: [mockContact],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 35 },
      });
    });

    it("retorna fallback de data cuando backend no envía data", async () => {
      // Arrange
      const mockResponse = {
        data: undefined,
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getContacts();

      // Assert
      expect(result.data).toEqual([]);
    });

    it("genera claves de caché distintas para cada combinación de params", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getContacts();
      await getContacts({ search: "ana" });
      await getContacts({ search: "ana", page: 1, per_page: 20 });

      // Assert
      expect(memCache.get).toHaveBeenCalledTimes(3);
      const calls = (memCache.get as any).mock.calls;
      // Cache keys should be different for different params
      expect(calls[0][0]).toEqual("contacts:list:");
      expect(calls[1][0]).toEqual("contacts:list:?search=ana");
      expect(calls[2][0]).toEqual("contacts:list:?search=ana&page=1&per_page=20");
      expect(calls[0][0]).not.toBe(calls[1][0]);
      expect(calls[1][0]).not.toBe(calls[2][0]);
    });

    it("pasa TTL_LIST al memCache.get", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getContacts();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        expect.any(String),
        TTL_LIST,
        expect.any(Function)
      );
    });
  });

  // ──── Step 2: Tests for getContact ────
  describe("getContact", () => {
    it("llama apiFetch con /api/contacts/{id}", async () => {
      // Arrange
      const mockContact: ApiContact = {
        id: 5,
        name: "Carlos López",
        email: "carlos@example.com",
        phone: "3009876543",
        city_id: 2,
        subject: "Solicitud",
        comment: "Me gustaría saber más",
        created_at: "2025-02-01T14:30:00Z",
        updated_at: "2025-02-01T14:30:00Z",
        city: { id: 2, name: "Medellín" },
      };
      (apiFetch as any).mockResolvedValue({ data: mockContact });

      // Act
      const result = await getContact(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/contacts/5");
      expect(result).toEqual(mockContact);
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockContact: ApiContact = {
        id: 10,
        name: "María García",
        email: "maria@example.com",
        phone: "3011111111",
        city_id: 3,
        subject: "Comentario",
        comment: "Excelente servicio",
        created_at: "2025-03-01T09:15:00Z",
        updated_at: "2025-03-01T09:15:00Z",
        city: { id: 3, name: "Cali" },
      };
      (apiFetch as any).mockResolvedValue({ data: mockContact });

      // Act
      const result = await getContact(10);

      // Assert
      expect(result).toEqual(mockContact);
    });

    it("no utiliza memCache para getContact", async () => {
      // Arrange
      const mockContact: ApiContact = {
        id: 5,
        name: "Carlos López",
        email: "carlos@example.com",
        phone: "3009876543",
        city_id: 2,
        subject: "Solicitud",
        comment: "Me gustaría saber más",
        created_at: "2025-02-01T14:30:00Z",
        updated_at: "2025-02-01T14:30:00Z",
        city: { id: 2, name: "Medellín" },
      };
      (apiFetch as any).mockResolvedValue({ data: mockContact });

      // Act
      await getContact(5);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Tests for deleteContact ────
  describe("deleteContact", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return {};
      });

      // Act
      await deleteContact(5);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/contacts/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteContact(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/contacts/5", {
        method: "DELETE",
      });
    });

    it("invalida prefix contacts:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteContact(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "contacts:list:"
      );
    });

    it("no retorna valor significativo (Promise<void>)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      const result = await deleteContact(5);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
