import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAgreements,
  getAgreement,
  getDepartments,
  getCitiesByDepartment,
  createAgreement,
  updateAgreement,
  updateAgreementState,
} from "@/app/4dnn1n/agreements/fetch";
import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_GEO, TTL_CATALOG } from "@/lib/memCache";

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
}));

describe("agreements/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getAgreements ────
  describe("getAgreements", () => {
    it("llama apiFetch con /api/agreements sin query string", async () => {
      // Arrange
      const mockResponse = { data: [] };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getAgreements();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements");
      expect(result).toEqual([]);
    });

    it("retorna array de acuerdos cuando apiFetch resuelve datos", async () => {
      // Arrange
      const mockAgreements = [
        { id: 1, name: "Convenio A", amount: 50000, state: 1, city_id: 3 },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockAgreements });

      // Act
      const result = await getAgreements();

      // Assert
      expect(result).toEqual(mockAgreements);
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getAgreements();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'agreements:all'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getAgreements();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("agreements:all", TTL_CATALOG, expect.any(Function));
    });
  });

  // ──── Step 2: Tests for getAgreement ────
  describe("getAgreement", () => {
    it("llama apiFetch con /api/agreements/{id}", async () => {
      // Arrange
      const mockAgreement = { id: 5, name: "Convenio A", amount: 50000, state: 1, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: mockAgreement });

      // Act
      const result = await getAgreement(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements/5");
      expect(result).toEqual(mockAgreement);
    });

    it("retorna res.data sin cacheo", async () => {
      // Arrange
      const mockAgreement = { id: 5, name: "Convenio B", amount: 60000, state: 0, city_id: 5 };
      (apiFetch as any).mockResolvedValue({ data: mockAgreement });

      // Act
      const result = await getAgreement(5);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockAgreement);
    });
  });

  // ──── Step 3: Tests for getDepartments and getCitiesByDepartment ────
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

    it("usa clave de caché 'departments' con TTL_GEO", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getDepartments();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("departments", TTL_GEO, expect.any(Function));
    });
  });

  describe("getCitiesByDepartment", () => {
    it("llama apiFetch con /api/departments/{departmentId}/cities", async () => {
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

    it("usa clave de caché 'cities:{departmentId}' con TTL_GEO", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCitiesByDepartment(7);

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("cities:7", TTL_GEO, expect.any(Function));
    });

    it("genera claves de caché distintas para departamentos diferentes", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCitiesByDepartment(7);
      await getCitiesByDepartment(15);

      // Assert
      const calls = (memCache.get as any).mock.calls;
      expect(calls[0][0]).toBe("cities:7");
      expect(calls[1][0]).toBe("cities:15");
    });
  });

  // ──── Step 4: Tests for createAgreement and updateAgreement ────
  describe("createAgreement", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: {} };
      });
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };

      // Act
      await createAgreement(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/agreements", async () => {
      // Arrange
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createAgreement(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché con prefijo 'agreements:'", async () => {
      // Arrange
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createAgreement(payload);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("agreements:");
    });
  });

  describe("updateAgreement", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: {} };
      });
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };

      // Act
      await updateAgreement(5, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PUT a /api/agreements/{id}", async () => {
      // Arrange
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreement(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements/5", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché con prefijo 'agreements:'", async () => {
      // Arrange
      const payload = { name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreement(5, payload);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("agreements:");
    });
  });

  // ──── Step 5: Tests for updateAgreementState ────
  describe("updateAgreementState", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: {} };
      });
      const agreement = { id: 5, name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };

      // Act
      await updateAgreementState(5, agreement, 0 as const);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PUT y reconstruye payload con newState", async () => {
      // Arrange
      const agreement = { id: 5, name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreementState(5, agreement, 0 as const);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/agreements/5", {
        method: "PUT",
        body: JSON.stringify({
          name: "Convenio A",
          amount: 50000,
          state: 0,
          city_id: 3,
        }),
      });
    });

    it("preserva nombre, cantidad y ciudad del acuerdo recibido", async () => {
      // Arrange
      const agreement = { id: 5, name: "Convenio Test", amount: 75000, state: 1 as const, city_id: 8 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreementState(5, agreement, 1 as const);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.name).toBe("Convenio Test");
      expect(bodyPayload.amount).toBe(75000);
      expect(bodyPayload.city_id).toBe(8);
      expect(bodyPayload.state).toBe(1);
    });

    it("usa el newState recibido, no el del acuerdo", async () => {
      // Arrange
      const agreement = { id: 5, name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreementState(5, agreement, 0 as const);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(0);
    });

    it("invalida caché con prefijo 'agreements:'", async () => {
      // Arrange
      const agreement = { id: 5, name: "Convenio A", amount: 50000, state: 1 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreementState(5, agreement, 0 as const);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("agreements:");
    });

    it("funciona con state = 1 (activación)", async () => {
      // Arrange
      const agreement = { id: 5, name: "Convenio A", amount: 50000, state: 0 as const, city_id: 3 };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateAgreementState(5, agreement, 1 as const);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(1);
    });
  });
});
