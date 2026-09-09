import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSpecialties,
  createSpecialty,
  getSpecialty,
  updateSpecialty,
  updateSpecialtyState,
  deleteSpecialty,
  type ApiSpecialty,
} from "@/app/4dnn1n/doctors/specialties/fetch";
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

describe("doctors/specialties/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getSpecialties and getSpecialty ────
  describe("getSpecialties", () => {
    it("llama apiFetch con /api/specialties", async () => {
      // Arrange
      const mockResponse = {
        data: [],
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getSpecialties();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties");
      expect(result).toEqual([]);
    });

    it("retorna res.data cuando hay datos", async () => {
      // Arrange
      const mockSpecialties: ApiSpecialty[] = [
        { id: 1, name: "Cardiología", state: 1 },
        { id: 2, name: "Pediatría", state: 1 },
      ];
      const mockResponse = {
        data: mockSpecialties,
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getSpecialties();

      // Assert
      expect(result).toEqual(mockSpecialties);
    });

    it("retorna fallback de data cuando backend no envía data", async () => {
      // Arrange
      const mockResponse = {
        data: undefined,
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getSpecialties();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa memCache con clave specialties:all", async () => {
      // Arrange
      const mockResponse = {
        data: [],
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getSpecialties();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        "specialties:all",
        TTL_CATALOG,
        expect.any(Function)
      );
    });

    it("pasa TTL_CATALOG al memCache.get", async () => {
      // Arrange
      const mockResponse = {
        data: [],
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getSpecialties();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        expect.any(String),
        TTL_CATALOG,
        expect.any(Function)
      );
    });
  });

  describe("getSpecialty", () => {
    it("llama apiFetch con /api/specialties/{id}", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 3,
        name: "Dermatología",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      const result = await getSpecialty(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties/3");
      expect(result).toEqual(mockSpecialty);
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 10,
        name: "Neurología",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      const result = await getSpecialty(10);

      // Assert
      expect(result).toEqual(mockSpecialty);
    });

    it("no utiliza memCache para getSpecialty", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 3,
        name: "Dermatología",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      await getSpecialty(3);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
    });
  });

  // ──── Step 2: Tests for createSpecialty, updateSpecialty, deleteSpecialty ────
  describe("createSpecialty", () => {
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
      await createSpecialty({ name: "Pediatría", state: 1 });

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/specialties", async () => {
      // Arrange
      const data = { name: "Pediatría", state: 1 };
      const mockSpecialty: ApiSpecialty = {
        id: 15,
        ...data,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      await createSpecialty(data);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties", {
        method: "POST",
        body: JSON.stringify(data),
      });
    });

    it("invalida prefix specialties:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createSpecialty({ name: "Pediatría" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("specialties:");
    });

    it("retorna res.data", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 15,
        name: "Pediatría",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      const result = await createSpecialty({ name: "Pediatría", state: 1 });

      // Assert
      expect(result).toEqual(mockSpecialty);
    });
  });

  describe("updateSpecialty", () => {
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
      await updateSpecialty(3, { name: "Pediatría Actualizada" });

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PUT a /api/specialties/{id}", async () => {
      // Arrange
      const data = { name: "Pediatría Actualizada" };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialty(3, data);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties/3", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    });

    it("invalida prefix specialties:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialty(3, { name: "Pediatría Actualizada" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("specialties:");
    });

    it("retorna res.data", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 3,
        name: "Pediatría Actualizada",
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      const result = await updateSpecialty(3, {
        name: "Pediatría Actualizada",
      });

      // Assert
      expect(result).toEqual(mockSpecialty);
    });
  });

  describe("deleteSpecialty", () => {
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
      await deleteSpecialty(3);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/specialties/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteSpecialty(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties/3", {
        method: "DELETE",
      });
    });

    it("invalida prefix specialties:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteSpecialty(3);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("specialties:");
    });

    it("no retorna valor significativo (Promise<void>)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      const result = await deleteSpecialty(3);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ──── Step 3: Test for updateSpecialtyState ────
  describe("updateSpecialtyState", () => {
    it("llama csrf al inicio", async () => {
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
      await updateSpecialtyState(3, 0);

      // Assert
      expect(callOrder[0]).toBe("csrf");
    });

    it("delega en updateSpecialty con { state }", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 3,
        name: "Pediatría",
        state: 0,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      await updateSpecialtyState(3, 0);

      // Assert
      // updateSpecialtyState calls csrf, then calls updateSpecialty which also calls csrf
      // So csrf() is called twice total
      expect(csrf).toHaveBeenCalledTimes(2);
    });

    it("termina con PUT a /api/specialties/{id} y body { state: X }", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialtyState(3, 0);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties/3", {
        method: "PUT",
        body: JSON.stringify({ state: 0 }),
      });
    });

    it("envía body con solo la propiedad state", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialtyState(3, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(Object.keys(bodyPayload)).toEqual(["state"]);
      expect(bodyPayload.state).toBe(1);
    });

    it("invalida prefix specialties:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialtyState(3, 0);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("specialties:");
    });

    it("acepta state = 1 (activación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialtyState(3, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(1);
    });

    it("acepta state = 0 (inactivación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateSpecialtyState(3, 0);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(0);
    });

    it("retorna resultado de updateSpecialty (ApiSpecialty)", async () => {
      // Arrange
      const mockSpecialty: ApiSpecialty = {
        id: 3,
        name: "Pediatría",
        state: 0,
      };
      (apiFetch as any).mockResolvedValue({ data: mockSpecialty });

      // Act
      const result = await updateSpecialtyState(3, 0);

      // Assert
      expect(result).toEqual(mockSpecialty);
    });
  });
});
