import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AllyForm from "@/app/4dnn1n/content/allies/_components/AllyForm";
import type { ApiAlly } from "@/app/4dnn1n/content/allies/fetch";

function createMockAlly(overrides: Partial<ApiAlly> = {}): ApiAlly {
  return {
    id: 1,
    image: "allies/banner.jpg",
    image_filename: "banner.jpg",
    url: "https://empresa.com",
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

function getUrlInput(): HTMLInputElement {
  return screen.getByPlaceholderText("https://empresa.com") as HTMLInputElement;
}

function getPositionInput(): HTMLInputElement {
  return screen.getByPlaceholderText("1") as HTMLInputElement;
}

describe("AllyForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("canSubmit: la imagen es obligatoria solo en modo create", () => {
    it("modo create sin url deja Guardar deshabilitado", () => {
      // Arrange & Act
      render(<AllyForm mode="create" onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("modo create con url pero sin imagen seleccionada deja Guardar deshabilitado", () => {
      // Arrange
      render(<AllyForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getUrlInput(), { target: { value: "https://empresa.com" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("modo create con url, imagen seleccionada y position '1' habilita Guardar", () => {
      // Arrange
      const { container } = render(<AllyForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getUrlInput(), { target: { value: "https://empresa.com" } });
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });
      fireEvent.change(getPositionInput(), { target: { value: "1" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
    });

    it("modo edit con url y position válidos pero sin nueva imagen habilita Guardar (conserva la imagen actual)", () => {
      // Arrange & Act: edit mode never requires a freshly selected file.
      render(<AllyForm mode="edit" initial={createMockAlly()} onSubmit={vi.fn()} />);

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();
    });

    it("position en '0' deshabilita Guardar aunque el resto del formulario sea válido", () => {
      // Arrange: a fully valid create-mode form.
      const { container } = render(<AllyForm mode="create" onSubmit={vi.fn()} />);
      fireEvent.change(getUrlInput(), { target: { value: "https://empresa.com" } });
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });
      fireEvent.change(getPositionInput(), { target: { value: "1" } });
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

      // Act
      fireEvent.change(getPositionInput(), { target: { value: "0" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });

    it("position vacía deshabilita Guardar en modo edit", () => {
      // Arrange: a fully valid edit-mode form.
      render(<AllyForm mode="edit" initial={createMockAlly()} onSubmit={vi.fn()} />);
      expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

      // Act: the position input strips non-digits, so an empty value is reachable.
      fireEvent.change(getPositionInput(), { target: { value: "" } });

      // Assert
      expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
    });
  });

  describe("selección de imagen y preview", () => {
    it("modo edit sin archivo seleccionado muestra el preview de la imagen actual (initial.image)", () => {
      // Arrange & Act
      render(
        <AllyForm
          mode="edit"
          initial={createMockAlly({ image: "banner.jpg" })}
          onSubmit={vi.fn()}
        />,
      );

      // Assert
      const preview = screen.getByAltText("Preview") as HTMLImageElement;
      expect(preview.src).toBe("http://localhost:8000/storage/banner.jpg");
    });

    it("seleccionar un archivo cambia el preview a la URL blob generada por createObjectURL", () => {
      // Arrange: stub the browser API instead of relying on jsdom's own implementation.
      const blobUrl = "blob:http://localhost:8000/mock-preview";
      vi.spyOn(URL, "createObjectURL").mockReturnValue(blobUrl);
      const { container } = render(<AllyForm mode="create" onSubmit={vi.fn()} />);

      // Act
      fireEvent.change(getFileInput(container), { target: { files: [makeImageFile()] } });

      // Assert
      const preview = screen.getByAltText("Preview") as HTMLImageElement;
      expect(preview.src).toBe(blobUrl);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe("submit: payload como FormData", () => {
    it("con imagen seleccionada, onSubmit recibe un FormData con image, url y position", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const { container } = render(<AllyForm mode="create" onSubmit={onSubmit} />);
      const file = makeImageFile("logo.png");
      fireEvent.change(getUrlInput(), { target: { value: "https://empresa.com" } });
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
      fireEvent.change(getPositionInput(), { target: { value: "2" } });

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const formData = onSubmit.mock.calls[0][0] as FormData;
      expect(formData.get("image")).toBe(file);
      expect(formData.get("url")).toBe("https://empresa.com");
      expect(formData.get("position")).toBe("2");
    });

    it("en modo edit sin nueva imagen, el FormData no incluye la clave image", async () => {
      // Arrange
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      render(
        <AllyForm
          mode="edit"
          initial={createMockAlly({ url: "https://empresa.com", position: 5 })}
          onSubmit={onSubmit}
        />,
      );

      // Act
      fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

      // Assert
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      const formData = onSubmit.mock.calls[0][0] as FormData;
      expect(formData.has("image")).toBe(false);
      expect(formData.get("url")).toBe("https://empresa.com");
      expect(formData.get("position")).toBe("5");
    });
  });

  describe("clear: resetea el formulario", () => {
    it("resetea url, position, imageFile/previewSrc y limpia el input de archivo", () => {
      // Arrange: fill in every field the way a user would.
      const blobUrl = "blob:http://localhost:8000/mock-preview";
      vi.spyOn(URL, "createObjectURL").mockReturnValue(blobUrl);
      const { container } = render(<AllyForm mode="create" onSubmit={vi.fn()} />);
      const file = makeImageFile();
      fireEvent.change(getUrlInput(), { target: { value: "https://empresa.com" } });
      fireEvent.change(getFileInput(container), { target: { files: [file] } });
      fireEvent.change(getPositionInput(), { target: { value: "3" } });
      expect(getFileInput(container).files?.[0]).toBe(file);

      // Act
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));

      // Assert
      expect(getUrlInput().value).toBe("");
      expect(getPositionInput().value).toBe("1");
      expect(getFileInput(container).value).toBe("");
      expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
    });
  });
});
