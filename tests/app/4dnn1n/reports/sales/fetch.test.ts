import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSalesReport } from "@/app/4dnn1n/reports/sales/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("sales/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("getSalesReport", () => {
    it("should build the query string with the given params", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
        totals: { new_count: 0, new_value: 0, renewal_count: 0, renewal_value: 0 },
      });

      // Act
      await getSalesReport({ from: "2026-01-01", page: 1, per_page: "25" });

      // Assert
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/reports/sales?from=2026-01-01&page=1&per_page=25",
      );
    });

    it("should return data, meta and totals from the response", async () => {
      // Arrange
      const mockTotals = { new_count: 3, new_value: 300000, renewal_count: 1, renewal_value: 90000 };
      (apiFetch as any).mockResolvedValue({
        data: [{ id: 1, tipo_venta: "Nuevo" }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
        totals: mockTotals,
      });

      // Act
      const result = await getSalesReport({});

      // Assert
      expect(result.data).toEqual([{ id: 1, tipo_venta: "Nuevo" }]);
      expect(result.totals).toEqual(mockTotals);
    });
  });
});
