import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildMembershipFormColumns } from "@/app/4dnn1n/membership-forms/_components/columns";
import type { ApiMembershipForm } from "@/app/4dnn1n/membership-forms/fetch";

function createMockMembershipForm(overrides: Partial<ApiMembershipForm> = {}): ApiMembershipForm {
  return {
    id: 1,
    name: "Juan",
    lastname: "Pérez",
    id_card: "1234567890",
    phone: "3101234567",
    email: "juan@example.com",
    address: "Calle 1 #1-1",
    city_id: 1,
    city: { id: 1, name: "Bogotá" },
    date: "2026-03-05",
    seller: "Carlos",
    state: 0,
    ...overrides,
  };
}

describe("buildMembershipFormColumns", () => {
  // ──── Step 1: Test columns full_name, phone, city, seller, date ────
  describe("Columnas básicas (full_name, phone, city, seller, date)", () => {
    it("retorna columna full_name con id correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn?.header).toBe("Nombre");
    });

    it("columna full_name renderiza nombre y apellido concatenados", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ name: "Juan", lastname: "García" });
      const mockRow = { original: form };
      const cellResult = (fullNameColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Juan García")).toBeInTheDocument();
    });

    it("retorna columna phone con accessorKey correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const phoneColumn = columns.find((col) => (col as any).accessorKey === "phone");
      expect(phoneColumn).toBeDefined();
      expect(phoneColumn?.header).toBe("Celular");
    });

    it("columna phone renderiza el número de teléfono", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const phoneColumn = columns.find((col) => (col as any).accessorKey === "phone");
      expect(phoneColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ phone: "3109876543" });
      const mockRow = { original: form };
      const cellResult = (phoneColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("3109876543")).toBeInTheDocument();
    });

    it("retorna columna city con id correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn).toBeDefined();
      expect(cityColumn?.header).toBe("Ciudad");
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ city: { id: 2, name: "Cali" } });
      const mockRow = { original: form };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Cali")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es null", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ city: null });
      const mockRow = { original: form };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna seller con accessorKey correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const sellerColumn = columns.find((col) => (col as any).accessorKey === "seller");
      expect(sellerColumn).toBeDefined();
      expect(sellerColumn?.header).toBe("Asesor");
    });

    it("columna seller renderiza el nombre del asesor", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const sellerColumn = columns.find((col) => (col as any).accessorKey === "seller");
      expect(sellerColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ seller: "María López" });
      const mockRow = { original: form };
      const cellResult = (sellerColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("María López")).toBeInTheDocument();
    });

    it("retorna columna date con accessorKey correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const dateColumn = columns.find((col) => (col as any).accessorKey === "date");
      expect(dateColumn).toBeDefined();
      expect(dateColumn?.header).toBe("Fecha solicitud");
    });

    it("columna date formatea la fecha YYYY-MM-DD a DD/MM/YYYY usando split manual", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const dateColumn = columns.find((col) => (col as any).accessorKey === "date");
      expect(dateColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ date: "2026-03-05" });
      const mockRow = { original: form };
      const cellResult = (dateColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("05/03/2026")).toBeInTheDocument();
    });

    it("columna date renderiza '-' cuando date es vacío o undefined", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const dateColumn = columns.find((col) => (col as any).accessorKey === "date");
      expect(dateColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ date: "" });
      const mockRow = { original: form };
      const cellResult = (dateColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("columna date maneja correctamente diferentes fechas válidas", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const dateColumn = columns.find((col) => (col as any).accessorKey === "date");
      expect(dateColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ date: "2025-12-25" });
      const mockRow = { original: form };
      const cellResult = (dateColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("25/12/2025")).toBeInTheDocument();
    });
  });

  // ──── Step 2: Test actions column without permission gates ────
  describe("Columna actions (sin gates de permisos)", () => {
    it("retorna columna actions con id correcto", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions siempre está presente independientemente de permisos", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link UserPlus que apunta a '/4dnn1n/affiliates/new?from={id}'", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ id: 42 });
      const mockRow = { original: form };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const createAffiliateLink = screen.getByRole("link", { name: /crear afiliado/i });
      expect(createAffiliateLink).toBeInTheDocument();
      expect(createAffiliateLink).toHaveAttribute("href", "/4dnn1n/affiliates/new?from=42");
    });

    it("link UserPlus apunta a la URL correcta con diferentes IDs", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ id: 789 });
      const mockRow = { original: form };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const createAffiliateLink = screen.getByRole("link", { name: /crear afiliado/i });
      expect(createAffiliateLink).toHaveAttribute("href", "/4dnn1n/affiliates/new?from=789");
    });

    it("columna actions renderiza botón Trash2 (Eliminar solicitud)", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ id: 5 });
      const mockRow = { original: form };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar solicitud/i });
      expect(deleteButton).toBeInTheDocument();
    });

    it("botón Trash2 invoca onDelete con la solicitud al hacer click", async () => {
      const onDeleteMock = vi.fn();
      const columns = buildMembershipFormColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ id: 15, name: "Ana" });
      const mockRow = { original: form };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const deleteButton = screen.getByRole("button", { name: /eliminar solicitud/i });
      await userEvent.click(deleteButton);

      expect(onDeleteMock).toHaveBeenCalledWith(form);
      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("ambos botones de acciones están siempre presentes (sin condiciones de permisos)", () => {
      const onDeleteMock = vi.fn();
      const columns = buildMembershipFormColumns({ onDelete: onDeleteMock });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const form = createMockMembershipForm({ id: 10 });
      const mockRow = { original: form };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const createAffiliateLink = screen.getByRole("link", { name: /crear afiliado/i });
      const deleteButton = screen.getByRole("button", { name: /eliminar solicitud/i });

      expect(createAffiliateLink).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it("la columna actions tiene las propiedades meta correctas", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });

  // ──── Step 3: Type checking ────
  describe("Seguridad de tipos en las definiciones de columnas", () => {
    it("retorna array de ColumnDef<ApiMembershipForm>[]", () => {
      const columns = buildMembershipFormColumns({ onDelete: vi.fn() });

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined || (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
