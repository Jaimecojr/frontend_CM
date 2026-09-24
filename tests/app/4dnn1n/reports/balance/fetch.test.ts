import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBalanceReport } from "@/app/4dnn1n/reports/balance/fetch";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("balance/fetch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should build the query string and return data, meta and total_balance", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [{ id: 1, name: "JUAN PEREZ", balance: 50000 }],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 1 },
      total_balance: 50000,
    });

    // Act
    const result = await getBalanceReport({ counselor_id: "4" });

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/reports/balance?counselor_id=4");
    expect(result.total_balance).toBe(50000);
    expect(result.data).toHaveLength(1);
  });

  it("should return total_balance as a string without converting it (the backend may send it uncast)", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 },
      total_balance: "50000",
    });

    // Act
    const result = await getBalanceReport({});

    // Assert
    expect(result.total_balance).toBe("50000");
  });
});
