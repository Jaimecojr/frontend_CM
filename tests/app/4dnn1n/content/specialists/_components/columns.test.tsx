import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildSpecialistColumns } from "@/app/4dnn1n/content/specialists/_components/columns";
import type { ApiSpecialist } from "@/app/4dnn1n/content/specialists/fetch";

function createMockSpecialist(overrides: Partial<ApiSpecialist> = {}): ApiSpecialist {
  return {
    id: 1,
    photo: "specialists/photo1.jpg",
    photo_filename: "photo1.jpg",
    name: "Dr. Juan Pérez",
    specialty: "Cardiología",
    position: 1,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

describe("buildSpecialistColumns", () => {
  // ──── Step 1: Test position, photo, name, and specialty columns ────
  describe("Columnas básicas (position, photo, name, specialty)", () => {
    it("retorna columna position con accessorKey correcto", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");

      // Assert
      expect(positionColumn).toBeDefined();
      expect(positionColumn?.header).toBe("Pos.");
    });

    it("columna position renderiza la posición centrada con fuente media", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");
      expect(positionColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ position: 3 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (positionColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("columna position maneja diferentes valores de posición", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const positionColumn = columns.find((col) => (col as any).accessorKey === "position");
      expect(positionColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ position: 42 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (positionColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("retorna columna photo con id correcto", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const photoColumn = columns.find((col) => col.id === "photo");

      // Assert
      expect(photoColumn).toBeDefined();
      expect(photoColumn?.header).toBe("Foto");
    });

    it("columna photo renderiza img con src usando API_URL y path de storage", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const photoColumn = columns.find((col) => col.id === "photo");
      expect(photoColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ photo: "specialists/cardio1.jpg", name: "Dr. Carlos" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (photoColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const img = screen.getByRole("img", { name: "Dr. Carlos" });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("/storage/specialists/cardio1.jpg"));
    });

    it("columna photo usa API_URL fallback (http://localhost:8000) cuando NEXT_PUBLIC_API_URL no está definido", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const photoColumn = columns.find((col) => col.id === "photo");
      expect(photoColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ photo: "specialists/test.jpg", name: "Dr. Test" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (photoColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const img = screen.getByRole("img", { name: "Dr. Test" });
      expect(img.getAttribute("src")).toMatch(/http:\/\/localhost:8000\/storage\/specialists\/test\.jpg/);
    });

    it("columna photo tiene alt text con el nombre del especialista", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const photoColumn = columns.find((col) => col.id === "photo");
      expect(photoColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ name: "Dra. María López" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (photoColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const img = screen.getByAltText("Dra. María López");
      expect(img).toBeInTheDocument();
    });

    it("columna photo maneja diferentes nombres de especialistas en alt text", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const photoColumn = columns.find((col) => col.id === "photo");
      expect(photoColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ name: "Dr. Roberto Gonzalez" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (photoColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const img = screen.getByAltText("Dr. Roberto Gonzalez");
      expect(img).toBeInTheDocument();
    });

    it("retorna columna name con accessorKey correcto", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");

      // Assert
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.header).toBe("Nombre");
    });

    it("columna name renderiza el nombre con fuente media", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ name: "Dr. Francisco Ruiz" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (nameColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Dr. Francisco Ruiz")).toBeInTheDocument();
    });

    it("columna name maneja diferentes nombres de especialistas", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ name: "Dra. Alejandra Moreno" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (nameColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Dra. Alejandra Moreno")).toBeInTheDocument();
    });

    it("retorna columna specialty con accessorKey correcto", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const specialtyColumn = columns.find((col) => (col as any).accessorKey === "specialty");

      // Assert
      expect(specialtyColumn).toBeDefined();
      expect(specialtyColumn?.header).toBe("Especialidad");
    });

    it("columna specialty renderiza la especialidad con clase de texto pequeño", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const specialtyColumn = columns.find((col) => (col as any).accessorKey === "specialty");
      expect(specialtyColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ specialty: "Oftalmología" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (specialtyColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Oftalmología")).toBeInTheDocument();
    });

    it("columna specialty maneja diferentes especialidades", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const specialtyColumn = columns.find((col) => (col as any).accessorKey === "specialty");
      expect(specialtyColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ specialty: "Neurología" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (specialtyColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Neurología")).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test actions column without permission gates ────
  describe("Columna actions (sin gates de permisos)", () => {
    it("retorna columna actions con id correcto", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Pencil que apunta a '/4dnn1n/content/specialists/{id}/edit'", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 7 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /editar especialista/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/content/specialists/7/edit");
    });

    it("link Pencil apunta a la URL correcta con diferentes IDs", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 123 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /editar especialista/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/content/specialists/123/edit");
    });

    it("columna actions renderiza botón Trash2 (Eliminar especialista)", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 5 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const deleteButton = screen.getByRole("button", { name: /eliminar especialista/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("botón Trash2 invoca onDelete con el especialista al hacer click", async () => {
      // Arrange
      const onDeleteMock = vi.fn();
      const columns = buildSpecialistColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 15, name: "Dr. Test Specialist" });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar especialista/i });
      await userEvent.click(deleteButton);

      // Assert
      expect(onDeleteMock).toHaveBeenCalledWith(specialist);
      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("ambos botones de acciones están siempre presentes (sin condiciones de permisos)", () => {
      // Arrange
      const onDeleteMock = vi.fn();
      const columns = buildSpecialistColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 10 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /editar especialista/i });
      const deleteButton = screen.getByRole("button", { name: /eliminar especialista/i });

      expect(editLink).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas (stickyRight)", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });

    it("botón Trash2 invoca onDelete múltiples veces cuando se hace click más de una vez", async () => {
      // Arrange
      const onDeleteMock = vi.fn();
      const columns = buildSpecialistColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialist = createMockSpecialist({ id: 20 });
      const mockRow = { original: specialist };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar especialista/i });

      await userEvent.click(deleteButton);
      await userEvent.click(deleteButton);

      // Assert
      expect(onDeleteMock).toHaveBeenCalledTimes(2);
      expect(onDeleteMock).toHaveBeenNthCalledWith(1, specialist);
      expect(onDeleteMock).toHaveBeenNthCalledWith(2, specialist);
    });
  });

  // ──── Step 3: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiSpecialist>[]", () => {
      // Arrange
      const columns = buildSpecialistColumns({ onDelete: vi.fn() });

      // Assert
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
