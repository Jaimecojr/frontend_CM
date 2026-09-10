import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SpecialistForm from "@/app/4dnn1n/content/specialists/_components/SpecialistForm";
import type { ApiSpecialist } from "@/app/4dnn1n/content/specialists/fetch";

function createMockSpecialist(overrides: Partial<ApiSpecialist> = {}): ApiSpecialist {
  return {
    id: 1,
    name: "Dr. Gómez",
    specialty: "Pediatría",
    photo: "specialists/photo.jpg",
    photo_filename: "photo.jpg",
    position: 1,
    ...overrides,
  };
}

/** Builds a small in-memory image file for the hidden file input. */
function makeImageFile(name = "photo.png"): File {
  return new File(["binary-content"], name, { type: "image/png" });
}

/** The file input has no accessible label (it sits hidden inside a clickable
 * drop zone), so it can only be located structurally. */
function getFileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

/** The position input has no placeholder, so it is located by its type. */
function getPositionInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector('input[type="number"]') as HTMLInputElement;
}

function getNameInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Nombre del especialista") as HTMLInputElement;
}

function getSpecialtyInput(): HTMLInputElement {
  return screen.getByPlaceholderText("Ej: Cardiología") as HTMLInputElement;
}

describe("SpecialistForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("canSubmit: la foto es obligatoria solo en modo create", () => {
    it("modo create sin ningún campo deja Guardar deshabilitado", () => {
      // Arrange & Act
      render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("modo create con name y specialty pero sin foto seleccionada deja Guardar deshabilitado", () => {
      // Arrange
      render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getNameInput(), { target: { value: "Dr. Pérez" } });
      fireEvent.change(getSpecialtyInput(), { target: { value: "Cardiología" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("modo create con name, specialty, foto y position '1' habilita Guardar", () => {
      // Arrange
      const { container } = render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getNameInput(), { target: { value: "Dr. Pérez" } });
      fireEvent.change(getSpecialtyInput(), { target: { value: "Cardiología" } });
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });
      fireEvent.change(getPositionInput(container), { target: { value: "1" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
    });

    it("modo edit con name, specialty y position válidos pero sin nueva foto habilita Guardar (conserva la foto actual)", () => {
      // Arrange & Act: edit mode never requires a freshly selected file.
      render(<SpecialistForm mode="edit" initial={createMockSpecialist()} onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
    });

    it("position en '0' deshabilita Guardar aunque el resto del formulario sea válido", () => {
      // Arrange: a fully valid create-mode form.
      const { container } = render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);
      fireEvent.change(getNameInput(), { target: { value: "Dr. Pérez" } });
      fireEvent.change(getSpecialtyInput(), { target: { value: "Cardiología" } });
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });
      fireEvent.change(getPositionInput(container), { target: { value: "1" } });
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

      // Act
      fireEvent.change(getPositionInput(container), { target: { value: "0" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("position vacía deshabilita Guardar en modo edit", () => {
      // Arrange: a fully valid edit-mode form.
      const { container } = render(
        <SpecialistForm mode="edit" initial={createMockSpecialist()} onSubmit={vi.fn()} />,
      );
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

      // Act
      fireEvent.change(getPositionInput(container), { target: { value: "" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("borrar name deshabilita Guardar en modo edit aunque el resto siga válido", () => {
      // Arrange: a fully valid edit-mode form.
      render(<SpecialistForm mode="edit" initial={createMockSpecialist()} onSubmit={vi.fn()} />);
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

      // Act
      fireEvent.change(getNameInput(), { target: { value: "" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });
  });

  describe("selección de foto y preview", () => {
    it("modo edit sin archivo seleccionado muestra el preview de la foto actual (initial.photo)", () => {
      // Arrange & Act
      render(
        <SpecialistForm
          mode="edit"
          initial={createMockSpecialist({ photo: "specialists/gomez.jpg" })}
          onSubmit={vi.fn()}
        />,
      );

      // Assert
      const preview = screen.getByAltText("Photo preview") as HTMLImageElement;
      expect(preview.src).toBe("http://localhost:8000/storage/specialists/gomez.jpg");
    });

    it("seleccionar un archivo cambia el preview a la URL blob generada por createObjectURL", () => {
      // Arrange: stub the browser API instead of relying on jsdom's own implementation.
      const blobUrl = "blob:http://localhost:8000/mock-preview";
      vi.spyOn(URL, "createObjectURL").mockReturnValue(blobUrl);
      const { container } = render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });

      // Assert
      const preview = screen.getByAltText("Photo preview") as HTMLImageElement;
      expect(preview.src).toBe(blobUrl);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("submit: payload como FormData", () => {
    it("con foto seleccionada, onSubmit recibe un FormData con photo, name, specialty y position", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = render(<SpecialistForm mode="create" onSubmit={onSubmit} />);
      const file = makeImageFile("carnet.png");
      fireEvent.change(getNameInput(), { target: { value: "Dr. Pérez" } });
      fireEvent.change(getSpecialtyInput(), { target: { value: "Cardiología" } });
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
      fireEvent.change(getPositionInput(container), { target: { value: "1" } });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const formData = onSubmit.mock.calls[0][0] as FormData;
      expect(formData.get("photo")).toBe(file);
      expect(formData.get("name")).toBe("Dr. Pérez");
      expect(formData.get("specialty")).toBe("Cardiología");
      expect(formData.get("position")).toBe("1");
    });

    it("en modo edit sin nueva foto, el FormData no incluye la clave photo", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <SpecialistForm
          mode="edit"
          initial={createMockSpecialist({ name: "Dr. Gómez", specialty: "Pediatría", position: 5 })}
          onSubmit={onSubmit}
        />,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const formData = onSubmit.mock.calls[0][0] as FormData;
      expect(formData.has("photo")).toBe(false);
      expect(formData.get("name")).toBe("Dr. Gómez");
      expect(formData.get("specialty")).toBe("Pediatría");
      expect(formData.get("position")).toBe("5");
    });
  });

  describe("clear: resetea el formulario", () => {
    it("resetea name, specialty a '', position a '1', photoFile/previewSrc a null y limpia el input de archivo", () => {
      // Arrange: fill in every field the way a user would.
      const blobUrl = "blob:http://localhost:8000/mock-preview";
      vi.spyOn(URL, "createObjectURL").mockReturnValue(blobUrl);
      const { container } = render(<SpecialistForm mode="create" onSubmit={vi.fn()} />);
      const file = makeImageFile();
      fireEvent.change(getNameInput(), { target: { value: "Dr. Pérez" } });
      fireEvent.change(getSpecialtyInput(), { target: { value: "Cardiología" } });
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
      fireEvent.change(getPositionInput(container), { target: { value: "3" } });
      expect(getFileInput(container).files?.[0]).toBe(file);

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(getNameInput().value).toBe("");
      expect(getSpecialtyInput().value).toBe("");
      expect(getPositionInput(container).value).toBe("1");
      expect(getFileInput(container).value).toBe("");
      expect(screen.queryByAltText("Photo preview")).not.toBeInTheDocument();
    });
  });
});
