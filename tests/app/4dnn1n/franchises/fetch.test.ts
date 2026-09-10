import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFranchises,
  getFranchise,
  getDepartments,
  getCitiesByDepartment,
  createUser,
  updateFranchise,
  updateFranchiseState,
  type ApiFranchise,
  type CreateFranchisePayload,
  type UpdateFranchisePayload,
} from "@/app/4dnn1n/franchises/fetch";
import { apiFetch, csrf } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

describe("franchises/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getFranchises ────
  describe("getFranchises", () => {
    it("llama apiFetch con /api/users", async () => {
      // Arrange
      const mockResponse = { data: [] };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getFranchises();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users");
      expect(result).toEqual([]);
    });

    it("filtra franchises SuperAdmin (type === 1) del resultado", async () => {
      // Arrange
      const mockFranchises = [
        { id: 1, type: "1", name: "Root" },
        { id: 2, type: "2", name: "F1" },
        { id: 3, type: 3, name: "F2" },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockFranchises });

      // Act
      const result = await getFranchises();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 2, type: 2, name: "F1" });
      expect(result[1]).toEqual({ id: 3, type: 3, name: "F2" });
    });

    it("normaliza type a Number incluso si viene como string", async () => {
      // Arrange
      const mockFranchises = [
        { id: 2, type: "2", name: "F1" },
        { id: 3, type: "3", name: "F2" },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockFranchises });

      // Act
      const result = await getFranchises();

      // Assert
      expect(result[0].type).toBe(2);
      expect(result[1].type).toBe(3);
      expect(typeof result[0].type).toBe("number");
      expect(typeof result[1].type).toBe("number");
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getFranchises();

      // Assert
      expect(result).toEqual([]);
    });

    it("excluye SuperAdmin incluso si tipo viene como number", async () => {
      // Arrange
      const mockFranchises = [
        { id: 1, type: 1, name: "Root" },
        { id: 2, type: 2, name: "F1" },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockFranchises });

      // Act
      const result = await getFranchises();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });
  });

  // ──── Step 2: Tests for getFranchise, getDepartments, getCitiesByDepartment ────
  describe("getFranchise", () => {
    it("llama apiFetch con /api/users/{id}", async () => {
      // Arrange
      const mockFranchise: ApiFranchise = {
        id: 5,
        nit: "123456789",
        name: "Franquicia A",
        email: "admin@franquicia.com",
        user: "admin_user",
        state: 1,
        type: 2,
      };
      (apiFetch as any).mockResolvedValue({ data: mockFranchise });

      // Act
      const result = await getFranchise(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/5");
      expect(result).toEqual(mockFranchise);
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockFranchise: ApiFranchise = {
        id: 7,
        nit: "987654321",
        name: "Franquicia B",
        email: "contact@franquicia.com",
        user: "user_b",
        state: 2,
        type: 3,
      };
      (apiFetch as any).mockResolvedValue({ data: mockFranchise });

      // Act
      const result = await getFranchise(7);

      // Assert
      expect(result).toEqual(mockFranchise);
    });
  });

  describe("getDepartments", () => {
    it("llama apiFetch con /api/departments", async () => {
      // Arrange
      const mockDepts = [
        { id: 1, name: "Bogotá" },
        { id: 2, name: "Medellín" },
      ];
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

    it("retorna datos sin pasar por memCache", async () => {
      // Arrange
      const mockDepts = [{ id: 1, name: "Bogotá" }];
      (apiFetch as any).mockResolvedValue({ data: mockDepts });

      // Act
      const result = await getDepartments();

      // Assert
      expect(result).toEqual(mockDepts);
      // No memCache import in this file — verify via absence of cache handling
      expect(apiFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getCitiesByDepartment", () => {
    it("llama apiFetch con /api/departments/{departmentId}/cities", async () => {
      // Arrange
      const mockCities = [
        { id: 1, name: "Bogotá" },
        { id: 2, name: "Soacha" },
      ];
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

    it("construye URL correcta con departmentId dinámico", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getCitiesByDepartment(15);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/departments/15/cities");
    });
  });

  // ──── Step 3: Tests for createUser, updateFranchise, updateFranchiseState ────
  describe("createUser", () => {
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
      const payload: CreateFranchisePayload = {
        nit: "123456789",
        name: "Nueva Franquicia",
        email: "new@franquicia.com",
        user: "new_user",
        password: "securepass123",
        city_id: 3,
      };

      // Act
      await createUser(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/users", async () => {
      // Arrange
      const payload: CreateFranchisePayload = {
        nit: "123456789",
        name: "Nueva Franquicia",
        email: "new@franquicia.com",
        user: "new_user",
        password: "securepass123",
        city_id: 3,
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createUser(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("envía payload con JSON.stringify", async () => {
      // Arrange
      const payload: CreateFranchisePayload = {
        nit: "123456789",
        name: "Nueva Franquicia",
        email: "new@franquicia.com",
        user: "new_user",
        password: "securepass123",
        city_id: 3,
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createUser(payload);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(payload));
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const payload: CreateFranchisePayload = {
        nit: "123456789",
        name: "Nueva Franquicia",
        email: "new@franquicia.com",
        user: "new_user",
        password: "securepass123",
        city_id: 3,
      };
      const mockResult = {
        data: { id: 10, ...payload, state: 1 },
      };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await createUser(payload);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateFranchise", () => {
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
      const payload: UpdateFranchisePayload = {
        name: "Franquicia Actualizada",
      };

      // Act
      await updateFranchise(5, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/users/{id}", async () => {
      // Arrange
      const payload: UpdateFranchisePayload = {
        name: "Franquicia Actualizada",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchise(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("acepta payload parcial sin password", async () => {
      // Arrange
      const payload: UpdateFranchisePayload = {
        name: "Actualizado",
        email: "updated@franquicia.com",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchise(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("acepta payload parcial con password opcional", async () => {
      // Arrange
      const payload: UpdateFranchisePayload = {
        name: "Actualizado",
        password: "newpass456",
      };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchise(5, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/5", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const payload: UpdateFranchisePayload = {
        name: "Franquicia Actualizada",
      };
      const mockResult = { data: { id: 5, ...payload } };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await updateFranchise(5, payload);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });

  describe("updateFranchiseState", () => {
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
      await updateFranchiseState(5, 2);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/users/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchiseState(5, 1);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/5", {
        method: "PATCH",
        body: JSON.stringify({ state: 1 }),
      });
    });

    it("envía body con solo la propiedad state", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchiseState(5, 2);

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
      await updateFranchiseState(5, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(1);
    });

    it("acepta state = 2 (inactivación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateFranchiseState(5, 2);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(2);
    });

    it("retorna resultado de apiFetch", async () => {
      // Arrange
      const mockResult = {
        data: {
          id: 5,
          name: "Franquicia",
          state: 2,
        },
      };
      (apiFetch as any).mockResolvedValue(mockResult);

      // Act
      const result = await updateFranchiseState(5, 2);

      // Assert
      expect(result).toEqual(mockResult);
    });
  });
});
