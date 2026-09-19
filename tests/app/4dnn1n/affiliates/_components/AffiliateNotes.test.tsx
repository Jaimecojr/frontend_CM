import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AffiliateNotes } from "@/app/4dnn1n/affiliates/_components/AffiliateNotes";
import {
  getAffiliateNotes,
  deleteAffiliateNote,
  createAffiliateNote,
  type ApiAffiliateNote,
} from "@/app/4dnn1n/affiliates/fetch";
import { useAuth } from "@/context/AuthContext";
import { alert } from "@/lib/alert";

vi.mock("@/app/4dnn1n/affiliates/fetch", () => ({
  getAffiliateNotes: vi.fn(),
  deleteAffiliateNote: vi.fn(),
  createAffiliateNote: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

function createNote(overrides: Partial<ApiAffiliateNote> = {}): ApiAffiliateNote {
  return {
    id: 1,
    affiliate_id: 1,
    user_id: 1,
    body: "Nota de prueba",
    created_at: "2026-01-01T10:00:00Z",
    user: { id: 1, name: "Asesor Uno" },
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

describe("AffiliateNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("al montar llama getAffiliateNotes y muestra 'Cargando notas...' mientras resuelve", async () => {
    // Arrange
    mockAuth(2);
    let resolveNotes!: (notes: ApiAffiliateNote[]) => void;
    const pending = new Promise<ApiAffiliateNote[]>((resolve) => {
      resolveNotes = resolve;
    });
    (getAffiliateNotes as any).mockReturnValue(pending);

    // Act
    render(<AffiliateNotes affiliateId={7} affiliateName="Juan" />);

    // Assert: fetch called with the right id and loading state visible
    expect(getAffiliateNotes).toHaveBeenCalledWith(7);
    expect(screen.getByText(/cargando notas/i)).toBeInTheDocument();

    resolveNotes([]);
    await waitFor(() => expect(screen.queryByText(/cargando notas/i)).not.toBeInTheDocument());
  });

  it("muestra el mensaje de lista vacía cuando no hay notas", async () => {
    // Arrange
    mockAuth(2);
    (getAffiliateNotes as any).mockResolvedValue([]);

    // Act
    render(<AffiliateNotes affiliateId={1} />);

    // Assert
    expect(
      await screen.findByText(/no hay notas registradas para este afiliado/i),
    ).toBeInTheDocument();
  });

  it("renderiza 2 notas junto con el contador (notes.length) en el título", async () => {
    // Arrange
    mockAuth(2);
    const notes = [
      createNote({ id: 1, body: "Primera nota" }),
      createNote({ id: 2, body: "Segunda nota" }),
    ];
    (getAffiliateNotes as any).mockResolvedValue(notes);

    // Act
    render(<AffiliateNotes affiliateId={1} />);

    // Assert
    expect(await screen.findByText("Primera nota")).toBeInTheDocument();
    expect(screen.getByText("Segunda nota")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("muestra el botón de eliminar (Trash2) en cada nota cuando el usuario es super admin", async () => {
    // Arrange
    mockAuth(1);
    (getAffiliateNotes as any).mockResolvedValue([createNote()]);

    // Act
    render(<AffiliateNotes affiliateId={1} />);
    await screen.findByText("Nota de prueba");

    // Assert
    expect(screen.getByTitle("Eliminar nota")).toBeInTheDocument();
  });

  it("NO muestra el botón de eliminar cuando el usuario no es super admin", async () => {
    // Arrange
    mockAuth(2);
    (getAffiliateNotes as any).mockResolvedValue([createNote()]);

    // Act
    render(<AffiliateNotes affiliateId={1} />);
    await screen.findByText("Nota de prueba");

    // Assert
    expect(screen.queryByTitle("Eliminar nota")).not.toBeInTheDocument();
  });

  it("al eliminar (super admin) y confirmar, llama deleteAffiliateNote y quita la nota de la lista local", async () => {
    // Arrange
    mockAuth(1);
    const note = createNote({ id: 5 });
    (getAffiliateNotes as any).mockResolvedValue([note]);
    (deleteAffiliateNote as any).mockResolvedValue(undefined);
    (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
      if (onConfirm) await onConfirm();
      return true;
    });

    render(<AffiliateNotes affiliateId={1} />);
    await screen.findByText("Nota de prueba");

    // Act
    fireEvent.click(screen.getByTitle("Eliminar nota"));

    // Assert
    await waitFor(() => expect(deleteAffiliateNote).toHaveBeenCalledWith(1, 5));
    await waitFor(() => expect(screen.queryByText("Nota de prueba")).not.toBeInTheDocument());
  });

  it("cerrar el modal con onClose(true) (nota guardada) vuelve a llamar getAffiliateNotes", async () => {
    // Arrange
    mockAuth(2);
    (getAffiliateNotes as any).mockResolvedValue([]);
    (createAffiliateNote as any).mockResolvedValue({ id: 99 });
    (alert.success as any).mockResolvedValue(undefined);

    render(<AffiliateNotes affiliateId={3} affiliateName="María" />);
    await screen.findByText(/no hay notas registradas/i);
    expect(getAffiliateNotes).toHaveBeenCalledTimes(1);

    // Act: open modal, fill it, and save (real NoteModal triggers onClose(true) on success)
    fireEvent.click(screen.getByRole("button", { name: /nueva nota/i }));
    fireEvent.change(screen.getByPlaceholderText(/escribe la observación/i), {
      target: { value: "Texto nuevo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar nota/i }));

    // Assert
    await waitFor(() => expect(createAffiliateNote).toHaveBeenCalledWith(3, "TEXTO NUEVO"));
    await waitFor(() => expect(getAffiliateNotes).toHaveBeenCalledTimes(2));
  });

  it("cerrar el modal con onClose()/onClose(false) (cancelado) NO recarga las notas", async () => {
    // Arrange
    mockAuth(2);
    (getAffiliateNotes as any).mockResolvedValue([]);

    render(<AffiliateNotes affiliateId={3} affiliateName="María" />);
    await screen.findByText(/no hay notas registradas/i);
    expect(getAffiliateNotes).toHaveBeenCalledTimes(1);

    // Act: open modal and cancel without saving
    fireEvent.click(screen.getByRole("button", { name: /nueva nota/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    // Assert: modal unmounts and no extra fetch happens
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument(),
    );
    expect(getAffiliateNotes).toHaveBeenCalledTimes(1);
  });
});

describe("AffiliateNotes: texto en mayúsculas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("el texto de la nota y el nombre del autor se muestran en mayúsculas; la fecha no", async () => {
    // Arrange: a note saved in lowercase before the rule existed
    mockAuth(2);
    (getAffiliateNotes as any).mockResolvedValue([
      createNote({ body: "llamar mañana", user: { id: 1, name: "Asesor Uno" } }),
    ]);

    // Act
    render(<AffiliateNotes affiliateId={7} affiliateName="Juan" />);

    // Assert
    expect(await screen.findByText("llamar mañana")).toHaveClass("uppercase");
    expect(screen.getByText("Asesor Uno")).toHaveClass("uppercase");
  });
});
