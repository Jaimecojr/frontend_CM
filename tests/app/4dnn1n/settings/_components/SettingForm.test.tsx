import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import SettingForm from "@/app/4dnn1n/settings/_components/SettingForm";
import type { ApiSetting } from "@/app/4dnn1n/settings/fetch";

/**
 * Locates a field by its `<Label>` text: the label sits right before the
 * input inside a shared `<div>` container, so its parent element is that
 * container (same pattern as other form-component tests in this suite).
 */
function getFieldContainer(labelText: RegExp): HTMLElement {
  const label = screen.getByText(labelText, { selector: "label" });
  return label.parentElement as HTMLElement;
}

/** Builds a fully valid `ApiSetting` so tests only override what they need. */
function makeInitial(overrides: Partial<ApiSetting> = {}): ApiSetting {
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

describe("SettingForm", () => {
  describe("prellenado inicial", () => {
    it("prellena los 5 campos desde `initial`, mostrando '' para wa_appointment_template_name: null", () => {
      // Arrange
      const initial = makeInitial({ wa_appointment_template_name: null });

      // Act
      render(<SettingForm initial={initial} onSubmit={vi.fn()} />);

      // Assert
      expect(getFieldContainer(/^versión api whatsapp/i).querySelector("input")).toHaveValue(
        "v18.0",
      );
      expect(getFieldContainer(/^id número de teléfono/i).querySelector("input")).toHaveValue(
        "123456789",
      );
      expect(getFieldContainer(/^bearer token/i).querySelector("input")).toHaveValue(
        "secret-token",
      );
      expect(getFieldContainer(/^template carnet/i).querySelector("input")).toHaveValue(
        "carnet_template",
      );
      // `?? ""` in the initial `useState` prevents rendering the literal string "null".
      expect(
        getFieldContainer(/^template confirmación de cita/i).querySelector("input"),
      ).toHaveValue("");
    });
  });

  describe("canSubmit", () => {
    it.each([
      ["wa_api_version", /^versión api whatsapp/i],
      ["wa_phone_number_id", /^id número de teléfono/i],
      ["wa_bearer_token", /^bearer token/i],
      ["wa_template_name", /^template carnet/i],
    ])("vaciar %s deshabilita el botón 'Guardar'", (_field, labelText) => {
      // Arrange: all 4 required fields start valid.
      render(<SettingForm initial={makeInitial()} onSubmit={vi.fn()} />);
      const saveButton = screen.getByRole("button", { name: /^guardar$/i });
      expect(saveButton).not.toBeDisabled();

      // Act
      const input = getFieldContainer(labelText).querySelector("input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });

      // Assert
      expect(saveButton).toBeDisabled();
    });

    it("con los 4 campos obligatorios completos y wa_appointment_template_name vacío, 'Guardar' está habilitado", () => {
      // Arrange & Act
      render(
        <SettingForm
          initial={makeInitial({ wa_appointment_template_name: "" })}
          onSubmit={vi.fn()}
        />,
      );

      // Assert: the 5th field is confirmed non-required.
      expect(screen.getByRole("button", { name: /^guardar$/i })).not.toBeDisabled();
    });
  });

  describe("submit y estado saving", () => {
    it("con canSubmit true, click en 'Guardar' invoca onSubmit con el form completo (sin id)", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(<SettingForm initial={makeInitial()} onSubmit={onSubmit} />);

      // Act
      fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({
        wa_api_version: "v18.0",
        wa_phone_number_id: "123456789",
        wa_bearer_token: "secret-token",
        wa_template_name: "carnet_template",
        wa_appointment_template_name: "confirmacion_cita",
      });
    });

    it("mientras onSubmit está pendiente, el botón muestra 'Guardando...' y queda deshabilitado; al resolver vuelve a 'Guardar' habilitado", async () => {
      // Arrange
      let resolveSubmit!: () => void;
      const onSubmit = vi.fn(
        () => new Promise<void>((res) => { resolveSubmit = res; }),
      );
      render(<SettingForm initial={makeInitial()} onSubmit={onSubmit} />);

      // Act
      fireEvent.click(screen.getByRole("button", { name: /^guardar$/i }));

      // Assert: pending state
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
      });

      // Act: resolve the pending submit (the `finally` resets `saving`)
      await act(async () => {
        resolveSubmit();
        await Promise.resolve();
      });

      // Assert: back to normal
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^guardar$/i })).not.toBeDisabled();
      });
    });

    it("con canSubmit false, el botón está deshabilitado y un click no invoca onSubmit", () => {
      // Arrange: emptying a required field makes canSubmit false.
      const onSubmit = vi.fn();
      render(<SettingForm initial={makeInitial()} onSubmit={onSubmit} />);
      const input = getFieldContainer(/^bearer token/i).querySelector(
        "input",
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "" } });
      const saveButton = screen.getByRole("button", { name: /^guardar$/i });
      expect(saveButton).toBeDisabled();

      // Act: a click on a disabled button never fires the React handler.
      fireEvent.click(saveButton);

      // Assert
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("toggle de visibilidad del token", () => {
    it("alterna entre type='password'/'text' y el ícono Eye/EyeOff en cada click", () => {
      // Arrange
      render(<SettingForm initial={makeInitial()} onSubmit={vi.fn()} />);
      const tokenContainer = getFieldContainer(/^bearer token/i);
      const tokenInput = tokenContainer.querySelector("input") as HTMLInputElement;
      const toggleButton = tokenContainer.querySelector("button") as HTMLButtonElement;

      // Assert: starts masked, showing the "Eye" (closed/show) icon.
      expect(tokenInput).toHaveAttribute("type", "password");
      expect(toggleButton.querySelector("svg")).toHaveClass("lucide-eye");
      expect(toggleButton.querySelector("svg")).not.toHaveClass("lucide-eye-off");

      // Act: reveal the token
      fireEvent.click(toggleButton);

      // Assert: revealed, "EyeOff" icon
      expect(tokenInput).toHaveAttribute("type", "text");
      expect(toggleButton.querySelector("svg")).toHaveClass("lucide-eye-off");

      // Act: hide it again
      fireEvent.click(toggleButton);

      // Assert: back to masked, "Eye" icon
      expect(tokenInput).toHaveAttribute("type", "password");
      expect(toggleButton.querySelector("svg")).toHaveClass("lucide-eye");
      expect(toggleButton.querySelector("svg")).not.toHaveClass("lucide-eye-off");
    });
  });
});
