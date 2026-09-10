import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildCounselorColumns } from "@/app/4dnn1n/counselors/_components/columns";
import type { ApiCounselor } from "@/app/4dnn1n/counselors/fetch";

function createMockCounselor(overrides: Partial<ApiCounselor> = {}): ApiCounselor {
  return {
    id: 1,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    movil: "3001234567",
    city: { id: 1, name: "Bogotá" },
    city_id: 1,
    user_id: 1,
    type_contra: "Término Fijo",
    state: 1,
    ...overrides,
  };
}

describe("buildCounselorColumns", () => {
  // ──── Step 1: Test basic columns (full_name, id_card, movil, city) ────
  describe("Columnas básicas (full_name, id_card, movil, city)", () => {
    it("retorna columna full_name con id correcto", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const fullNameColumn = columns.find((col) => col.id === "full_name");

      // Assert
      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn?.header).toBe("Nombre");
    });

    it("columna full_name renderiza nombre y apellido concatenados", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ name: "María", lastname: "Gómez" });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (fullNameColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("María Gómez")).toBeInTheDocument();
    });

    it("accessorFn de full_name retorna nombre y apellido concatenados", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn).toBeDefined();
      expect((fullNameColumn as any).accessorFn).toBeDefined();

      const counselor = createMockCounselor({ name: "Carlos", lastname: "López" });

      // Act & Assert
      expect((fullNameColumn as any).accessorFn(counselor)).toBe("Carlos López");
    });

    it("retorna columna id_card con accessorKey correcto", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const idCardColumn = columns.find((col) => (col as any).accessorKey === "id_card");

      // Assert
      expect(idCardColumn).toBeDefined();
      expect(idCardColumn?.header).toBe("Cédula");
    });

    it("columna id_card renderiza la cédula con font-medium", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const idCardColumn = columns.find((col) => (col as any).accessorKey === "id_card");
      expect(idCardColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id_card: "9876543210" });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (idCardColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("9876543210")).toBeInTheDocument();
    });

    it("retorna columna movil con accessorKey correcto", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");

      // Assert
      expect(movilColumn).toBeDefined();
      expect(movilColumn?.header).toBe("Celular");
    });

    it("columna movil renderiza el número cuando está presente", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ movil: "3127654321" });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (movilColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("3127654321")).toBeInTheDocument();
    });

    it("columna movil renderiza '-' cuando movil es null", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ movil: null });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (movilColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna city con id correcto", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      // Act
      const cityColumn = columns.find((col) => col.id === "city");

      // Assert
      expect(cityColumn).toBeDefined();
      expect(cityColumn?.header).toBe("Ciudad");
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({
        city: { id: 5, name: "Medellín" },
      });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("Medellín")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es null", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ city: null });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test state column (badge) ────
  describe("Badge de la columna state (Activo/Inactivo)", () => {
    it("retorna columna state con id correcto", () => {
      // Arrange
      const columns = buildCounselorColumns({
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
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect((stateColumn as any).accessorFn).toBeDefined();

      const counselorActive = createMockCounselor({ state: 1 });
      const counselorInactive = createMockCounselor({ state: 2 });

      // Act & Assert
      expect((stateColumn as any).accessorFn(counselorActive)).toBe(1);
      expect((stateColumn as any).accessorFn(counselorInactive)).toBe(2);
    });

    it("la celda de la columna state renderiza el badge 'Activo' con clases verdes para state=1", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ state: 1 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });
      const { container } = render(cellResult);

      // Assert
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("la celda de la columna state renderiza el badge 'Inactivo' con clases rojas para state=2", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ state: 2 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });
      const { container } = render(cellResult);

      // Assert
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });
  });

  // ──── Step 3: Test actions column gate (single hasAccess gate) ────
  describe("Columna actions (gate único de hasAccess)", () => {
    it("NO incluye columna actions cuando hasAccess=false", () => {
      // Arrange
      const columns = buildCounselorColumns({
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
      const columns = buildCounselorColumns({
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
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id: 5 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/counselors/5");
    });

    it("columna actions renderiza link Modificar cuando hasAccess=true", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id: 5 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/counselors/5/edit");
    });

    it("columna actions renderiza botón toggle cuando hasAccess=true, state=1", () => {
      // Arrange
      const onToggleMock = vi.fn();
      const columns = buildCounselorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ state: 1 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle cuando hasAccess=true, state=2", () => {
      // Arrange
      const onToggleMock = vi.fn();
      const columns = buildCounselorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ state: 2 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const toggleButton = screen.getByRole("button", { name: /activar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con el asesor al hacer click", async () => {
      // Arrange
      const onToggleMock = vi.fn();
      const columns = buildCounselorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ state: 1, id: 42 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      // Assert
      expect(onToggleMock).toHaveBeenCalledWith(counselor);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("link Ver siempre apunta a /4dnn1n/counselors/{id}", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id: 123 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/counselors/123");
    });

    it("link Modificar siempre apunta a /4dnn1n/counselors/{id}/edit", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id: 789 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/counselors/789/edit");
    });

    it("todos los botones (Eye, Pencil, Power) están presentes juntos cuando hasAccess=true", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const counselor = createMockCounselor({ id: 10, state: 1 });
      const mockRow = { original: counselor };

      // Act
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });
      render(cellResult);

      // Assert
      const viewLink = screen.getByRole("link", { name: /ver/i });
      const editLink = screen.getByRole("link", { name: /modificar/i });
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });

      expect(viewLink).toBeInTheDocument();
      expect(editLink).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas cuando hasAccess=true", () => {
      // Arrange
      const columns = buildCounselorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      // Act
      const actionsColumn = columns.find((col) => col.id === "actions");

      // Assert
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });

  // ──── Step 4: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiCounselor>[]", () => {
      // Arrange
      const columns = buildCounselorColumns({
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
  });
});
