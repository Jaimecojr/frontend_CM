import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
import { apiFetch } from "@/lib/api";
import { memCache, TTL_GEO } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/memCache", () => ({
  memCache: {
    get: vi.fn((key, ttl, fn) => fn()),
  },
  TTL_GEO: 1800000,
}));

describe("geo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const mockCities = [{ id: 1, name: "Bogotá", department_id: 7 }];
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
});
