import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveFranchises } from "@/app/4dnn1n/reports/_lib/catalogs";
import { apiFetch } from "@/lib/api";
import { memCache, TTL_CATALOG } from "@/lib/memCache";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/memCache", () => ({
  memCache: {
    get: vi.fn((key, ttl, fn) => fn()),
    invalidatePrefix: vi.fn(),
  },
  TTL_GEO: 1800000,
  TTL_CATALOG: 300000,
  TTL_LIST: 120000,
}));

describe("getActiveFranchises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should request /api/users/active and return the list of franchises", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({
      message: "ok",
      data: [{ id: 1, name: "FRANQUICIA CENTRO" }],
    });

    // Act
    const result = await getActiveFranchises();

    // Assert
    expect(apiFetch).toHaveBeenCalledWith("/api/users/active");
    expect(result).toEqual([{ id: 1, name: "FRANQUICIA CENTRO" }]);
  });

  it("should return an empty array when the response has no data", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ message: "ok" });

    // Act
    const result = await getActiveFranchises();

    // Assert
    expect(result).toEqual([]);
  });

  it("should use the shared cache key 'franchises:active' with TTL_CATALOG, the same as affiliates/counselors", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ data: [] });

    // Act
    await getActiveFranchises();

    // Assert
    expect(memCache.get).toHaveBeenCalledWith("franchises:active", TTL_CATALOG, expect.any(Function));
  });
});
