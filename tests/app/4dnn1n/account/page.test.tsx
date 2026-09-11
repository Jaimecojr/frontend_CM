import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccountPage from "@/app/4dnn1n/account/page";
import { updateUsername, changePassword } from "@/app/4dnn1n/account/fetch";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

// A relative `./fetch` specifier in the test file would resolve against this
// test's own directory (mirror-folder convention), never intercepting the
// page's real `./fetch` import — the alias is required for the mock to apply.
vi.mock("@/app/4dnn1n/account/fetch", () => ({ updateUsername: vi.fn(), changePassword: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as any).mockReturnValue({
    user: { id: 5, name: "Ana", email: "ana@test.com", user: "ana_admin", type: 1 },
    loading: false,
    isLoggingOut: false,
    refreshUser: vi.fn().mockResolvedValue(undefined),
    logoutUser: vi.fn(),
    ...overrides,
  });
}

// The password section's <label> elements have no `htmlFor`/`id` pairing with
// their <input>s (siblings, not wrapped), so `getByLabelText` cannot find
// them — fields are located by their fixed DOM order instead. Input index 0
// is always the username field (Section A); the password form, once
// expanded, renders current/new/confirm right after it in that order.
function getPasswordInputs(container: HTMLElement) {
  const inputs = Array.from(container.querySelectorAll("input")) as HTMLInputElement[];
  const [, current, newPassword, confirm] = inputs;
  return { current, newPassword, confirm };
}

async function expandPasswordSection() {
  const utils = render(<AccountPage />);
  await userEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
  return utils;
}

describe("AccountPage", () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push });
    mockAuth();
  });

  // ──── Section A: username ────
  describe("sección de nombre de usuario", () => {
    it("prellena el input con user.user y valida longitud mínima", async () => {
      // Arrange
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveValue("ana_admin");

      // Act: clear and type a value shorter than 3 chars, then submit
      await userEvent.clear(input);
      await userEvent.type(input, "ab");
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      expect(
        await screen.findByText("El nombre de usuario debe tener al menos 3 caracteres."),
      ).toBeInTheDocument();
      expect(updateUsername).not.toHaveBeenCalled();
    });

    it("limpia el mensaje de error al escribir de nuevo en el input", async () => {
      // Arrange: trigger the validation error first
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "ab");
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));
      expect(
        await screen.findByText("El nombre de usuario debe tener al menos 3 caracteres."),
      ).toBeInTheDocument();

      // Act
      await userEvent.type(input, "c");

      // Assert
      expect(
        screen.queryByText("El nombre de usuario debe tener al menos 3 caracteres."),
      ).not.toBeInTheDocument();
    });

    it("en un envío exitoso llama updateUsername, refreshUser, alert.success y navega a /4dnn1n/home", async () => {
      // Arrange
      (updateUsername as any).mockResolvedValue(undefined);
      const refreshUser = vi.fn().mockResolvedValue(undefined);
      mockAuth({ refreshUser });
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "nuevo_user");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      await waitFor(() => expect(updateUsername).toHaveBeenCalledWith(5, "nuevo_user"));
      expect(refreshUser).toHaveBeenCalled();
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith(
          "Guardado",
          "Nombre de usuario actualizado correctamente.",
        ),
      );
      expect(push).toHaveBeenCalledWith("/4dnn1n/home");
    });

    it("cuando updateUsername rechaza con errors.user como array, fija usernameError al primer elemento y no llama alert.error", async () => {
      // Arrange
      (updateUsername as any).mockRejectedValue({
        data: { errors: { user: ["Ya existe otro usuario con ese nombre.", "otro mensaje"] } },
      });
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "nuevo_user");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      expect(
        await screen.findByText("Ya existe otro usuario con ese nombre."),
      ).toBeInTheDocument();
      expect(alert.error).not.toHaveBeenCalled();
    });

    it("cuando updateUsername rechaza con errors.user como string plano, fija usernameError con String(fieldErr)", async () => {
      // Arrange
      (updateUsername as any).mockRejectedValue({
        data: { errors: { user: "mensaje plano" } },
      });
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "nuevo_user");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      expect(await screen.findByText("mensaje plano")).toBeInTheDocument();
      expect(alert.error).not.toHaveBeenCalled();
    });

    it("cuando updateUsername rechaza sin errors.user, llama alert.error con getApiErrorMessage y no modifica usernameError", async () => {
      // Arrange
      const apiError = { data: { message: "Error interno" } };
      (updateUsername as any).mockRejectedValue(apiError);
      render(<AccountPage />);
      const input = screen.getByRole("textbox");
      await userEvent.clear(input);
      await userEvent.type(input, "nuevo_user");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", getApiErrorMessage(apiError)),
      );
      expect(
        screen.queryByText("El nombre de usuario debe tener al menos 3 caracteres."),
      ).not.toBeInTheDocument();
    });
  });

  // ──── Section B: password ────
  describe("sección de contraseña", () => {
    it("está colapsada por defecto y se expande/colapsa reseteando campos y errores al hacer click en el botón", async () => {
      // Arrange
      const { container } = render(<AccountPage />);
      expect(
        screen.getByText(
          'Haz clic en "Cambiar contraseña" para actualizar tu contraseña de acceso.',
        ),
      ).toBeInTheDocument();
      const toggleButton = screen.getByRole("button", { name: /cambiar contraseña/i });
      expect(toggleButton).toBeInTheDocument();

      // Act: expand
      await userEvent.click(toggleButton);

      // Assert: form visible with 3 fields, button now reads "Cancelar"
      const { current, newPassword, confirm } = getPasswordInputs(container);
      expect(current).toBeInTheDocument();
      expect(newPassword).toBeInTheDocument();
      expect(confirm).toBeInTheDocument();
      const cancelButton = screen.getByRole("button", { name: /cancelar/i });
      expect(cancelButton).toBeInTheDocument();

      // Act: type something and trigger a validation error, then collapse
      await userEvent.type(current, "abc123");
      await userEvent.type(newPassword, "abc");
      await userEvent.type(confirm, "xyz");
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));
      expect(
        await screen.findByText("La contraseña debe tener al menos 6 caracteres."),
      ).toBeInTheDocument();
      expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
      await userEvent.click(cancelButton);

      // Assert: form gone, placeholder text back
      expect(
        screen.getByText(
          'Haz clic en "Cambiar contraseña" para actualizar tu contraseña de acceso.',
        ),
      ).toBeInTheDocument();
      expect(getPasswordInputs(container).current).toBeUndefined();

      // Act: expand again — fields and passwordErrors must be reset, not carrying the
      // previous value/errors in either direction of the toggle.
      await userEvent.click(screen.getByRole("button", { name: /cambiar contraseña/i }));
      expect(getPasswordInputs(container).current).toHaveValue("");
      expect(
        screen.queryByText("La contraseña debe tener al menos 6 caracteres."),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Las contraseñas no coinciden.")).not.toBeInTheDocument();
    });

    it("muestra error de longitud mínima cuando newPassword tiene menos de 6 caracteres", async () => {
      // Arrange
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual1");
      await userEvent.type(newPassword, "abc");
      await userEvent.type(confirm, "abc");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      expect(
        await screen.findByText("La contraseña debe tener al menos 6 caracteres."),
      ).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("muestra error de confirmación cuando newPassword no coincide con confirmPassword", async () => {
      // Arrange
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual1");
      await userEvent.type(newPassword, "abcdef");
      await userEvent.type(confirm, "xyzxyz");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      expect(await screen.findByText("Las contraseñas no coinciden.")).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("muestra ambos errores simultáneamente cuando newPassword es corta Y no coincide con confirmPassword", async () => {
      // Arrange
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual1");
      await userEvent.type(newPassword, "abc");
      await userEvent.type(confirm, "xyz");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      expect(
        await screen.findByText("La contraseña debe tener al menos 6 caracteres."),
      ).toBeInTheDocument();
      expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it("al escribir en un campo solo limpia el error de ese campo, no los otros", async () => {
      // Arrange: trigger both errors first
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual1");
      await userEvent.type(newPassword, "abc");
      await userEvent.type(confirm, "xyz");
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));
      expect(
        await screen.findByText("La contraseña debe tener al menos 6 caracteres."),
      ).toBeInTheDocument();
      expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();

      // Act: type in the "new password" field only
      await userEvent.type(newPassword, "d");

      // Assert: only the "new" error is cleared, "confirm" error remains
      expect(
        screen.queryByText("La contraseña debe tener al menos 6 caracteres."),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Las contraseñas no coinciden.")).toBeInTheDocument();
    });

    it("en un envío exitoso llama changePassword, vacía los campos, colapsa la sección, muestra alert.success y navega a /4dnn1n/home", async () => {
      // Arrange
      (changePassword as any).mockResolvedValue(undefined);
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual123");
      await userEvent.type(newPassword, "nueva123");
      await userEvent.type(confirm, "nueva123");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      await waitFor(() =>
        expect(changePassword).toHaveBeenCalledWith("actual123", "nueva123"),
      );
      await waitFor(() =>
        expect(alert.success).toHaveBeenCalledWith(
          "Guardado",
          "Contraseña actualizada correctamente.",
        ),
      );
      expect(push).toHaveBeenCalledWith("/4dnn1n/home");
      // Section collapses back to its placeholder text.
      expect(
        screen.getByText(
          'Haz clic en "Cambiar contraseña" para actualizar tu contraseña de acceso.',
        ),
      ).toBeInTheDocument();
    });

    it("cuando changePassword rechaza con errors.current_password como array, fija passwordErrors.current al primer elemento y no llama alert.error", async () => {
      // Arrange
      (changePassword as any).mockRejectedValue({
        data: { errors: { current_password: ["Contraseña actual incorrecta.", "otro mensaje"] } },
      });
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "malapass");
      await userEvent.type(newPassword, "nueva123");
      await userEvent.type(confirm, "nueva123");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      expect(await screen.findByText("Contraseña actual incorrecta.")).toBeInTheDocument();
      expect(alert.error).not.toHaveBeenCalled();
    });

    it("cuando changePassword rechaza con errors.current_password como string plano, fija passwordErrors.current con String(fieldErr)", async () => {
      // Arrange
      (changePassword as any).mockRejectedValue({
        data: { errors: { current_password: "mensaje plano" } },
      });
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "malapass");
      await userEvent.type(newPassword, "nueva123");
      await userEvent.type(confirm, "nueva123");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      expect(await screen.findByText("mensaje plano")).toBeInTheDocument();
      expect(alert.error).not.toHaveBeenCalled();
    });

    it("cuando changePassword rechaza sin errors.current_password, llama alert.error con getApiErrorMessage", async () => {
      // Arrange
      const apiError = { data: { message: "Error interno" } };
      (changePassword as any).mockRejectedValue(apiError);
      const { container } = await expandPasswordSection();
      const { current, newPassword, confirm } = getPasswordInputs(container);
      await userEvent.type(current, "actual123");
      await userEvent.type(newPassword, "nueva123");
      await userEvent.type(confirm, "nueva123");

      // Act
      await userEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", getApiErrorMessage(apiError)),
      );
    });

    it("cada uno de los 3 toggles de visibilidad alterna su propio campo de forma independiente", async () => {
      // Arrange
      const { container } = await expandPasswordSection();
      const { current: currentInput, newPassword: newInput, confirm: confirmInput } =
        getPasswordInputs(container);
      expect(currentInput).toHaveAttribute("type", "password");
      expect(newInput).toHaveAttribute("type", "password");
      expect(confirmInput).toHaveAttribute("type", "password");

      // The eye toggle buttons are the ones without an accessible name (icon-only).
      const iconButtons = screen.getAllByRole("button", { name: "" });
      expect(iconButtons).toHaveLength(3);
      const [currentToggle, newToggle, confirmToggle] = iconButtons;

      // Act + Assert: toggling "current" only affects "current"
      await userEvent.click(currentToggle);
      expect(currentInput).toHaveAttribute("type", "text");
      expect(newInput).toHaveAttribute("type", "password");
      expect(confirmInput).toHaveAttribute("type", "password");

      // Act + Assert: toggling "new" only affects "new"
      await userEvent.click(newToggle);
      expect(currentInput).toHaveAttribute("type", "text");
      expect(newInput).toHaveAttribute("type", "text");
      expect(confirmInput).toHaveAttribute("type", "password");

      // Act + Assert: toggling "confirm" only affects "confirm"
      await userEvent.click(confirmToggle);
      expect(currentInput).toHaveAttribute("type", "text");
      expect(newInput).toHaveAttribute("type", "text");
      expect(confirmInput).toHaveAttribute("type", "text");

      // Act + Assert: toggling "current" back off leaves the others untouched
      await userEvent.click(currentToggle);
      expect(currentInput).toHaveAttribute("type", "password");
      expect(newInput).toHaveAttribute("type", "text");
      expect(confirmInput).toHaveAttribute("type", "text");
    });
  });
});
