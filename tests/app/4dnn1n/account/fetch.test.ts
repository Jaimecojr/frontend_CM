import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateUsername, changePassword } from "@/app/4dnn1n/account/fetch";
import { apiFetch, csrf } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

describe("account/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Tests for updateUsername ────
  describe("updateUsername", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return undefined;
      });

      // Act
      await updateUsername(7, "nuevo_user");

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con PATCH a /api/users/{userId} y body { user: username }", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await updateUsername(7, "nuevo_user");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/users/7", {
        method: "PATCH",
        body: JSON.stringify({ user: "nuevo_user" }),
      });
    });
  });

  // ──── Tests for changePassword ────
  describe("changePassword", () => {
    it("llama csrf antes que apiFetch", async () => {
      // Arrange
      const callOrder: string[] = [];
      (csrf as any).mockImplementation(async () => {
        callOrder.push("csrf");
        return undefined;
      });
      (apiFetch as any).mockImplementation(async () => {
        callOrder.push("apiFetch");
        return undefined;
      });

      // Act
      await changePassword("actual123", "nueva456");

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("llama apiFetch con POST a /api/user/change-password con current_password y new_password", async () => {
      // Arrange
      (apiFetch as any).mockResolvedValue(undefined);

      // Act
      await changePassword("actual123", "nueva456");

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/user/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: "actual123",
          new_password: "nueva456",
        }),
      });
    });
  });
});
