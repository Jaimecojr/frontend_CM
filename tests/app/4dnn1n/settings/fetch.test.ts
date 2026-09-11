import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSetting, updateSetting, type ApiSetting } from "@/app/4dnn1n/settings/fetch";
import { apiFetch, csrf } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  csrf: vi.fn().mockResolvedValue(undefined),
}));

describe("settings/fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: Test for getSetting ────
  describe("getSetting", () => {
    it("retorna res.data directamente", async () => {
      // Arrange
      const setting: ApiSetting = {
        id: 1,
        wa_api_version: "v18.0",
        wa_phone_number_id: "123",
        wa_bearer_token: "tok",
        wa_template_name: "carnet_tpl",
        wa_appointment_template_name: null,
      };
      (apiFetch as any).mockResolvedValue({ message: "ok", data: setting });

      // Act
      const result = await getSetting();

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/settings");
      expect(result).toEqual(setting);
    });
  });

  // ──── Step 2: Test for updateSetting ────
  describe("updateSetting", () => {
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
      const payload = {
        wa_api_version: "v19.0",
        wa_phone_number_id: "999",
        wa_bearer_token: "nuevo-tok",
        wa_template_name: "carnet_v2",
        wa_appointment_template_name: "cita_tpl",
      };

      // Act
      await updateSetting(3, payload);

      // Assert
      expect(callOrder[0]).toBe("csrf");
      expect(callOrder[1]).toBe("apiFetch");
    });

    it("actualiza vía PATCH y retorna la respuesta completa", async () => {
      // Arrange
      const payload = {
        wa_api_version: "v19.0",
        wa_phone_number_id: "999",
        wa_bearer_token: "nuevo-tok",
        wa_template_name: "carnet_v2",
        wa_appointment_template_name: "cita_tpl",
      };
      const apiResponse = {
        message: "Configuración actualizada.",
        data: { id: 3, ...payload },
      };
      (apiFetch as any).mockResolvedValue(apiResponse);

      // Act
      const result = await updateSetting(3, payload);

      // Assert
      expect(apiFetch).toHaveBeenCalledWith("/api/settings/3", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(apiResponse);
    });
  });
});
