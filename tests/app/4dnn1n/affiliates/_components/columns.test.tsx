import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildAffiliateColumns } from "@/app/4dnn1n/affiliates/_components/columns";
import type { ApiAffiliate } from "@/app/4dnn1n/affiliates/types";

function createMockAffiliate(overrides: Partial<ApiAffiliate> = {}): ApiAffiliate {
  return {
    id: 1,
    counselor_id: 1,
    contract_code: "CNT001",
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    phone: null,
    movil: "3001234567",
    address: "Calle 1",
    city_id: 1,
    email: "juan@example.com",
    validity: "2025-01-01",
    agreement_id: 1,
    company: "Company",
    photo: null,
    photo_rename: null,
    validity_end: "2026-01-01",
    payment_date: "2025-01-01",
    value: 100000,
    balance: 0,
    commission: 5000,
    payment_commission: "si",
    stade: 1,
    carnet: "no",
    state: 1,
    user_id: 1,
    city: { id: 1, name: "Bogotá" },
    ...overrides,
  };
}

describe("buildAffiliateColumns", () => {
  // ──── Step 1: Test columns id_card, full_name, movil ────
  describe("Columnas básicas (id_card, full_name, movil)", () => {
    it("retorna columna id_card con accessorKey correcto", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const idCardColumn = columns.find((col) => (col as any).accessorKey === "id_card");
      expect(idCardColumn).toBeDefined();
      expect(idCardColumn?.header).toBe("Documento de Identidad");
    });

    it("columna full_name usa accessorFn para concatenar name + lastname", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn?.header).toBe("Nombres");
      expect((fullNameColumn as any).accessorFn).toBeDefined();

      const affiliate = createMockAffiliate({ name: "Juan", lastname: "Pérez" });
      const result = (fullNameColumn as any).accessorFn(affiliate);
      expect(result).toBe("Juan Pérez");
    });

    it("columna movil retorna movil si existe", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn).toBeDefined();
      expect((movilColumn as any).accessorFn).toBeDefined();

      const affiliate = createMockAffiliate({ movil: "3001234567", phone: null });
      const result = (movilColumn as any).accessorFn(affiliate);
      expect(result).toBe("3001234567");
    });

    it("columna movil retorna phone si movil es null", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn).toBeDefined();
      expect((movilColumn as any).accessorFn).toBeDefined();

      const affiliate = createMockAffiliate({ movil: null, phone: "6011234567" });
      const result = (movilColumn as any).accessorFn(affiliate);
      expect(result).toBe("6011234567");
    });

    it("columna movil retorna '-' si ambos movil y phone son null", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const movilColumn = columns.find((col) => (col as any).accessorKey === "movil");
      expect(movilColumn).toBeDefined();
      expect((movilColumn as any).accessorFn).toBeDefined();

      const affiliate = createMockAffiliate({ movil: null, phone: null });
      const result = (movilColumn as any).accessorFn(affiliate);
      expect(result).toBe("-");
    });
  });

  // ──── Step 2: Test state column (badge) ────
  describe("Badge de la columna state (Activo/Inactivo)", () => {
    it("retorna columna state con id correcto", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
    });

    it("accessorFn de la columna state retorna el valor de stade", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect((stateColumn as any).accessorFn).toBeDefined();

      const affiliateActive = createMockAffiliate({ stade: 1 });
      const affiliateInactive = createMockAffiliate({ stade: 2 });

      expect((stateColumn as any).accessorFn(affiliateActive)).toBe(1);
      expect((stateColumn as any).accessorFn(affiliateInactive)).toBe(2);
    });

    it("la celda de la columna state renderiza el badge 'Activo' con clases verdes para stade=1", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ stade: 1 });
      const mockRow = { original: affiliate };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      // Render and check the content
      const { container } = render(cellResult);
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("la celda de la columna state renderiza el badge 'Inactivo' con clases rojas para stade=2", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ stade: 2 });
      const mockRow = { original: affiliate };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      // Render and check the content
      const { container } = render(cellResult);
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });
  });

  // ──── Step 3: Test actions column gates ────
  describe("Condiciones de la columna actions (hasAccess, canToggle, carnet)", () => {
    it("NO incluye columna actions cuando hasAccess=false", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: false,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeUndefined();
    });

    it("incluye columna actions cuando hasAccess=true", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions NO renderiza toggle button cuando canToggle=false", () => {
      const onToggleMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: onToggleMock,
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ stade: 1 });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify toggle button does not exist
      render(cellResult);
      const toggleButtons = screen.queryAllByRole("button", {
        name: /inactivar|activar/i,
      });
      expect(toggleButtons.length).toBe(0);
    });

    it("columna actions renderiza toggle button cuando canToggle=true", () => {
      const onToggleMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: onToggleMock,
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ stade: 1 });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify toggle button exists
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con el afiliado al hacer click", async () => {
      const onToggleMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: onToggleMock,
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ stade: 1, id: 42 });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and click the toggle button
      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      // Verify the mock was called with the correct affiliate
      expect(onToggleMock).toHaveBeenCalledWith(affiliate);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("NO renderiza el botón 'Agregar nota' en el listado (oculto a propósito)", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      const cellResult = (actionsColumn!.cell as any)({ row: { original: createMockAffiliate() } });

      render(cellResult);
      expect(screen.queryByRole("button", { name: /agregar nota/i })).not.toBeInTheDocument();
    });

    it("renderiza como máximo 4 acciones (la celda es grid-cols-4; una quinta la parte en dos filas)", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      // Worst case: super admin, active, carnet pending and valid mobile -> every action visible.
      const affiliate = createMockAffiliate({ stade: 1, carnet: "no", movil: "3001234567" });
      const cellResult = (actionsColumn!.cell as any)({ row: { original: affiliate } });

      render(cellResult);
      const actions = [...screen.queryAllByRole("link"), ...screen.queryAllByRole("button")];
      expect(actions).toHaveLength(4);
    });

    it("columna actions renderiza botón carnet cuando carnet='no' y movil tiene 10 dígitos", async () => {
      const onSendCarnetMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: onSendCarnetMock,
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ carnet: "no", movil: "3001234567", id: 99 });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify carnet button exists
      render(cellResult);
      const carnetButton = screen.getByRole("button", {
        name: /enviar carnet por whatsapp/i,
      });
      expect(carnetButton).toBeInTheDocument();

      // Click the carnet button and verify the mock is called with the correct affiliate
      await userEvent.click(carnetButton);
      expect(onSendCarnetMock).toHaveBeenCalledWith(affiliate);
      expect(onSendCarnetMock).toHaveBeenCalledTimes(1);
    });

    it("columna actions NO renderiza botón carnet cuando carnet='si'", () => {
      const onSendCarnetMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: onSendCarnetMock,
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ carnet: "si", movil: "3001234567" });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify carnet button does NOT exist
      render(cellResult);
      const carnetButtons = screen.queryAllByRole("button", {
        name: /enviar carnet por whatsapp/i,
      });
      expect(carnetButtons.length).toBe(0);
    });

    it("columna actions NO renderiza botón carnet cuando movil no cumple /^\\d{10}$/", () => {
      const onSendCarnetMock = vi.fn();
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: onSendCarnetMock,
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      // Test with invalid movil format (not 10 digits)
      const affiliate = createMockAffiliate({ carnet: "no", movil: "300123" });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify carnet button does NOT exist
      render(cellResult);
      const carnetButtons = screen.queryAllByRole("button", {
        name: /enviar carnet por whatsapp/i,
      });
      expect(carnetButtons.length).toBe(0);
    });

    it("columna actions renderiza links para Ver y Modificar siempre que hasAccess=true", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const affiliate = createMockAffiliate({ id: 5 });
      const mockRow = { original: affiliate };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      // Render and verify links exist
      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/affiliates/5");
      expect(editLink).toHaveAttribute("href", "/4dnn1n/affiliates/5/edit");
    });
  });

  // ──── Step 4: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiAffiliate>[]", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });

    it("la columna state tiene las propiedades meta correctas", () => {
      const columns = buildAffiliateColumns({
        onToggleState: vi.fn(),
        onSendCarnet: vi.fn(),
        onAddNote: vi.fn(),
        hasAccess: true,
        canToggle: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });
});
