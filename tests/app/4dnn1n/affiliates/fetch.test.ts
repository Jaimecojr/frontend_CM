import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAffiliates,
  getAffiliate,
  updateAffiliateState,
  getDepartments,
  getCitiesByDepartment,
  getActiveFranchises,
  getActiveCounselors,
  getActiveAgreements,
  checkAffiliateIdCard,
  createAffiliate,
  updateAffiliate,
  createRenovation,
  getExpiringToday,
  getAffiliateNotes,
  createAffiliateNote,
  deleteAffiliateNote,
  sendCarnet,
  markMembershipFormConverted,
} from "@/app/4dnn1n/affiliates/fetch";
import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG, TTL_LIST } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: {
    get: vi.fn((key, ttl, fn) => fn()),
    invalidatePrefix: vi.fn(),
  },
  TTL_GEO: 1800000,
  TTL_CATALOG: 300000,
  TTL_LIST: 120000,
}));

describe("affiliates/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getAffiliates ────
  describe("getAffiliates", () => {
    it("llama apiFetch sin query string cuando no hay params", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getAffiliates();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates");
      expect(result).toEqual({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
    });

    it("construye query string correcto con todos los parámetros", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 2, last_page: 5, per_page: 10, total: 42 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getAffiliates({ stade: "1", search: "juan", page: 2, per_page: 10 });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/affiliates?stade=1&search=juan&page=2&per_page=10"
      );
    });

    it("omite stade del query string cuando es 'all'", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getAffiliates({ stade: "all", search: "maria" });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates?search=maria");
    });

    it("retorna { data, meta } sin message de la respuesta API", async () => {
      // Arrange
      const mockResponse = {
        message: "Listado de afiliados",
        data: [{ id: 1, name: "Juan" }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getAffiliates();

      // Assert
      expect(result).toEqual({
        data: [{ id: 1, name: "Juan" }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      });
    });

    it("retorna { data: [] } cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined, meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });

      // Act
      const result = await getAffiliates();

      // Assert
      expect(result.data).toEqual([]);
    });

    it("genera claves de caché distintas para cada combinación de params", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });

      // Act
      await getAffiliates();
      await getAffiliates({ stade: "1" });
      await getAffiliates({ stade: "1", search: "juan" });

      // Assert
      expect(memCache.get).toHaveBeenCalledTimes(3);
      const calls = (memCache.get as any).mock.calls;
      expect(calls[0][0]).toBe("affiliates:list:");
      expect(calls[1][0]).toBe("affiliates:list:?stade=1");
      expect(calls[2][0]).toBe("affiliates:list:?stade=1&search=juan");
    });
  });

  // ──── Step 2: Tests for getAffiliate and updateAffiliateState ────
  describe("getAffiliate", () => {
    it("llama apiFetch con la URL correcta del affiliado", async () => {
      // Arrange
      const mockAffiliate = { id: 5, name: "Pedro", lastname: "Pérez" };
      (apiFetch as any).mockResolvedValue({ data: mockAffiliate });

      // Act
      const result = await getAffiliate(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5");
      expect(result).toEqual(mockAffiliate);
    });
  });

  describe("updateAffiliateState", () => {
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
      await updateAffiliateState(5, 2);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con método PATCH y body con stade", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await updateAffiliateState(5, 2);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5", {
        method: "PATCH",
        body: JSON.stringify({ stade: 2 }),
      });
    });

    it("invalida el prefijo de caché affiliates:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await updateAffiliateState(5, 1);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("affiliates:list:");
    });
  });

  // ──── Step 3: Tests for catalog helpers ────
  describe("getDepartments", () => {
    it("llama apiFetch con /api/departments", async () => {
      // Arrange
      const mockDepts = [{ id: 1, name: "Bogotá" }];
      (apiFetch as any).mockResolvedValue({ data: mockDepts });

      // Act
      const result = await getDepartments();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/departments");
      expect(result).toEqual(mockDepts);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getDepartments();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'departments'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getDepartments();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("departments", TTL_GEO, expect.any(Function));
    });
  });

  describe("getCitiesByDepartment", () => {
    it("llama apiFetch con /api/departments/{id}/cities", async () => {
      // Arrange
      const mockCities = [{ id: 1, name: "Bogotá" }];
      (apiFetch as any).mockResolvedValue({ data: mockCities });

      // Act
      const result = await getCitiesByDepartment(7);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/departments/7/cities");
      expect(result).toEqual(mockCities);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getCitiesByDepartment(7);

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'cities:{departmentId}'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCitiesByDepartment(7);

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("cities:7", TTL_GEO, expect.any(Function));
    });
  });

  describe("getActiveFranchises", () => {
    it("llama apiFetch con /api/users/active", async () => {
      // Arrange
      const mockFranchises = [{ id: 1, name: "Franquicia A" }];
      (apiFetch as any).mockResolvedValue({ data: mockFranchises });

      // Act
      const result = await getActiveFranchises();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/active");
      expect(result).toEqual(mockFranchises);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getActiveFranchises();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'franchises:active'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getActiveFranchises();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("franchises:active", TTL_CATALOG, expect.any(Function));
    });
  });

  describe("getActiveCounselors", () => {
    it("llama apiFetch con /api/counselors/active", async () => {
      // Arrange
      const mockCounselors = [{ id: 1, name: "Juan", lastname: "Pérez" }];
      (apiFetch as any).mockResolvedValue({ data: mockCounselors });

      // Act
      const result = await getActiveCounselors();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/active");
      expect(result).toEqual(mockCounselors);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getActiveCounselors();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'counselors:active'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getActiveCounselors();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("counselors:active", TTL_CATALOG, expect.any(Function));
    });
  });

  describe("getActiveAgreements", () => {
    it("llama apiFetch con /api/agreements/active", async () => {
      // Arrange
      const mockAgreements = [{ id: 1, name: "Plan A" }];
      (apiFetch as any).mockResolvedValue({ data: mockAgreements });

      // Act
      const result = await getActiveAgreements();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements/active");
      expect(result).toEqual(mockAgreements);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getActiveAgreements();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'agreements:active'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getActiveAgreements();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("agreements:active", TTL_CATALOG, expect.any(Function));
    });
  });

  // ──── Step 4: Tests for checkAffiliateIdCard ────
  describe("checkAffiliateIdCard", () => {
    it("llama apiFetch con id_card en query string", async () => {
      // Arrange
      const mockResponse = { exists: false };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await checkAffiliateIdCard("123");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/check-id-card?id_card=123");
    });

    it("incluye ignore_id en query string cuando se proporciona", async () => {
      // Arrange
      const mockResponse = { exists: false };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await checkAffiliateIdCard("123", 9);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/check-id-card?id_card=123&ignore_id=9");
    });

    it("retorna la respuesta de apiFetch sin transformación", async () => {
      // Arrange
      const mockResponse = { exists: true, message: "Ya existe" };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await checkAffiliateIdCard("456");

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

  // ──── Step 5: Tests for createAffiliate and updateAffiliate ────
  describe("createAffiliate", () => {
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
      const payload = { name: "Juan", lastname: "Pérez" } as any;

      // Act
      await createAffiliate(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/affiliates", async () => {
      // Arrange
      const payload = { name: "Juan", lastname: "Pérez" } as any;
      (apiFetch as any).mockResolvedValue({});

      // Act
      await createAffiliate(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché affiliates:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await createAffiliate({} as any);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("affiliates:list:");
    });
  });

  describe("updateAffiliate", () => {
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
      const payload = { name: "Juan" } as any;

      // Act
      await updateAffiliate(5, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/affiliates/{id}", async () => {
      // Arrange
      const payload = { name: "Juan" } as any;
      (apiFetch as any).mockResolvedValue({});

      // Act
      await updateAffiliate(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché affiliates:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await updateAffiliate(5, {} as any);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("affiliates:list:");
    });
  });

  // ──── Step 6: Tests for createRenovation and getExpiringToday ────
  describe("createRenovation", () => {
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
      const payload = { affiliate_id: 1, date_ini: "2025-01-01", date_end: "2026-01-01", date_payment: "2025-01-01", value: 10000 };

      // Act
      await createRenovation(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/renovations", async () => {
      // Arrange
      const payload = { affiliate_id: 1, date_ini: "2025-01-01", date_end: "2026-01-01", date_payment: "2025-01-01", value: 10000 };
      (apiFetch as any).mockResolvedValue({});

      // Act
      await createRenovation(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/renovations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("NO invalida caché (comportamiento actual)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await createRenovation({} as any);

      // Assert
      expect(memCache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });

  describe("getExpiringToday", () => {
    it("llama apiFetch con /api/affiliates/expiring-today", async () => {
      // Arrange
      const mockResponse = {
        message: "Affiliates expiring today",
        data: [{ id: 1, name: "Juan" }],
        date: "2025-01-28",
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getExpiringToday();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/expiring-today");
    });

    it("retorna { data, date } sin message", async () => {
      // Arrange
      const mockResponse = {
        message: "Affiliates expiring today",
        data: [{ id: 1, name: "Juan" }],
        date: "2025-01-28",
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getExpiringToday();

      // Assert
      expect(result).toEqual({
        data: [{ id: 1, name: "Juan" }],
        date: "2025-01-28",
      });
    });

    it("retorna { data: [] } cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined, date: "2025-01-28" });

      // Act
      const result = await getExpiringToday();

      // Assert
      expect(result.data).toEqual([]);
      expect(result.date).toBe("2025-01-28");
    });

    it("usa clave de caché 'affiliates:expiring-today'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [], date: "2025-01-28" });

      // Act
      await getExpiringToday();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("affiliates:expiring-today", TTL_LIST, expect.any(Function));
    });
  });

  // ──── Step 7: Tests for affiliate notes ────
  describe("getAffiliateNotes", () => {
    it("llama apiFetch con /api/affiliates/{id}/notes", async () => {
      // Arrange
      const mockNotes = [{ id: 1, body: "Nota" }];
      (apiFetch as any).mockResolvedValue({ data: mockNotes });

      // Act
      const result = await getAffiliateNotes(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5/notes");
      expect(result).toEqual(mockNotes);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getAffiliateNotes(5);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("createAffiliateNote", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: { id: 1, body: "Nota" } };
      });

      // Act
      await createAffiliateNote(5, "Nota");

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST y body { body }", async () => {
      // Arrange
      const mockNote = { id: 1, body: "Nueva nota", affiliate_id: 5 };
      (apiFetch as any).mockResolvedValue({ data: mockNote });

      // Act
      await createAffiliateNote(5, "Nueva nota");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5/notes", {
        method: "POST",
        body: JSON.stringify({ body: "Nueva nota" }),
      });
    });

    it("retorna res.data de la respuesta", async () => {
      // Arrange
      const mockNote = { id: 1, body: "Nueva nota", affiliate_id: 5 };
      (apiFetch as any).mockResolvedValue({ data: mockNote });

      // Act
      const result = await createAffiliateNote(5, "Nueva nota");

      // Assert
      expect(result).toEqual(mockNote);
    });
  });

  describe("deleteAffiliateNote", () => {
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
      await deleteAffiliateNote(5, 9);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/affiliates/{id}/notes/{noteId}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteAffiliateNote(5, 9);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5/notes/9", {
        method: "DELETE",
      });
    });
  });

  // ──── Step 8: Tests for sendCarnet and markMembershipFormConverted ────
  describe("sendCarnet", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { message: "Enviado" };
      });

      // Act
      await sendCarnet(5);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/affiliates/{id}/carnet", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ message: "Enviado" });

      // Act
      await sendCarnet(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/5/carnet", {
        method: "POST",
      });
    });

    it("retorna la respuesta de apiFetch sin transformación", async () => {
      // Arrange
      const mockResponse = { message: "Carnet enviado", data: { whatsapp: { enviado: true } } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await sendCarnet(5);

      // Assert
      expect(result).toEqual(mockResponse);
    });
  });

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
      expect(apiFetch).toHaveBeenCalledWith("/api/membership-forms/5/convert", {
        method: "PATCH",
      });
    });

    it("invalida caché membership-forms:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await markMembershipFormConverted(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("membership-forms:list:");
    });
  });
});
