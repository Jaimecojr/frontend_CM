import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/4dnn1n/settings/page";
import { getSetting, updateSetting, type ApiSetting } from "@/app/4dnn1n/settings/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

// `fetch.ts` is fully mocked so no real `apiFetch` call ever fires from this
// page-level test — `getSetting`/`updateSetting` internals already have
// dedicated coverage.
vi.mock("@/app/4dnn1n/settings/fetch", () => ({ getSetting: vi.fn(), updateSetting: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// `SettingForm` already has dedicated coverage; this stub exposes a button
// that invokes `onSubmit` with a fixed payload so `handleSubmit` can be
// exercised without any of the form's own field/validation logic.
vi.mock("@/app/4dnn1n/settings/_components/SettingForm", () => ({
  default: ({ onSubmit }: any) => (
    <button
      data-testid="submit-stub"
      onClick={() =>
        onSubmit({
          wa_api_version: "v20.0",
          wa_phone_number_id: "1",
          wa_bearer_token: "t",
          wa_template_name: "tpl",
          wa_appointment_template_name: "",
        })
      }
    >
      submit-stub
    </button>
  ),
}));

function makeSetting(overrides: Partial<ApiSetting> = {}): ApiSetting {
  return {
    id: 1,
    wa_api_version: "v18.0",
    wa_phone_number_id: "123456789",
    wa_bearer_token: "secret-token",
    wa_template_name: "carnet_template",
    wa_appointment_template_name: "confirmacion_cita",
    ...overrides,
  };
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ciclo de carga", () => {
    it("mientras getSetting está pendiente, no muestra el título 'Configuración Global'", () => {
      // Arrange: a never-resolving promise keeps the page in its loading state.
      (getSetting as any).mockReturnValue(new Promise(() => {}));

      // Act
      render(<SettingsPage />);

      // Assert
      expect(screen.queryByText("Configuración Global")).not.toBeInTheDocument();
      expect(screen.queryByTestId("submit-stub")).not.toBeInTheDocument();
    });

    it("cuando getSetting resuelve, muestra título, descripción y el formulario", async () => {
      // Arrange
      (getSetting as any).mockResolvedValue(makeSetting());

      // Act
      render(<SettingsPage />);

      // Assert
      await waitFor(() => expect(screen.getByText("Configuración Global")).toBeInTheDocument());
      expect(
        screen.getByText("Parámetros de integración con la API de WhatsApp Business."),
      ).toBeInTheDocument();
      expect(screen.getByTestId("submit-stub")).toBeInTheDocument();
    });

    it("cuando getSetting rechaza, llama alert.error y nunca renderiza el título ni el formulario", async () => {
      // Arrange
      const apiError = { data: { message: "No autorizado" } };
      (getSetting as any).mockRejectedValue(apiError);

      // Act
      render(<SettingsPage />);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", getApiErrorMessage(apiError)),
      );
      expect(screen.queryByText("Configuración Global")).not.toBeInTheDocument();
      expect(screen.queryByTestId("submit-stub")).not.toBeInTheDocument();
    });
  });

  describe("handleSubmit", () => {
    it("al hacer click en submit-stub llama updateSetting(setting.id, payload) y, al resolver, actualiza el estado y muestra alert.success", async () => {
      // Arrange
      const initial = makeSetting({ id: 7 });
      (getSetting as any).mockResolvedValue(initial);
      const updated = makeSetting({ id: 7, wa_api_version: "v20.0" });
      (updateSetting as any).mockResolvedValue({ message: "ok", data: updated });

      render(<SettingsPage />);
      await waitFor(() => expect(screen.getByTestId("submit-stub")).toBeInTheDocument());

      // Act
      await userEvent.click(screen.getByTestId("submit-stub"));

      // Assert
      await waitFor(() =>
        expect(updateSetting).toHaveBeenCalledWith(7, {
          wa_api_version: "v20.0",
          wa_phone_number_id: "1",
          wa_bearer_token: "t",
          wa_template_name: "tpl",
          wa_appointment_template_name: "",
        }),
      );
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith(
          "Guardado",
          "Configuración actualizada exitosamente.",
        ),
      );
      // The stub still renders after the state update, confirming the page
      // did not throw and `setting` remains non-null (re-fed as `initial`).
      expect(screen.getByTestId("submit-stub")).toBeInTheDocument();
    });

    it("cuando updateSetting rechaza, llama alert.error y no muestra alert.success", async () => {
      // Arrange
      const initial = makeSetting({ id: 7 });
      (getSetting as any).mockResolvedValue(initial);
      const apiError = { data: { message: "Token inválido" } };
      (updateSetting as any).mockRejectedValue(apiError);

      render(<SettingsPage />);
      await waitFor(() => expect(screen.getByTestId("submit-stub")).toBeInTheDocument());

      // Act
      await userEvent.click(screen.getByTestId("submit-stub"));

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", getApiErrorMessage(apiError)),
      );
      expect(alert.success).not.toHaveBeenCalled();
    });
  });
});
