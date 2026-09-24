import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveFranchises } from "@/app/4dnn1n/reports/_lib/catalogs";
import { apiFetch } from "@/lib/api";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));

describe("getActiveFranchises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pide /api/users/active y retorna la lista de franquicias", async () => {
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

  it("retorna un arreglo vacío cuando la respuesta no trae data", async () => {
    // Arrange
    (apiFetch as any).mockResolvedValue({ message: "ok" });

    // Act
    const result = await getActiveFranchises();

    // Assert
    expect(result).toEqual([]);
  });
});
