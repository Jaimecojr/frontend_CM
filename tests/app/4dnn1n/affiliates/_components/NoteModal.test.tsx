import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NoteModal } from "@/app/4dnn1n/affiliates/_components/NoteModal";
import { createAffiliateNote } from "@/app/4dnn1n/affiliates/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  createAffiliateNote: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function renderModal(onClose = vi.fn()) {
  render(<NoteModal affiliateId={1} affiliateName="Juan Pérez" onClose={onClose} />);
  return { onClose };
}

function getSaveButton() {
  return screen.getByRole("button", { name: /guardar nota/i });
}

function getTextarea() {
  return screen.getByPlaceholderText(/escribe la observación/i);
}

describe("NoteModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createAffiliateNote as any).mockResolvedValue({ id: 1 });
    (alert.success as any).mockResolvedValue(undefined);
    (alert.error as any).mockResolvedValue(undefined);
  });

  it("renderiza con el botón 'Guardar nota' deshabilitado cuando el body está vacío", () => {
    // Arrange & Act
    renderModal();

    // Assert
    expect(getSaveButton()).toBeDisabled();
  });

  it("habilita el botón 'Guardar nota' al escribir texto en el textarea", () => {
    // Arrange
    renderModal();

    // Act
    fireEvent.change(getTextarea(), { target: { value: "Observación importante" } });

    // Assert
    expect(getSaveButton()).not.toBeDisabled();
  });

  it("mantiene deshabilitado el botón si el texto es solo espacios", () => {
    // Arrange
    renderModal();

    // Act
    fireEvent.change(getTextarea(), { target: { value: "   " } });

    // Assert
    expect(getSaveButton()).toBeDisabled();
  });

  it("al guardar con texto válido llama createAffiliateNote, luego alert.success y onClose(true)", async () => {
    // Arrange
    const { onClose } = renderModal();
    fireEvent.change(getTextarea(), { target: { value: "  Nueva observación  " } });

    // Act
    fireEvent.click(getSaveButton());

    // Assert
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(createAffiliateNote).toHaveBeenCalledWith(1, "Nueva observación");
    expect(alert.success).toHaveBeenCalled();
    const callOrder =
      (createAffiliateNote as any).mock.invocationCallOrder[0] <
        (alert.success as any).mock.invocationCallOrder[0] &&
      (alert.success as any).mock.invocationCallOrder[0] <
        (onClose as any).mock.invocationCallOrder[0];
    expect(callOrder).toBe(true);
  });

  it("si createAffiliateNote rechaza, llama alert.error con el mensaje de getApiErrorMessage y NO llama onClose", async () => {
    // Arrange
    const apiError = { data: { message: "No se pudo guardar" } };
    (createAffiliateNote as any).mockRejectedValue(apiError);
    const { onClose } = renderModal();
    fireEvent.change(getTextarea(), { target: { value: "Texto válido" } });

    // Act
    fireEvent.click(getSaveButton());

    // Assert
    await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", getApiErrorMessage(apiError)));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("al hacer click en 'Cancelar' o en la X llama onClose sin argumentos", () => {
    // Arrange
    const { onClose } = renderModal();

    // Act
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    // Assert
    expect(onClose).toHaveBeenCalledWith();
    expect(onClose).toHaveBeenCalledTimes(1);

    // Act: close button (X) — has no accessible name, select by remaining button
    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((btn) => btn.querySelector("svg.lucide-x"));
    fireEvent.click(closeButton!);

    // Assert
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("click en el backdrop llama onClose; click dentro del modal no lo hace", () => {
    // Arrange
    const { onClose } = renderModal();
    const backdrop = screen.getByText(/juan pérez/i).closest(".fixed") as HTMLElement;

    // Act: click inside the modal content should not close it
    fireEvent.click(screen.getByText(/nueva nota/i));

    // Assert
    expect(onClose).not.toHaveBeenCalled();

    // Act: click directly on the backdrop (target === currentTarget)
    fireEvent.click(backdrop);

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
