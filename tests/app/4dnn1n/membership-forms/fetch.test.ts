import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMembershipForms,
  getMembershipForm,
  deleteMembershipForm,
  markMembershipFormConverted,
  type ApiMembershipForm,
} from "@/app/4dnn1n/membership-forms/fetch";
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

describe("membership-forms/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getMembershipForms ────
  describe("getMembershipForms", () => {
    it("llama apiFetch con /api/membership-forms cuando no hay params", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getMembershipForms();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/membership-forms");
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
      await getMembershipForms({
        search: "juan",
        page: 2,
        per_page: 10,
      });

      // Assert
      const callUrl = (apiFetch as any).mock.calls[0][0];
      expect(callUrl).toContain("search=juan");
      expect(callUrl).toContain("page=2");
      expect(callUrl).toContain("per_page=10");
      expect(callUrl).toEqual(
        expect.stringMatching(/^\/api\/membership-forms\?/)
      );
    });

    it("parámetro stade declarado pero no afecta la URL (comportamiento verificado)", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act - primer call sin params
      await getMembershipForms();
      const urlSinParams = (apiFetch as any).mock.calls[0][0];

      // Reset mock
      vi.clearAllMocks();
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act - segundo call solo con stade
      await getMembershipForms({ stade: "1" });
      const urlConStade = (apiFetch as any).mock.calls[0][0];

      // Assert
      expect(urlSinParams).toBe("/api/membership-forms");
      expect(urlConStade).toBe("/api/membership-forms");
      expect(urlSinParams).toEqual(urlConStade);
    });

    it("no agrega stade al query string aunque esté presente en params", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getMembershipForms({ stade: "1", search: "carlos" });

      // Assert
      const callUrl = (apiFetch as any).mock.calls[0][0];
      expect(callUrl).not.toContain("stade");
      expect(callUrl).toContain("search=carlos");
    });

    it("retorna { data, meta } correctamente", async () => {
      // Arrange
      const mockForm: ApiMembershipForm = {
        id: 1,
        name: "Juan",
        lastname: "Pérez",
        id_card: "1234567890",
        phone: "3001234567",
        email: "juan@example.com",
        address: "Calle 1",
        city_id: 1,
        date: "2025-01-01",
        seller: "Asesor 1",
        state: 0,
      };
      const mockResponse = {
        data: [mockForm],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 35 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getMembershipForms();

      // Assert
      expect(result).toEqual({
        data: [mockForm],
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
      const result = await getMembershipForms();

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
      await getMembershipForms();
      await getMembershipForms({ search: "juan" });
      await getMembershipForms({ search: "juan", page: 2 });

      // Assert
      expect(memCache.get).toHaveBeenCalledTimes(3);
      const calls = (memCache.get as any).mock.calls;
      // Cache keys should be different for different params
      expect(calls[0][0]).toEqual("membership-forms:list:");
      expect(calls[1][0]).toEqual("membership-forms:list:?search=juan");
      expect(calls[2][0]).toEqual("membership-forms:list:?search=juan&page=2");
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
      await getMembershipForms();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        expect.any(String),
        TTL_LIST,
        expect.any(Function)
      );
    });
  });

  // ──── Step 2: Tests for getMembershipForm ────
  describe("getMembershipForm", () => {
    it("llama apiFetch con /api/membership-forms/{id}", async () => {
      // Arrange
      const mockForm: ApiMembershipForm = {
        id: 5,
        name: "Carlos",
        lastname: "López",
        id_card: "9876543210",
        phone: "3009876543",
        email: "carlos@example.com",
        address: "Calle 2",
        city_id: 2,
        date: "2025-02-01",
        seller: "Asesor 2",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockForm });

      // Act
      const result = await getMembershipForm(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/membership-forms/5");
      expect(result).toEqual(mockForm);
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockForm: ApiMembershipForm = {
        id: 10,
        name: "María",
        lastname: "García",
        id_card: "1111111111",
        phone: "3011111111",
        email: "maria@example.com",
        address: "Calle 3",
        city_id: 3,
        date: "2025-03-01",
        seller: "Asesor 3",
        state: 0,
      };
      (apiFetch as any).mockResolvedValue({ data: mockForm });

      // Act
      const result = await getMembershipForm(10);

      // Assert
      expect(result).toEqual(mockForm);
    });

    it("no utiliza memCache para getMembershipForm", async () => {
      // Arrange
      const mockForm: ApiMembershipForm = {
        id: 5,
        name: "Carlos",
        lastname: "López",
        id_card: "9876543210",
        phone: "3009876543",
        email: "carlos@example.com",
        address: "Calle 2",
        city_id: 2,
        date: "2025-02-01",
        seller: "Asesor 2",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockForm });

      // Act
      await getMembershipForm(5);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Tests for deleteMembershipForm ────
  describe("deleteMembershipForm", () => {
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
      await deleteMembershipForm(5);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/membership-forms/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteMembershipForm(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/membership-forms/5", {
        method: "DELETE",
      });
    });

    it("invalida prefix membership-forms:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteMembershipForm(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "membership-forms:list:"
      );
    });

    it("no retorna valor significativo (Promise<void>)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      const result = await deleteMembershipForm(5);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ──── Step 4: Tests for markMembershipFormConverted ────
  describe("markMembershipFormConverted", () => {
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
      await markMembershipFormConverted(5);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/membership-forms/{id}/convert", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await markMembershipFormConverted(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/membership-forms/5/convert",
        {
          method: "PATCH",
        }
      );
    });

    it("invalida prefix membership-forms:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await markMembershipFormConverted(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "membership-forms:list:"
      );
    });

    it("no retorna valor significativo (Promise<void>)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      const result = await markMembershipFormConverted(5);

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
