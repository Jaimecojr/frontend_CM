import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCounselors,
  getCounselor,
  getDepartments,
  getCitiesByDepartment,
  createCounselor,
  updateCounselor,
  updateCounselorState,
  checkCounselorIdCard,
  getActiveFranchises,
  type ApiCounselor,
  type CreateCounselorPayload,
  type UpdateCounselorPayload,
} from "@/app/4dnn1n/counselors/fetch";
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

describe("counselors/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getCounselors and getCounselor ────
  describe("getCounselors", () => {
    it("llama apiFetch con /api/counselors", async () => {
      // Arrange
      const mockResponse = { data: [] };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getCounselors();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors");
      expect(result).toEqual([]);
    });

    it("retorna array de asesores cuando apiFetch resuelve datos", async () => {
      // Arrange
      const mockCounselors: ApiCounselor[] = [
        {
          id: 1,
          name: "Carlos",
          lastname: "Pérez",
          id_card: "12345678",
          state: 1,
          city_id: 3,
          user_id: 5,
          type_contra: "Término Fijo",
        },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockCounselors });

      // Act
      const result = await getCounselors();

      // Assert
      expect(result).toEqual(mockCounselors);
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getCounselors();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'counselors:all' con TTL_CATALOG", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCounselors();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        "counselors:all",
        TTL_CATALOG,
        expect.any(Function),
      );
    });
  });

  describe("getCounselor", () => {
    it("llama apiFetch con /api/counselors/{id}", async () => {
      // Arrange
      const mockCounselor: ApiCounselor = {
        id: 5,
        name: "Carlos",
        lastname: "Pérez",
        id_card: "12345678",
        state: 1,
        city_id: 3,
        user_id: 5,
        type_contra: "Término Fijo",
      };
      (apiFetch as any).mockResolvedValue({ data: mockCounselor });

      // Act
      const result = await getCounselor(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/5");
      expect(result).toEqual(mockCounselor);
    });

    it("retorna res.data sin cacheo", async () => {
      // Arrange
      const mockCounselor: ApiCounselor = {
        id: 5,
        name: "Juan",
        lastname: "García",
        id_card: "87654321",
        state: 2,
        city_id: 7,
        user_id: 8,
        type_contra: "Corretaje",
      };
      (apiFetch as any).mockResolvedValue({ data: mockCounselor });

      // Act
      const result = await getCounselor(5);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockCounselor);
    });
  });

  // ──── Step 2: Tests for getDepartments, getCitiesByDepartment, getActiveFranchises ────
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
      expect(memCache.get).toHaveBeenCalledWith(
        "departments",
        TTL_GEO,
        expect.any(Function),
      );
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
      expect(memCache.get).toHaveBeenCalledWith(
        "cities:7",
        TTL_GEO,
        expect.any(Function),
      );
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

  describe("getActiveFranchises", () => {
    it("llama apiFetch con /api/users/active", async () => {
      // Arrange
      const mockFranchises = [
        { id: 2, name: "Franquicia A" },
        { id: 3, name: "Franquicia B" },
      ];
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

    it("usa clave de caché 'franchises:active' con TTL_CATALOG", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getActiveFranchises();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        "franchises:active",
        TTL_CATALOG,
        expect.any(Function),
      );
    });
  });

  // ──── Step 3: Tests for createCounselor, updateCounselor, updateCounselorState ────
  describe("createCounselor", () => {
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
      const payload: CreateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
        id_card: "12345678",
        type_contra: "Término Fijo",
        password: "securepass123",
        city_id: 3,
        user_id: 5,
      };

      // Act
      await createCounselor(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/counselors", async () => {
      // Arrange
      const payload: CreateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
        id_card: "12345678",
        type_contra: "Término Fijo",
        password: "securepass123",
        city_id: 3,
        user_id: 5,
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createCounselor(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché con prefijo 'counselors:'", async () => {
      // Arrange
      const payload: CreateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
        id_card: "12345678",
        type_contra: "Término Fijo",
        password: "securepass123",
        city_id: 3,
        user_id: 5,
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createCounselor(payload);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("counselors:");
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const payload: CreateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
        id_card: "12345678",
        type_contra: "Término Fijo",
        password: "securepass123",
        city_id: 3,
        user_id: 5,
      };
      const mockResult = {
        data: { id: 10, ...payload, state: 1 },
      };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await createCounselor(payload);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateCounselor", () => {
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
      const payload: UpdateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
      };

      // Act
      await updateCounselor(5, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/counselors/{id}", async () => {
      // Arrange
      const payload: UpdateCounselorPayload = {
        name: "Carlos",
        lastname: "Pérez",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselor(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché con prefijo 'counselors:'", async () => {
      // Arrange
      const payload: UpdateCounselorPayload = {
        name: "Juan",
        lastname: "García",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselor(5, payload);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("counselors:");
    });

    it("acepta payload parcial sin password", async () => {
      // Arrange
      const payload: UpdateCounselorPayload = {
        name: "Carlos",
        email: "carlos@example.com",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselor(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("acepta payload parcial con password opcional", async () => {
      // Arrange
      const payload: UpdateCounselorPayload = {
        name: "Carlos",
        password: "newpass456",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselor(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const payload: UpdateCounselorPayload = {
        name: "Carlos Updated",
      };
      const mockResult = { data: { id: 5, ...payload } };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await updateCounselor(5, payload);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateCounselorState", () => {
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

      // Act
      await updateCounselorState(5, 2);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/counselors/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselorState(5, 1);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/counselors/5", {
        method: "PATCH",
        body: JSON.stringify({ state: 1 }),
      });
    });

    it("envía body con solo la propiedad state", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselorState(5, 2);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(Object.keys(bodyPayload)).toEqual(["state"]);
      expect(bodyPayload.state).toBe(2);
    });

    it("acepta state = 1 (activación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselorState(5, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(1);
    });

    it("acepta state = 2 (inactivación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselorState(5, 2);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(2);
    });

    it("invalida caché con prefijo 'counselors:'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateCounselorState(5, 2);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("counselors:");
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const mockResult = {
        data: {
          id: 5,
          name: "Carlos",
          lastname: "Pérez",
          state: 2,
        },
      };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await updateCounselorState(5, 2);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  // ──── Step 4: Tests for checkCounselorIdCard ────
  describe("checkCounselorIdCard", () => {
    it("llama apiFetch con /api/counselors/check-id-card?id_card=123", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      await checkCounselorIdCard("123");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/counselors/check-id-card?id_card=123",
      );
    });

    it("NO pasa por memCache.get", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      await checkCounselorIdCard("123");

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
    });

    it("retorna objeto de respuesta tal cual", async () => {
      // Arrange
      const mockResponse = { exists: true };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await checkCounselorIdCard("123");

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it("retorna { exists: false } cuando no existe", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      const result = await checkCounselorIdCard("999999");

      // Assert
      expect(result).toEqual({ exists: false });
    });

    it("retorna { exists: true } cuando existe", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: true });

      // Act
      const result = await checkCounselorIdCard("123");

      // Assert
      expect(result).toEqual({ exists: true });
    });

    it("incluye ignore_id cuando está presente", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      await checkCounselorIdCard("123", 9);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/counselors/check-id-card?id_card=123&ignore_id=9",
      );
    });

    it("omite ignore_id cuando no está presente", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      await checkCounselorIdCard("123");

      // Assert
      const callArg = (apiFetch as any).mock.calls[0][0];
      expect(callArg).not.toContain("ignore_id");
    });

    it("retorna respuesta con message opcional", async () => {
      // Arrange
      const mockResponse = { exists: true, message: "ID card already exists" };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await checkCounselorIdCard("123");

      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.message).toBe("ID card already exists");
    });

    it("construye URL correctamente con id_card especial", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ exists: false });

      // Act
      await checkCounselorIdCard("123-456-789");

      // Assert
      // URLSearchParams encodes special characters
      const callArg = (apiFetch as any).mock.calls[0][0];
      expect(callArg).toContain("id_card=");
    });
  });
});
