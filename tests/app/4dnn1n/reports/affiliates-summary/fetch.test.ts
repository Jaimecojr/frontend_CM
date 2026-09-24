import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAffiliatesSummaryReport } from "@/app/4dnn1n/reports/affiliates-summary/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("affiliates-summary/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string y retorna los 6 indicadores", async () => {
    // Arrange
    const mockData = {
      titulares: 100,
      titulares_activos: 80,
      titulares_inactivos: 20,
      beneficiarios: 40,
      beneficiarios_activos: 30,
      beneficiarios_inactivos: 10,
    };
    (apiFetch as any).mockResolvedValue({ data: mockData, from: null, to: null });

    // Act
    const result = await getAffiliatesSummaryReport({ city_id: "5" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/affiliates-summary?city_id=5");
    expect(result).toEqual(mockData);
  });

  it("omite parametros undefined o vacios del query string", async () => {
    // Arrange
    const mockData = {
      titulares: 0,
      titulares_activos: 0,
      titulares_inactivos: 0,
      beneficiarios: 0,
      beneficiarios_activos: 0,
      beneficiarios_inactivos: 0,
    };
    (apiFetch as any).mockResolvedValue({ data: mockData });

    // Act
    await getAffiliatesSummaryReport({ from: undefined, to: "", franchise_id: "3" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/affiliates-summary?franchise_id=3");
  });
});
