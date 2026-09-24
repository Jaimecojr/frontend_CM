import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUnsentCarnetsReport } from "@/app/4dnn1n/reports/unsent-carnets/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("unsent-carnets/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string solo con franchise_id y per_page (sin fechas)", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ date: "2026-09-01", name: "PEDRO RUIZ" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    await getUnsentCarnetsReport({ franchise_id: "3", per_page: "50" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/unsent-carnets?franchise_id=3&per_page=50");
  });
});
