import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAffiliateForEdit,
  searchAffiliateByIdCard,
  getActiveSpecialties,
  getDoctorsBySpecialty,
  getDepartments,
  getCitiesByDepartment,
} from "@/app/4dnn1n/appointments/fetch";
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

describe("appointments/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Tests for getAppointments ────
  describe("getAppointments", () => {
    it("llama apiFetch sin query string cuando no hay params", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getAppointments();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments");
      expect(result).toEqual({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
    });

    it("construye query string correcto con todos los parámetros", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 2, last_page: 5, per_page: 10, total: 42 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getAppointments({ search: "juan", page: 2, per_page: 10, date: "2025-01-28", period: "pending" });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/appointments?search=juan&page=2&per_page=10&date=2025-01-28&period=pending"
      );
    });

    it("incluye solo los parámetros presentes en el query string", async () => {
      // Arrange
      const mockResponse = { data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      await getAppointments({ search: "maria", page: 3 });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments?search=maria&page=3");
    });

    it("retorna { data, meta } sin message de la respuesta API", async () => {
      // Arrange
      const mockResponse = {
        message: "Listado de citas",
        data: [{ id: 1, name: "Cita 1" }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      };
      (apiFetch as any).mockResolvedValue(mockResponse);

      // Act
      const result = await getAppointments();

      // Assert
      expect(result).toEqual({
        data: [{ id: 1, name: "Cita 1" }],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
      });
    });

    it("retorna { data: [] } cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined, meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });

      // Act
      const result = await getAppointments();

      // Assert
      expect(result.data).toEqual([]);
    });

    it("genera claves de caché distintas para cada combinación de params", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });

      // Act
      await getAppointments();
      await getAppointments({ search: "test" });
      await getAppointments({ search: "test", page: 2 });

      // Assert
      expect(memCache.get).toHaveBeenCalledTimes(3);
      const calls = (memCache.get as any).mock.calls;
      expect(calls[0][0]).toBe("appointments:list:");
      expect(calls[1][0]).toBe("appointments:list:?search=test");
      expect(calls[2][0]).toBe("appointments:list:?search=test&page=2");
    });
  });

  // ──── Step 2: Tests for getAppointment, createAppointment, updateAppointment, deleteAppointment ────
  describe("getAppointment", () => {
    it("llama apiFetch con la URL correcta de la cita", async () => {
      // Arrange
      const mockAppointment = { id: 3, name: "Consulta", doctor_id: 1 };
      (apiFetch as any).mockResolvedValue({ data: mockAppointment });

      // Act
      const result = await getAppointment(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments/3");
      expect(result).toEqual(mockAppointment);
    });
  });

  describe("createAppointment", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: { id: 1 } };
      });
      const payload = { name: "Consulta", doctor_id: 1 } as any;

      // Act
      await createAppointment(payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/appointments", async () => {
      // Arrange
      const payload = { name: "Consulta", doctor_id: 1 } as any;
      (apiFetch as any).mockResolvedValue({ data: { id: 1 } });

      // Act
      await createAppointment(payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché appointments:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: { id: 1 } });

      // Act
      await createAppointment({} as any);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("appointments:list:");
    });

    it("retorna res.data de la respuesta", async () => {
      // Arrange
      const mockAppointment = { id: 1, name: "Consulta", doctor_id: 1 };
      (apiFetch as any).mockResolvedValue({ data: mockAppointment });

      // Act
      const result = await createAppointment({} as any);

      // Assert
      expect(result).toEqual(mockAppointment);
    });
  });

  describe("updateAppointment", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return { data: { id: 3 } };
      });
      const payload = { name: "Consulta actualizada" } as any;

      // Act
      await updateAppointment(3, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con método PUT a /api/appointments/{id}", async () => {
      // Arrange
      const payload = { name: "Consulta actualizada" } as any;
      (apiFetch as any).mockResolvedValue({ data: { id: 3 } });

      // Act
      await updateAppointment(3, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments/3", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    });

    it("invalida caché appointments:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: { id: 3 } });

      // Act
      await updateAppointment(3, {} as any);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("appointments:list:");
    });

    it("retorna res.data de la respuesta", async () => {
      // Arrange
      const mockAppointment = { id: 3, name: "Consulta actualizada" };
      (apiFetch as any).mockResolvedValue({ data: mockAppointment });

      // Act
      const result = await updateAppointment(3, {} as any);

      // Assert
      expect(result).toEqual(mockAppointment);
    });
  });

  describe("deleteAppointment", () => {
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
      await deleteAppointment(3);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con DELETE a /api/appointments/{id}", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteAppointment(3);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/appointments/3", {
        method: "DELETE",
      });
    });

    it("invalida caché appointments:list:", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({});

      // Act
      await deleteAppointment(3);

      // Assert
      expect(memCache.invalidatePrefix).toHaveBeenCalledWith("appointments:list:");
    });
  });

  // ──── Step 3: Tests for getAffiliateForEdit and searchAffiliateByIdCard ────
  describe("getAffiliateForEdit", () => {
    it("llama apiFetch con /api/affiliates/{id}", async () => {
      // Arrange
      const mockAffiliate = { id: 7, name: "Pedro", lastname: "Gómez" };
      (apiFetch as any).mockResolvedValue({ data: mockAffiliate });

      // Act
      const result = await getAffiliateForEdit(7);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/7");
      expect(result).toEqual(mockAffiliate);
    });
  });

  describe("searchAffiliateByIdCard", () => {
    it("llama apiFetch con /api/affiliates/by-id-card?id_card=...", async () => {
      // Arrange
      const mockAffiliate = { id: 7, name: "María", id_card: "12345678" };
      (apiFetch as any).mockResolvedValue({ data: mockAffiliate });

      // Act
      const result = await searchAffiliateByIdCard("12345678");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/by-id-card?id_card=12345678");
      expect(result).toEqual(mockAffiliate);
    });

    it("aplica encodeURIComponent al id_card", async () => {
      // Arrange
      const mockAffiliate = { id: 7, name: "María" };
      (apiFetch as any).mockResolvedValue({ data: mockAffiliate });

      // Act
      await searchAffiliateByIdCard("123 456");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/affiliates/by-id-card?id_card=123%20456");
    });

    it("retorna res.data sin transformación", async () => {
      // Arrange
      const mockAffiliate = { id: 7, name: "María", id_card: "12345678" };
      (apiFetch as any).mockResolvedValue({ data: mockAffiliate });

      // Act
      const result = await searchAffiliateByIdCard("12345678");

      // Assert
      expect(result).toEqual(mockAffiliate);
    });
  });

  // ──── Step 4: Tests for getActiveSpecialties (with client-side state === 1 filter) ────
  describe("getActiveSpecialties", () => {
    it("llama apiFetch con /api/specialties", async () => {
      // Arrange
      const mockSpecialties = [{ id: 1, name: "Cardio", state: 1 }];
      (apiFetch as any).mockResolvedValue({ data: mockSpecialties });

      // Act
      await getActiveSpecialties();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/specialties");
    });

    it("filtra especialidades con state === 1 (client-side filter)", async () => {
      // Arrange
      const mockSpecialties = [
        { id: 1, name: "Cardio", state: 1 },
        { id: 2, name: "Dermatología", state: 0 },
        { id: 3, name: "Pediatría", state: 1 },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockSpecialties });

      // Act
      const result = await getActiveSpecialties();

      // Assert
      expect(result).toEqual([
        { id: 1, name: "Cardio", state: 1 },
        { id: 3, name: "Pediatría", state: 1 },
      ]);
    });

    it("retorna [] cuando apiFetch resuelve data undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getActiveSpecialties();

      // Assert
      expect(result).toEqual([]);
    });

    it("retorna [] cuando no hay especialidades con state === 1", async () => {
      // Arrange
      const mockSpecialties = [
        { id: 1, name: "Cardio", state: 0 },
        { id: 2, name: "Dermatología", state: 0 },
      ];
      (apiFetch as any).mockResolvedValue({ data: mockSpecialties });

      // Act
      const result = await getActiveSpecialties();

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'specialties:active'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getActiveSpecialties();

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("specialties:active", TTL_CATALOG, expect.any(Function));
    });
  });

  // ──── Step 5: Tests for getDoctorsBySpecialty, getDepartments, getCitiesByDepartment ────
  describe("getDoctorsBySpecialty", () => {
    it("llama apiFetch con /api/doctors/by-specialty?specialty_id=...", async () => {
      // Arrange
      const mockDoctors = [{ id: 1, name: "Dr. Juan" }];
      (apiFetch as any).mockResolvedValue({ data: mockDoctors });

      // Act
      const result = await getDoctorsBySpecialty(4);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/doctors/by-specialty?specialty_id=4");
      expect(result).toEqual(mockDoctors);
    });

    it("retorna [] cuando data es undefined", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: undefined });

      // Act
      const result = await getDoctorsBySpecialty(4);

      // Assert
      expect(result).toEqual([]);
    });

    it("usa clave de caché 'doctors:specialty:{specialtyId}'", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({ data: [] });

      // Act
      await getDoctorsBySpecialty(4);

      // Assert
      expect(memCache.get).toHaveBeenCalledWith("doctors:specialty:4", TTL_CATALOG, expect.any(Function));
    });
  });

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
});
