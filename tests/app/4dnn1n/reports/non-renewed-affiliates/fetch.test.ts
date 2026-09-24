import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNonRenewedAffiliatesReport } from "@/app/4dnn1n/reports/non-renewed-affiliates/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("non-renewed-affiliates/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("construye el query string solo con from (nunca to)", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "MARIA TORRES" }],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    });

    // Act
    await getNonRenewedAffiliatesReport({ from: "2026-01-01" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/non-renewed-affiliates?from=2026-01-01");
  });
});
