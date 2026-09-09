import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildUserColumns } from "@/app/4dnn1n/franchises/_components/columns";
import type { ApiFranchise } from "@/app/4dnn1n/franchises/fetch";

function createMockFranchise(overrides: Partial<ApiFranchise> = {}): ApiFranchise {
  return {
    id: 1,
    nit: "900123456",
    name: "Franquicia Central",
    email: "franquicia@example.com",
    user: "franquicia_user",
    type: 2,
    movil: "3001234567",
    address: "Calle 10 # 5-50",
    city: { id: 1, name: "Bogotá" },
    city_id: 1,
    state: 1,
    ...overrides,
  };
}

describe("buildUserColumns (Franchises)", () => {
  // ──── Step 1: Test basic columns (nit, name, movil, address, city) ────
  describe("Columnas básicas (nit, name, movil, address, city)", () => {
    it("retorna columna nit con accessorKey correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const nitColumn = columns.find((col) => (col as any).accessorKey === "nit");
      expect(nitColumn).toBeDefined();
      expect(nitColumn?.header).toBe("NIT");
    });

    it("columna nit renderiza el NIT con font-medium", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const nitColumn = columns.find((col) => (col as any).accessorKey === "nit");
      expect(nitColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ nit: "800456789" });
      const mockRow = { original: franchise };
      const cellResult = (nitColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("800456789")).toBeInTheDocument();
    });

    it("retorna columna name con accessorKey correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.header).toBe("Nombre");
    });

    it("columna name renderiza el nombre con font-medium", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ name: "Franquicia Región Sur" });
      const mockRow = { original: franchise };
      const cellResult = (nameColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Franquicia Región Sur")).toBeInTheDocument();
    });

    it("retorna columna movil con accessorKey correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn).toBeDefined();
      expect(movilColumn?.header).toBe("Celular");
    });

    it("columna movil renderiza el número cuando está presente", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ movil: "3127654321" });
      const mockRow = { original: franchise };
      const cellResult = (movilColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("3127654321")).toBeInTheDocument();
    });

    it("columna movil renderiza '-' cuando movil es null", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ movil: null });
      const mockRow = { original: franchise };
      const cellResult = (movilColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna address con accessorKey correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const addressColumn = columns.find((col) => (col as any).accessorKey === "address");
      expect(addressColumn).toBeDefined();
      expect(addressColumn?.header).toBe("Dirección");
    });

    it("columna address renderiza la dirección cuando está presente", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const addressColumn = columns.find((col) => (col as any).accessorKey === "address");
      expect(addressColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ address: "Carrera 5 # 10-20" });
      const mockRow = { original: franchise };
      const cellResult = (addressColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Carrera 5 # 10-20")).toBeInTheDocument();
    });

    it("columna address renderiza '-' cuando address es null", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const addressColumn = columns.find((col) => (col as any).accessorKey === "address");
      expect(addressColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ address: null });
      const mockRow = { original: franchise };
      const cellResult = (addressColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna city con id correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn).toBeDefined();
      expect(cityColumn?.header).toBe("Ciudad");
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({
        city: { id: 5, name: "Medellín" },
      });
      const mockRow = { original: franchise };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Medellín")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es null", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ city: null });
      const mockRow = { original: franchise };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test state column (badge) ────
  describe("Badge de la columna state (Activo/Inactivo)", () => {
    it("retorna columna state con id correcto", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
    });

    it("accessorFn de la columna state retorna el valor de state", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect((stateColumn as any).accessorFn).toBeDefined();

      const franchiseActive = createMockFranchise({ state: 1 });
      const franchiseInactive = createMockFranchise({ state: 2 });

      expect((stateColumn as any).accessorFn(franchiseActive)).toBe(1);
      expect((stateColumn as any).accessorFn(franchiseInactive)).toBe(2);
    });

    it("la celda de la columna state renderiza el badge 'Activo' con clases verdes para state=1", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 1 });
      const mockRow = { original: franchise };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      const { container } = render(cellResult);
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("la celda de la columna state renderiza el badge 'Inactivo' con clases rojas para state=2", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 2 });
      const mockRow = { original: franchise };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      const { container } = render(cellResult);
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });
  });

  // ──── Step 3: Test actions column gate (Eye always visible, Pencil+Power gated by isSuperAdmin) ────
  describe("Columna actions (Eye siempre visible, Pencil+Power gateados por isSuperAdmin)", () => {
    it("siempre incluye columna actions (a diferencia de counselors)", () => {
      const columnsNonAdmin = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const actionsColumnNonAdmin = columnsNonAdmin.find((col) => col.id === "actions");
      expect(actionsColumnNonAdmin).toBeDefined();

      const columnsSuperAdmin = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumnSuperAdmin = columnsSuperAdmin.find((col) => col.id === "actions");
      expect(actionsColumnSuperAdmin).toBeDefined();
    });

    it("columna actions renderiza solo link Ver cuando isSuperAdmin=false", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 5 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();

      // Pencil and Power button should NOT be present
      const editLink = screen.queryByRole("link", { name: /modificar/i });
      const toggleButton = screen.queryByRole("button", { name: /activar|inactivar/i });
      expect(editLink).not.toBeInTheDocument();
      expect(toggleButton).not.toBeInTheDocument();
    });

    it("columna actions renderiza link Ver (siempre presente)", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 5 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/franchises/5");
    });

    it("columna actions renderiza link Modificar cuando isSuperAdmin=true", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 5 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/franchises/5/edit");
    });

    it("columna actions NO renderiza link Modificar cuando isSuperAdmin=false", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 5 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.queryByRole("link", { name: /modificar/i });
      expect(editLink).not.toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle cuando isSuperAdmin=true, state=1", () => {
      const onToggleMock = vi.fn();
      const columns = buildUserColumns({
        onToggleState: onToggleMock,
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 1 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle cuando isSuperAdmin=true, state=2", () => {
      const onToggleMock = vi.fn();
      const columns = buildUserColumns({
        onToggleState: onToggleMock,
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 2 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /activar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions NO renderiza botón toggle cuando isSuperAdmin=false", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 1 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.queryByRole("button", { name: /activar|inactivar/i });
      expect(toggleButton).not.toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con la franquicia al hacer click cuando isSuperAdmin=true", async () => {
      const onToggleMock = vi.fn();
      const columns = buildUserColumns({
        onToggleState: onToggleMock,
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ state: 1, id: 42 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      expect(onToggleMock).toHaveBeenCalledWith(franchise);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("link Ver siempre apunta a /4dnn1n/franchises/{id}", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 123 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/franchises/123");
    });

    it("link Modificar apunta a /4dnn1n/franchises/{id}/edit", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 789 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/franchises/789/edit");
    });

    it("todos los botones (Eye, Pencil, Power) están presentes juntos cuando isSuperAdmin=true", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const franchise = createMockFranchise({ id: 10, state: 1 });
      const mockRow = { original: franchise };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      const editLink = screen.getByRole("link", { name: /modificar/i });
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });

      expect(viewLink).toBeInTheDocument();
      expect(editLink).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });

  // ──── Step 4: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiFranchise>[]", () => {
      const columns = buildUserColumns({
        onToggleState: vi.fn(),
        isSuperAdmin: true,
      });

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
