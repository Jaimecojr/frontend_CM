import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ViewContactPage from "@/app/4dnn1n/contacts/[id]/page";
import { useParams, useRouter } from "next/navigation";
import { getContact, deleteContact } from "@/app/4dnn1n/contacts/fetch";
import { alert } from "@/lib/alert";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import type { ApiContact } from "@/app/4dnn1n/contacts/fetch";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/getApiErrorMessage", () => ({ getApiErrorMessage: vi.fn(() => "Mapped API error") }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/contacts/fetch", () => ({
  getContact: vi.fn(),
  deleteContact: vi.fn(),
}));

function createMockContact(overrides: Partial<ApiContact> = {}): ApiContact {
  return {
    id: 5,
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "3101234567",
    city_id: 1,
    city: { id: 1, name: "Bogotá" },
    subject: "Consulta",
    comment: "Un mensaje de prueba con varias líneas.",
    created_at: "2026-03-05T10:00:00Z",
    updated_at: "2026-03-05T10:00:00Z",
    ...overrides,
  };
}

function mockParams(id: string) {
  (useParams as any).mockReturnValue({ id });
}

describe("ViewContactPage", () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push });
  });

  it("muestra su propio skeleton (animate-pulse) mientras getContact no ha resuelto, sin renderizar los campos", () => {
    // Arrange
    mockParams("5");
    // Left pending on purpose: assertions run before it ever resolves.
    (getContact as any).mockReturnValue(new Promise(() => {}));

    // Act
    const { container } = render(<ViewContactPage />);

    // Assert: this page has its own local skeleton, not `FormPageSkeleton`.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Nombre")).not.toBeInTheDocument();
  });

  it("cuando getContact(5) resuelve, muestra los 6 Field con los valores de data y 'Ciudad' como '-' si city es null", async () => {
    // Arrange
    mockParams("5");
    const contact = createMockContact({ city: null });
    (getContact as any).mockResolvedValue(contact);

    // The expected string is derived from a real `Date` object (same technique
    // as the local `formatDate`) instead of a hardcoded literal, so the
    // assertion is not tied to the machine's timezone.
    const date = new Date(contact.created_at);
    const expectedDate = `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}/${date.getFullYear()}`;

    // Act
    render(<ViewContactPage />);

    // Assert
    expect(getContact).toHaveBeenCalledWith(5);
    await screen.findByText("Nombre");
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Correo")).toBeInTheDocument();
    expect(screen.getByText("juan@example.com")).toBeInTheDocument();
    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.getByText("3101234567")).toBeInTheDocument();
    expect(screen.getByText("Ciudad")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.getByText("Asunto")).toBeInTheDocument();
    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("Fecha de envío")).toBeInTheDocument();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    expect(screen.getByText(contact.comment)).toBeInTheDocument();
  });

  it("cuando getContact rechaza, llama a alert.error y deja data en null tras terminar loading", async () => {
    // Arrange
    mockParams("5");
    const apiError = { data: { message: "No encontrado" } };
    (getContact as any).mockRejectedValue(apiError);

    // Act
    render(<ViewContactPage />);

    // Assert
    await waitFor(() => expect(alert.error).toHaveBeenCalledWith("Error", "Mapped API error"));
    expect(getApiErrorMessage).toHaveBeenCalledWith(apiError);
    expect(
      await screen.findByText("No se pudo cargar el mensaje o no existe."),
    ).toBeInTheDocument();
  });

  it("click en 'Eliminar mensaje' confirma, llama a deleteContact(data.id) directamente y redirige tras el éxito", async () => {
    // Arrange
    mockParams("5");
    const contact = createMockContact({ id: 5 });
    (getContact as any).mockResolvedValue(contact);
    (deleteContact as any).mockResolvedValue(undefined);
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      await onConfirm();
      return true;
    });

    render(<ViewContactPage />);
    await screen.findByText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: /eliminar mensaje/i }));

    // Assert: no list to update here — the handler calls `deleteContact`
    // directly, unlike the optimistic list update in `page.tsx`.
    await waitFor(() => expect(deleteContact).toHaveBeenCalledWith(5));
    expect(alert.success).toHaveBeenCalledWith("Eliminado", "Mensaje eliminado correctamente.");
    expect(push).toHaveBeenCalledWith("/4dnn1n/contacts");
  });
});

describe("ViewContactPage: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nombre, ciudad, asunto y mensaje se muestran en mayúsculas; correo y teléfono no", async () => {
    // Arrange
    mockParams("5");
    const contact = createMockContact();
    (getContact as any).mockResolvedValue(contact);

    // Act
    render(<ViewContactPage />);
    await screen.findByText("Nombre");

    // Assert
    expect(screen.getByText("Juan Pérez")).toHaveClass("uppercase");
    expect(screen.getByText("Bogotá")).toHaveClass("uppercase");
    expect(screen.getByText("Consulta")).toHaveClass("uppercase");
    expect(screen.getByText(contact.comment)).toHaveClass("uppercase");
    expect(screen.getByText("juan@example.com")).not.toHaveClass("uppercase");
    expect(screen.getByText("3101234567")).not.toHaveClass("uppercase");
  });
});
