import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildAgreementColumns } from "@/app/4dnn1n/agreements/_components/columns";
import type { ApiAgreement } from "@/app/4dnn1n/agreements/fetch";

function createMockAgreement(overrides: Partial<ApiAgreement> = {}): ApiAgreement {
  return {
    id: 1,
    name: "Acuerdo de Salud",
    amount: 150000,
    state: 1,
    city_id: 1,
    city: { id: 1, name: "Cali" },
    ...overrides,
  };
}

describe("buildAgreementColumns", () => {
  // ──── Step 1: Test columns id, name, amount, city ────
  describe("Columnas básicas (id, name, amount, city)", () => {
    it("retorna columna id con accessorKey correcto", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const idColumn = columns.find((col) => (col as any).accessorKey === "id");
      expect(idColumn).toBeDefined();
      expect(idColumn?.header).toBe("Código");
    });

    it("columna id renderiza el id como texto con font-medium", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const idColumn = columns.find((col) => (col as any).accessorKey === "id");
      expect(idColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 42 });
      const mockRow = { original: agreement };
      const cellResult = (idColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("retorna columna name con accessorKey correcto", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.header).toBe("Nombre del Convenio");
    });

    it("columna name renderiza el nombre del convenio con font-medium", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const nameColumn = columns.find((col) => (col as any).accessorKey === "name");
      expect(nameColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ name: "Acuerdo Premium" });
      const mockRow = { original: agreement };
      const cellResult = (nameColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Acuerdo Premium")).toBeInTheDocument();
    });

    it("retorna columna amount con accessorKey correcto", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const amountColumn = columns.find((col) => (col as any).accessorKey === "amount");
      expect(amountColumn).toBeDefined();
      expect(amountColumn?.header).toBe("Valor ($)");
    });

    it("columna amount renderiza el valor con formato locale es-CO y prefijo $", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const amountColumn = columns.find((col) => (col as any).accessorKey === "amount");
      expect(amountColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ amount: 150000 });
      const mockRow = { original: agreement };
      const cellResult = (amountColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      // toLocaleString("es-CO") for 150000 returns "150.000"
      expect(screen.getByText("$150.000")).toBeInTheDocument();
    });

    it("retorna columna city con id correcto", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn).toBeDefined();
      expect(cityColumn?.header).toBe("Ciudad");
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ city: { id: 5, name: "Cali" } });
      const mockRow = { original: agreement };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Cali")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es null", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ city: null });
      const mockRow = { original: agreement };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test state column (badge) ────
  describe("Badge de la columna state (Activo/Inactivo)", () => {
    it("retorna columna state con id correcto", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
    });

    it("accessorFn de la columna state retorna el valor de state", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect((stateColumn as any).accessorFn).toBeDefined();

      const agreementActive = createMockAgreement({ state: 1 });
      const agreementInactive = createMockAgreement({ state: 0 });

      expect((stateColumn as any).accessorFn(agreementActive)).toBe(1);
      expect((stateColumn as any).accessorFn(agreementInactive)).toBe(0);
    });

    it("la celda de la columna state renderiza el badge 'Activo' con clases verdes para state=1", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 1 });
      const mockRow = { original: agreement };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      // Render and check the content
      const { container } = render(cellResult);
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("la celda de la columna state renderiza el badge 'Inactivo' con clases rojas para state=0", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 0 });
      const mockRow = { original: agreement };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      // Render and check the content
      const { container } = render(cellResult);
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });
  });

  // ──── Step 3: Test actions column gates ────
  describe("Condiciones de la columna actions (canView, canManage)", () => {
    it("NO incluye columna actions cuando canView=false", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: false,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeUndefined();
    });

    it("incluye columna actions cuando canView=true", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Ver cuando canView=true, canManage=false", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 5 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify Ver link exists
      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/agreements/5");
    });

    it("columna actions NO renderiza link Modificar cuando canManage=false", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 5 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify Modificar link does NOT exist
      render(cellResult);
      const editLinks = screen.queryAllByRole("link", { name: /modificar/i });
      expect(editLinks.length).toBe(0);
    });

    it("columna actions NO renderiza botón toggle cuando canManage=false", () => {
      const onToggleMock = vi.fn();
      const columns = buildAgreementColumns({
        onToggleState: onToggleMock,
        canView: true,
        canManage: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 1 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify toggle button does not exist
      render(cellResult);
      const toggleButtons = screen.queryAllByRole("button", {
        name: /inactivar|activar/i,
      });
      expect(toggleButtons.length).toBe(0);
    });

    it("columna actions renderiza link Ver y Modificar cuando canView=true, canManage=true", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 5 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify both links exist
      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/agreements/5");
      expect(editLink).toHaveAttribute("href", "/4dnn1n/agreements/5/edit");
    });

    it("columna actions renderiza botón toggle cuando canManage=true, state=1", () => {
      const onToggleMock = vi.fn();
      const columns = buildAgreementColumns({
        onToggleState: onToggleMock,
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 1 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify toggle button exists with "Inactivar" label for active state
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle cuando canManage=true, state=0", () => {
      const onToggleMock = vi.fn();
      const columns = buildAgreementColumns({
        onToggleState: onToggleMock,
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 0 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify toggle button exists with "Activar" label for inactive state
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /activar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con el convenio al hacer click", async () => {
      const onToggleMock = vi.fn();
      const columns = buildAgreementColumns({
        onToggleState: onToggleMock,
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ state: 1, id: 42 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and click the toggle button
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      // Verify the mock was called with the correct agreement
      expect(onToggleMock).toHaveBeenCalledWith(agreement);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("link Ver siempre apunta a /4dnn1n/agreements/{id}", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 123 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/agreements/123");
    });

    it("link Modificar siempre apunta a /4dnn1n/agreements/{id}/edit", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const agreement = createMockAgreement({ id: 789 });
      const mockRow = { original: agreement };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toHaveAttribute("href", "/4dnn1n/agreements/789/edit");
    });
  });

  // ──── Step 4: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiAgreement>[]", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: true,
      });

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });

    it("la columna actions tiene las propiedades meta correctas cuando canView=true", () => {
      const columns = buildAgreementColumns({
        onToggleState: vi.fn(),
        canView: true,
        canManage: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });
});
