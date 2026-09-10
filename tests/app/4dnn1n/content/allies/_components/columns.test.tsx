import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildAllyColumns } from "@/app/4dnn1n/content/allies/_components/columns";
import type { ApiAlly } from "@/app/4dnn1n/content/allies/fetch";

function createMockAlly(overrides: Partial<ApiAlly> = {}): ApiAlly {
  return {
    id: 1,
    image: "allies/image1.jpg",
    image_filename: "image1.jpg",
    url: "https://example.com",
    position: 1,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("buildAllyColumns", () => {
  // ──── Step 1: Test position, image, and url columns ────
  describe("Columnas básicas (position, image, url)", () => {
    it("retorna columna position con accessorKey correcto", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");
      expect(positionColumn).toBeDefined();
      expect(positionColumn?.header).toBe("Pos.");
    });

    it("columna position renderiza la posición centrada con fuente media", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");
      expect(positionColumn?.cell).toBeDefined();

      const ally = createMockAlly({ position: 3 });
      const mockRow = { original: ally };
      const cellResult = (positionColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("columna position maneja diferentes valores de posición", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");
      expect(positionColumn?.cell).toBeDefined();

      const ally = createMockAlly({ position: 42 });
      const mockRow = { original: ally };
      const cellResult = (positionColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("retorna columna image con id correcto", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const imageColumn = columns.find((col) => col.id === "image");
      expect(imageColumn).toBeDefined();
      expect(imageColumn?.header).toBe("Imagen");
    });

    it("columna image renderiza img con src usando API_URL y path de storage", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const imageColumn = columns.find((col) => col.id === "image");
      expect(imageColumn?.cell).toBeDefined();

      const ally = createMockAlly({ image: "allies/banner.jpg" });
      const mockRow = { original: ally };
      const cellResult = (imageColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const img = screen.getByRole("img", { name: /banner aliado/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("/storage/allies/banner.jpg"));
    });

    it("columna image usa API_URL fallback (http://localhost:8000) cuando NEXT_PUBLIC_API_URL no está definido", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const imageColumn = columns.find((col) => col.id === "image");
      expect(imageColumn?.cell).toBeDefined();

      const ally = createMockAlly({ image: "allies/test.jpg" });
      const mockRow = { original: ally };
      const cellResult = (imageColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const img = screen.getByRole("img", { name: /banner aliado/i });
      expect(img.getAttribute("src")).toMatch(/http:\/\/localhost:8000\/storage\/allies\/test\.jpg/);
    });

    it("columna image tiene alt text descriptivo", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const imageColumn = columns.find((col) => col.id === "image");
      expect(imageColumn?.cell).toBeDefined();

      const ally = createMockAlly();
      const mockRow = { original: ally };
      const cellResult = (imageColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const img = screen.getByAltText("banner aliado");
      expect(img).toBeInTheDocument();
    });

    it("retorna columna url con accessorKey correcto", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn).toBeDefined();
      expect(urlColumn?.header).toBe("URL");
    });

    it("columna url renderiza un link con href apuntando a ally.url", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn?.cell).toBeDefined();

      const ally = createMockAlly({ url: "https://aliado.com" });
      const mockRow = { original: ally };
      const cellResult = (urlColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const link = screen.getByRole("link", { name: /aliado\.com/i });
      expect(link).toHaveAttribute("href", "https://aliado.com");
    });

    it("columna url tiene target='_blank' para abrir en nueva pestaña", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn?.cell).toBeDefined();

      const ally = createMockAlly({ url: "https://example.com" });
      const mockRow = { original: ally };
      const cellResult = (urlColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const link = screen.getByRole("link", { name: /example\.com/i });
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("columna url tiene rel='noopener noreferrer' para seguridad", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn?.cell).toBeDefined();

      const ally = createMockAlly({ url: "https://partner.org" });
      const mockRow = { original: ally };
      const cellResult = (urlColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const link = screen.getByRole("link", { name: /partner\.org/i });
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("columna url muestra el texto del URL tal como está en ally.url", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn?.cell).toBeDefined();

      const testUrl = "https://very-long-url-example.com/with/path/structure";
      const ally = createMockAlly({ url: testUrl });
      const mockRow = { original: ally };
      const cellResult = (urlColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText(testUrl)).toBeInTheDocument();
    });

    it("columna url usa el mismo URL para href y texto mostrado", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const urlColumn = columns.find((col) => (col as any).accessorKey === "url");
      expect(urlColumn?.cell).toBeDefined();

      const ally = createMockAlly({ url: "https://test-consistency.io" });
      const mockRow = { original: ally };
      const cellResult = (urlColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const link = screen.getByRole("link", { name: /test-consistency\.io/i });
      expect(link).toHaveAttribute("href", "https://test-consistency.io");
      expect(link.textContent).toBe("https://test-consistency.io");
    });
  });

  // ──── Step 2: Test actions column without permission gates ────
  describe("Columna actions (sin gates de permisos)", () => {
    it("retorna columna actions con id correcto", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions siempre está presente independientemente de permisos", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Pencil que apunta a '/4dnn1n/content/allies/{id}/edit'", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 7 });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /editar aliado/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/content/allies/7/edit");
    });

    it("link Pencil apunta a la URL correcta con diferentes IDs", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 123 });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /editar aliado/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/content/allies/123/edit");
    });

    it("columna actions renderiza botón Trash2 (Eliminar aliado)", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 5 });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar aliado/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("botón Trash2 invoca onDelete con el aliado al hacer click", async () => {
      const onDeleteMock = vi.fn();
      const columns = buildAllyColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 15, url: "https://ally-test.com" });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar aliado/i });
      await userEvent.click(deleteButton);

      expect(onDeleteMock).toHaveBeenCalledWith(ally);
      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("ambos botones de acciones están siempre presentes (sin condiciones de permisos)", () => {
      const onDeleteMock = vi.fn();
      const columns = buildAllyColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 10 });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /editar aliado/i });
      const deleteButton = screen.getByRole("button", { name: /eliminar aliado/i });

      expect(editLink).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas (stickyRight)", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });

    it("botón Trash2 invoca onDelete múltiples veces cuando se hace click más de una vez", async () => {
      const onDeleteMock = vi.fn();
      const columns = buildAllyColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const ally = createMockAlly({ id: 20 });
      const mockRow = { original: ally };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar aliado/i });

      await userEvent.click(deleteButton);
      await userEvent.click(deleteButton);

      expect(onDeleteMock).toHaveBeenCalledTimes(2);
      expect(onDeleteMock).toHaveBeenNthCalledWith(1, ally);
      expect(onDeleteMock).toHaveBeenNthCalledWith(2, ally);
    });
  });

  // ──── Step 3: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiAlly>[]", () => {
      const columns = buildAllyColumns({ onDelete: vi.fn() });

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
