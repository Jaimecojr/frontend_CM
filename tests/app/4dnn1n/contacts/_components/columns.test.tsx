import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildContactColumns } from "@/app/4dnn1n/contacts/_components/columns";
import type { ApiContact } from "@/app/4dnn1n/contacts/fetch";

function createMockContact(overrides: Partial<ApiContact> = {}): ApiContact {
  return {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    phone: "3101234567",
    city_id: 1,
    city: { id: 1, name: "Bogotá" },
    subject: "Test Subject",
    comment: "This is a test comment",
    created_at: "2026-03-05T14:30:00.000Z",
    updated_at: "2026-03-05T14:30:00.000Z",
    ...overrides,
  };
}

describe("buildContactColumns", () => {
  // ──── Step 1: Test comment column truncation ────
  describe("Columna comment (truncado a 80 caracteres)", () => {
    it("retorna columna comment con accessorKey correcto", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Act
      const commentColumn = columns.find((col) => (col as any).accessorKey === "comment");

      // Assert
      expect(commentColumn).toBeDefined();
      expect(commentColumn?.header).toBe("Mensaje");
    });

    it("columna comment muestra los primeros 80 caracteres seguidos de '…' cuando el texto es más largo", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const longComment = "A".repeat(90); // 90 caracteres
      const contact = createMockContact({ comment: longComment });
      const mockRow = { original: contact };

      const commentColumn = columns.find((col) => (col as any).accessorKey === "comment");
      expect(commentColumn?.cell).toBeDefined();

      // Act
      const cellResult = (commentColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const truncatedText = "A".repeat(80) + "…";
      expect(screen.getByText(truncatedText)).toBeInTheDocument();
    });

    it("columna comment muestra el texto completo cuando tiene exactamente 80 caracteres", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const exactly80Chars = "B".repeat(80);
      const contact = createMockContact({ comment: exactly80Chars });
      const mockRow = { original: contact };

      const commentColumn = columns.find((col) => (col as any).accessorKey === "comment");
      expect(commentColumn?.cell).toBeDefined();

      // Act
      const cellResult = (commentColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      // Text should be exactly 80 chars without ellipsis
      expect(screen.getByText(exactly80Chars)).toBeInTheDocument();
      // Ensure ellipsis is NOT present
      const container = screen.getByText(exactly80Chars).textContent;
      expect(container).not.toContain("…");
    });

    it("columna comment muestra el texto completo sin '…' cuando tiene menos de 80 caracteres", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const shortComment = "This is a short message";
      const contact = createMockContact({ comment: shortComment });
      const mockRow = { original: contact };

      const commentColumn = columns.find((col) => (col as any).accessorKey === "comment");
      expect(commentColumn?.cell).toBeDefined();

      // Act
      const cellResult = (commentColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText(shortComment)).toBeInTheDocument();
      const container = screen.getByText(shortComment).textContent;
      expect(container).not.toContain("…");
    });

    it("columna comment formatea correctamente comentarios que exceden 80 caracteres con diferentes longitudes", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const comment100Chars = "C".repeat(100);
      const contact = createMockContact({ comment: comment100Chars });
      const mockRow = { original: contact };

      const commentColumn = columns.find((col) => (col as any).accessorKey === "comment");
      expect(commentColumn?.cell).toBeDefined();

      // Act
      const cellResult = (commentColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const expectedText = "C".repeat(80) + "…";
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test created_at column date formatting ────
  describe("Columna created_at (formateo con objeto Date)", () => {
    it("retorna columna created_at con accessorKey correcto", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Act
      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");

      // Assert
      expect(createdAtColumn).toBeDefined();
      expect(createdAtColumn?.header).toBe("Fecha");
    });

    it("columna created_at formatea ISO string a DD/MM/YYYY usando objeto Date", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const isoDate = "2026-03-05T14:30:00.000Z";
      const contact = createMockContact({ created_at: isoDate });
      const mockRow = { original: contact };

      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");
      expect(createdAtColumn?.cell).toBeDefined();

      // Act: construct expected string using same Date object as source code
      const date = new Date(isoDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const expectedText = `${day}/${month}/${year}`;

      const cellResult = (createdAtColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it("columna created_at renderiza '-' cuando created_at es null", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const contact = createMockContact({ created_at: null as any });
      const mockRow = { original: contact };

      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");
      expect(createdAtColumn?.cell).toBeDefined();

      // Act
      const cellResult = (createdAtColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("columna created_at renderiza '-' cuando created_at es una cadena vacía", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const contact = createMockContact({ created_at: "" });
      const mockRow = { original: contact };

      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");
      expect(createdAtColumn?.cell).toBeDefined();

      // Act
      const cellResult = (createdAtColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("columna created_at formatea correctamente diferentes fechas válidas", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const testDate = "2025-12-25T10:15:00.000Z";
      const contact = createMockContact({ created_at: testDate });
      const mockRow = { original: contact };

      const date = new Date(testDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const expectedText = `${day}/${month}/${year}`;

      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");
      expect(createdAtColumn?.cell).toBeDefined();

      // Act
      const cellResult = (createdAtColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it("columna created_at maneja fechas del primer día del mes correctamente", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const testDate = "2026-01-01T00:00:00.000Z";
      const contact = createMockContact({ created_at: testDate });
      const mockRow = { original: contact };

      const date = new Date(testDate);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const expectedText = `${day}/${month}/${year}`;

      const createdAtColumn = columns.find((col) => (col as any).accessorKey === "created_at");
      expect(createdAtColumn?.cell).toBeDefined();

      // Act
      const cellResult = (createdAtColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });
  });

  // ──── Step 3: Test actions column without permission gates ────
  describe("Columna actions (sin gates de permisos)", () => {
    it("retorna columna actions con id correcto", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions siempre está presente independientemente de permisos", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Eye que apunta a '/4dnn1n/contacts/{id}'", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const contact = createMockContact({ id: 42 });
      const mockRow = { original: contact };

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver detalle/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/contacts/42");
    });

    it("link Eye apunta a la URL correcta con diferentes IDs", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const contact = createMockContact({ id: 789 });
      const mockRow = { original: contact };

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver detalle/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/contacts/789");
    });

    it("columna actions renderiza botón Trash2 (Eliminar mensaje)", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });
      const contact = createMockContact({ id: 5 });
      const mockRow = { original: contact };

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const deleteButton = screen.getByRole("button", { name: /eliminar mensaje/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("botón Trash2 invoca onDelete con el contacto al hacer click", async () => {
      // Arrange
      const onDeleteMock = vi.fn();
      const columns = buildContactColumns({ onDelete: onDeleteMock });
      const contact = createMockContact({ id: 15, name: "Ana García" });
      const mockRow = { original: contact };

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar mensaje/i });
      await userEvent.click(deleteButton);

      // Assert
      expect(onDeleteMock).toHaveBeenCalledWith(contact);
      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("ambos botones de acciones están siempre presentes (sin condiciones de permisos)", () => {
      // Arrange
      const onDeleteMock = vi.fn();
      const columns = buildContactColumns({ onDelete: onDeleteMock });
      const contact = createMockContact({ id: 10 });
      const mockRow = { original: contact };

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver detalle/i });
      const deleteButton = screen.getByRole("button", { name: /eliminar mensaje/i });

      expect(viewLink).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });

  // ──── Step 4: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiContact>[]", () => {
      // Arrange
      const columns = buildContactColumns({ onDelete: vi.fn() });

      // Assert
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
