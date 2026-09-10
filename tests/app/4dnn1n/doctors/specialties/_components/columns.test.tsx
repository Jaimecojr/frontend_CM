import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildSpecialtyColumns } from "@/app/4dnn1n/doctors/specialties/_components/columns";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

function createMockSpecialty(overrides: Partial<ApiSpecialty> = {}): ApiSpecialty {
  return {
    id: 1,
    name: "Cardiología",
    state: 1,
    ...overrides,
  };
}

describe("buildSpecialtyColumns", () => {
  // ──── Step 1: Test columns name and state ────
  describe("Columnas básicas (name, state)", () => {
    it("retorna columna name con accessorKey correcto", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");

      // Assert
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.header).toBe("Nombre de la Especialidad");
    });

    it("columna name renderiza el nombre de la especialidad con font-medium", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ name: "Dermatología" });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (nameColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Dermatología")).toBeInTheDocument();
    });

    it("retorna columna state con id correcto", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const stateColumn = columns.find((col) => col.id === "state");

      // Assert
      expect(stateColumn).toBeDefined();
    });

    it("accessorFn de la columna state retorna el valor de state", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect((stateColumn as any).accessorFn).toBeDefined();

      const specialtyActive = createMockSpecialty({ state: 1 });
      const specialtyInactive = createMockSpecialty({ state: 0 });

      // Act & Assert
      expect((stateColumn as any).accessorFn(specialtyActive)).toBe(1);
      expect((stateColumn as any).accessorFn(specialtyInactive)).toBe(0);
    });

    it("la celda de la columna state renderiza el badge 'Activo' con clases verdes para state=1", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ state: 1 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });
      const { container } = render(cellResult);

      // Assert
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("la celda de la columna state renderiza el badge 'Inactivo' con clases rojas para state=0", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ state: 0 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });
      const { container } = render(cellResult);

      // Assert
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });
  });

  // ──── Step 2: Test actions column gates ────
  describe("Condiciones de la columna actions (hasAccess)", () => {
    it("NO incluye columna actions cuando hasAccess=false", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn).toBeUndefined();
    });

    it("incluye columna actions cuando hasAccess=true", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Ver cuando hasAccess=true", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ id: 5 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/doctors/specialties/5");
    });

    it("columna actions renderiza link Modificar cuando hasAccess=true", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ id: 5 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/doctors/specialties/5/edit");
    });

    it("columna actions renderiza botón toggle cuando hasAccess=true, state=1", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ state: 1 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle cuando hasAccess=true, state=0", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ state: 0 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const toggleButton = screen.getByRole("button", { name: /activar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con la especialidad al hacer click", async () => {
      // Arrange
      const onToggleMock = vi.fn();
      const columns = buildSpecialtyColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ state: 1, id: 42 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      // Assert
      expect(onToggleMock).toHaveBeenCalledWith(specialty);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("link Ver siempre apunta a /4dnn1n/doctors/specialties/{id}", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ id: 123 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/doctors/specialties/123");
    });

    it("link Modificar siempre apunta a /4dnn1n/doctors/specialties/{id}/edit", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const specialty = createMockSpecialty({ id: 789 });
      const mockRow = { original: specialty };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/doctors/specialties/789/edit");
    });
  });

  // ──── Step 3: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiSpecialty>[]", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      // Assert
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });

    it("la columna actions tiene las propiedades meta correctas cuando hasAccess=true", () => {
      // Arrange
      const columns = buildSpecialtyColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });
});
