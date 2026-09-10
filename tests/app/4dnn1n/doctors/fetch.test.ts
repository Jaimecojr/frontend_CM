import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getDoctors,
  createDoctor,
  getDoctor,
  updateDoctor,
  updateDoctorState,
  deleteDoctor,
  type ApiDoctor,
} from "@/app/4dnn1n/doctors/fetch";
import { apiFetch, csrf } from "@/lib/api";
import { memCache, TTL_LIST, TTL_CATALOG } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: { get: vi.fn((key, ttl, fn) => fn()), invalidatePrefix: vi.fn() },
  TTL_LIST: 120000,
  TTL_CATALOG: 300000,
}));

describe("doctors/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getDoctors ────
  describe("getDoctors", () => {
    it("llama apiFetch con /api/doctors?page=1&per_page=20 cuando no hay params", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getDoctors();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors?page=1&per_page=20");
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
      await getDoctors({
        search: "cardio",
        stade: "1",
        department_id: 3,
        city_id: 7,
        specialty_id: 2,
      });

      // Assert: all query params are forwarded, including state translated from stade
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("page=1")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=20")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("search=cardio")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("state=1")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("department_id=3")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("city_id=7")
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining("specialty_id=2")
      );
    });

    it("convierte stade a state en el query string", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getDoctors({ stade: "1" });

      // Assert
      const callUrl = (apiFetch as any).mock.calls[0][0];
      expect(callUrl).toContain("state=1");
      // stade is translated to state in the query string, never forwarded as-is
      expect(callUrl).not.toContain("stade=1");
    });

    it("retorna { data, meta } con fallback de meta completo", async () => {
      // Arrange
      const mockResponse = {
        data: [
          {
            id: 1,
            name: "Dr. Juan",
            lastname: "Pérez",
            specialty_id: 1,
            city_id: 1,
            phone: "1234567890",
            movil: "3001234567",
            address: "Calle 1",
            secretary_name: "Ana",
            value_agreement: 50000,
            state: 1,
          },
        ],
        meta: { current_page: 1, last_page: 2, per_page: 20, total: 35 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getDoctors();

      // Assert
      expect(result).toEqual({
        data: mockResponse.data,
        meta: mockResponse.meta,
      });
    });

    it("retorna fallback de meta cuando backend no envía meta", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        meta: undefined,
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getDoctors();

      // Assert
      expect(result.meta).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
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
      const result = await getDoctors();

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
      await getDoctors();
      await getDoctors({ search: "cardio" });
      await getDoctors({ search: "cardio", stade: "1" });

      // Assert
      expect(memCache.get).toHaveBeenCalledTimes(3);
      const calls = (memCache.get as any).mock.calls;
      // First call has no search/stade, just page and per_page
      expect(calls[0][0]).toContain("doctors:list:");
      expect(calls[1][0]).toContain("doctors:list:");
      expect(calls[2][0]).toContain("doctors:list:");
      // Different query strings should produce different cache keys
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
      await getDoctors();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith(
        expect.any(String),
        TTL_LIST,
        expect.any(Function)
      );
    });
  });

  // ──── Step 2: Tests for getDoctor ────
  describe("getDoctor", () => {
    it("llama apiFetch con /api/doctors/{id}", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 5,
        name: "Dr. Carlos",
        lastname: "López",
        specialty_id: 2,
        city_id: 3,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Principal",
        secretary_name: "Marta",
        value_agreement: 75000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      const result = await getDoctor(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors/5");
      expect(result).toEqual(mockDoctor);
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 10,
        name: "Dr. Pedro",
        lastname: "García",
        specialty_id: 1,
        city_id: 1,
        phone: "9876543210",
        movil: "3009876543",
        address: "Calle 2",
        secretary_name: "Rosa",
        value_agreement: 60000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      const result = await getDoctor(10);

      // Assert
      expect(result).toEqual(mockDoctor);
    });

    it("no utiliza memCache para getDoctor", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 5,
        name: "Dr. Carlos",
        lastname: "López",
        specialty_id: 2,
        city_id: 3,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Principal",
        secretary_name: "Marta",
        value_agreement: 75000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      await getDoctor(5);

      // Assert
      expect(memCache.get).not.toHaveBeenCalled();
    });
  });

  // ──── Step 3: Tests for createDoctor ────
  describe("createDoctor", () => {
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
      await createDoctor({ name: "Dr. Nuevo", lastname: "Médico" });

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/doctors", async () => {
      // Arrange
      const data = {
        name: "Dr. Nuevo",
        lastname: "Médico",
        specialty_id: 1,
        city_id: 2,
      };
      const mockDoctor: ApiDoctor = {
        id: 20,
        ...data,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Nueva",
        secretary_name: "Elena",
        value_agreement: 50000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      await createDoctor(data);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors", {
        method: "POST",
        body: JSON.stringify(data),
      });
    });

    it("invalida prefix doctors:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createDoctor({ name: "Dr. Test" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("doctors:list:");
    });

    it("invalida prefix doctors:specialty:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createDoctor({ name: "Dr. Test" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "doctors:specialty:"
      );
    });

    it("invalida ambos prefijos en el orden correcto", async () => {
      // Arrange
      const callOrder: string[] = [];
      (memCache.invalidatePrefix as any).mockImplementation((prefix: string) => {
        callOrder.push(prefix);
      });
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await createDoctor({ name: "Dr. Test" });

      // Assert
      expect(callOrder).toEqual(["doctors:list:", "doctors:specialty:"]);
    });

    it("retorna res.data", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 20,
        name: "Dr. Nuevo",
        lastname: "Médico",
        specialty_id: 1,
        city_id: 2,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Nueva",
        secretary_name: "Elena",
        value_agreement: 50000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      const result = await createDoctor({
        name: "Dr. Nuevo",
        lastname: "Médico",
      });

      // Assert
      expect(result).toEqual(mockDoctor);
    });
  });

  // ──── Step 4: Tests for updateDoctor ────
  describe("updateDoctor", () => {
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
      await updateDoctor(5, { name: "Dr. Actualizado" });

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PUT a /api/doctors/{id}", async () => {
      // Arrange
      const data = { name: "Dr. Actualizado" };
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctor(5, data);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors/5", {
        method: "PUT",
        body: JSON.stringify(data),
      });
    });

    it("invalida prefix doctors:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctor(5, { name: "Dr. Actualizado" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("doctors:list:");
    });

    it("invalida prefix doctors:specialty:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctor(5, { name: "Dr. Actualizado" });

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "doctors:specialty:"
      );
    });

    it("retorna res.data", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 5,
        name: "Dr. Actualizado",
        lastname: "López",
        specialty_id: 2,
        city_id: 3,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Principal",
        secretary_name: "Marta",
        value_agreement: 75000,
        state: 1,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      const result = await updateDoctor(5, { name: "Dr. Actualizado" });

      // Assert
      expect(result).toEqual(mockDoctor);
    });
  });

  // ──── Step 5: Tests for deleteDoctor ────
  describe("deleteDoctor", () => {
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
      await deleteDoctor(5);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/doctors/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteDoctor(5);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors/5", {
        method: "DELETE",
      });
    });

    it("invalida prefix doctors:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteDoctor(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("doctors:list:");
    });

    it("invalida prefix doctors:specialty:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteDoctor(5);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "doctors:specialty:"
      );
    });

    it("no retorna valor significativo (Promise<void>)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      const result = await deleteDoctor(5);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ──── Step 6: Tests for updateDoctorState ────
  describe("updateDoctorState", () => {
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
      await updateDoctorState(5, 2);

      // Assert
      expect(callOrder[0]).toBe("csrf");
    });

    it("delega en updateDoctor con { state }", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 5,
        name: "Dr. Test",
        lastname: "Médico",
        specialty_id: 1,
        city_id: 1,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Test",
        secretary_name: "Ana",
        value_agreement: 50000,
        state: 2,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      await updateDoctorState(5, 2);

      // Assert
      // updateDoctor internally calls csrf() and then apiFetch
      // So csrf() is called twice total (once from updateDoctorState, once from updateDoctor)
      expect(csrf).toHaveBeenCalledTimes(2);
    });

    it("termina con PUT a /api/doctors/{id} y body { state: X }", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctorState(5, 2);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors/5", {
        method: "PUT",
        body: JSON.stringify({ state: 2 }),
      });
    });

    it("envía body con solo la propiedad state", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctorState(5, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(Object.keys(bodyPayload)).toEqual(["state"]);
      expect(bodyPayload.state).toBe(1);
    });

    it("invalida ambos prefijos (doctors:list: y doctors:specialty:)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctorState(5, 2);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("doctors:list:");
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith(
        "doctors:specialty:"
      );
    });

    it("acepta state = 1 (activación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctorState(5, 1);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(1);
    });

    it("acepta state = 2 (inactivación)", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: {} });

      // Act
      await updateDoctorState(5, 2);

      // Assert
      const callArgs = (apiFetch as any).mock.calls[0];
      const bodyPayload = JSON.parse(callArgs[1].body);
      expect(bodyPayload.state).toBe(2);
    });

    it("retorna resultado de updateDoctor (ApiDoctor)", async () => {
      // Arrange
      const mockDoctor: ApiDoctor = {
        id: 5,
        name: "Dr. Test",
        lastname: "Médico",
        specialty_id: 1,
        city_id: 1,
        phone: "1234567890",
        movil: "3001234567",
        address: "Calle Test",
        secretary_name: "Ana",
        value_agreement: 50000,
        state: 2,
      };
      (apiFetch as any).mockResolvedValue({ data: mockDoctor });

      // Act
      const result = await updateDoctorState(5, 2);

      // Assert
      expect(result).toEqual(mockDoctor);
    });
  });
});
