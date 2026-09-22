import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SpecialtyForm from "@/app/4dnn1n/doctors/specialties/_components/SpecialtyForm";
import { alert } from "@/lib/alert";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

// The component only imports `ApiSpecialty` as a type from `fetch.ts` (no
// runtime export is used), so unlike the other forms in this phase there is
// no fetch module to mock here. Only `@/lib/alert` needs a mock, since
// `onFormSubmit` calls `alert.warn` when the name is empty.
vi.mock("@/lib/alert", () => ({
  alert: { warn: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn(), confirm: vi.fn() },
}));

/** Locates the name input by placeholder — the form has a single input. */
function getNameInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Ej: Cardiología") as HTMLInputElement;
}

/**
 * Submits the real `<form>` element directly, bypassing the submit button.
 * Unlike every other form in this phase (which use `type="button"` +
 * `onClick`), `SpecialtyForm` renders a real `<form onSubmit={...}>` with
 * `e.preventDefault()`, so the behavior under test is the form's `submit`
 * event rather than a button click.
 */
function submitForm(container: HTMLElement) {
  const form = container.querySelector("form") as HTMLFormElement;
  fireEvent.submit(form);
}

describe("SpecialtyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("texto del botón según initial", () => {
    it("sin initial: el botón muestra 'Crear Especialidad'", () => {
      // Arrange & Act
      render(<SpecialtyForm onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /crear especialidad/i })).toBeInTheDocument();
    });

    it("con initial: el botón muestra 'Guardar Cambios'", () => {
      // Arrange
      const initial: ApiSpecialty = { id: 1, name: "Cardiología", state: 1 };

      // Act
      render(<SpecialtyForm initial={initial} onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();
    });
  });

  describe("canSubmit y submit del form", () => {
    it("name vacío o solo espacios deja el botón deshabilitado (canSubmit false)", () => {
      // Arrange
      render(<SpecialtyForm onSubmit={vi.fn()} />);
      const saveButton = screen.getByRole("button", { name: /crear especialidad/i });

      // Assert: initial empty name
      expect(saveButton).toBeDisabled();

      // Act & Assert: whitespace-only name still fails `trim().length > 0`
      fireEvent.change(getNameInput(), { target: { value: "   " } });
      expect(saveButton).toBeDisabled();
    });

    it("disparar el evento submit del form con name vacío alerta y no invoca onSubmit", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = render(<SpecialtyForm onSubmit={onSubmit} />);

      // Act: fire the form's native `submit` event directly (not a button click)
      submitForm(container);

      // Assert
      await waitFor(() => {
        expect(alert.warn).toHaveBeenCalledWith(
          "Faltan datos",
          "El nombre de la especialidad es obligatorio.",
        );
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("con name válido (con espacios), el submit del form invoca onSubmit con el payload recortado y en mayúsculas", async () => {
      // Arrange: the name field is an UppercaseInput, so typed text is uppercased in place
      // (see UppercasesAttributes in the backend model, mirrored here for immediate feedback).
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = render(<SpecialtyForm onSubmit={onSubmit} />);
      fireEvent.change(getNameInput(), { target: { value: "  Cardiología  " } });

      // Act
      submitForm(container);

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(onSubmit).toHaveBeenCalledWith({ name: "CARDIOLOGÍA", state: 1 });
      expect(alert.warn).not.toHaveBeenCalled();
    });
  });

  describe("estado loading", () => {
    it("loading true: muestra el ícono Loader2 girando y deshabilita el input y el botón", () => {
      // Arrange & Act
      const { container } = render(<SpecialtyForm onSubmit={vi.fn()} loading />);

      // Assert: spinning Loader2 icon replaces the Save icon
      expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
      // The button stays disabled even with a valid name, because `isBusy` is true.
      expect(screen.getByRole("button", { name: /crear especialidad/i })).toBeDisabled();
      expect(getNameInput()).toBeDisabled();
    });
  });
});
