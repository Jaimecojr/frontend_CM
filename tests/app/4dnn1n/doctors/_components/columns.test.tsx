import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildDoctorColumns,
  buildSpecialtyDoctorColumns,
} from "@/app/4dnn1n/doctors/_components/columns";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";

function createMockDoctor(overrides: Partial<ApiDoctor> = {}): ApiDoctor {
  return {
    id: 1,
    name: "Carlos",
    lastname: "Mendoza",
    specialty_id: 1,
    city_id: 1,
    phone: "6014567890",
    movil: "3001234567",
    email: "carlos@example.com",
    address: "Carrera 5 #123",
    secretary_name: "Patricia",
    value_agreement: 150000,
    state: 1,
    specialty: { id: 1, name: "Cardiología" },
    city: { id: 1, name: "Bogotá" },
    ...overrides,
  };
}

describe("buildDoctorColumns", () => {
  // ──── Step 1: Test basic columns (full_name, specialty, phones, city) ────
  describe("Columnas básicas (full_name, specialty, phones, city)", () => {
    it("retorna columna full_name con id correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn?.header).toBe("Nombres");
    });

    it("columna full_name renderiza nombre y apellido concatenados", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        name: "Juan",
        lastname: "Pérez",
      });
      const mockRow = { original: doctor };
      const cellResult = (fullNameColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    });

    it("accessorFn de full_name retorna nombre y apellido concatenados", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const fullNameColumn = columns.find((col) => col.id === "full_name");
      expect(fullNameColumn).toBeDefined();
      expect((fullNameColumn as any).accessorFn).toBeDefined();

      const doctor = createMockDoctor({
        name: "María",
        lastname: "González",
      });
      expect((fullNameColumn as any).accessorFn(doctor)).toBe("María González");
    });

    it("retorna columna specialty con id correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const specialtyColumn = columns.find((col) => col.id === "specialty");
      expect(specialtyColumn).toBeDefined();
      expect(specialtyColumn?.header).toBe("Especialidad");
    });

    it("columna specialty renderiza el nombre de la especialidad cuando existe", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const specialtyColumn = columns.find((col) => col.id === "specialty");
      expect(specialtyColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        specialty: { id: 2, name: "Neurología" },
      });
      const mockRow = { original: doctor };
      const cellResult = (specialtyColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Neurología")).toBeInTheDocument();
    });

    it("columna specialty renderiza '-' cuando specialty es undefined", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const specialtyColumn = columns.find((col) => col.id === "specialty");
      expect(specialtyColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ specialty: undefined });
      const mockRow = { original: doctor };
      const cellResult = (specialtyColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna phones con id correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const phonesColumn = columns.find((col) => col.id === "phones");
      expect(phonesColumn).toBeDefined();
      expect(phonesColumn?.header).toBe("Contacto");
    });

    it("columna phones renderiza teléfono, celular y email cuando todos están presentes", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const phonesColumn = columns.find((col) => col.id === "phones");
      expect(phonesColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        phone: "6015551234",
        movil: "3019876543",
        email: "doc@example.com",
      });
      const mockRow = { original: doctor };
      const cellResult = (phonesColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Tel: 6015551234")).toBeInTheDocument();
      expect(screen.getByText("Cel: 3019876543")).toBeInTheDocument();
      expect(screen.getByText("doc@example.com")).toBeInTheDocument();
    });

    it("columna phones renderiza solo teléfono cuando celular y email están vacíos", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const phonesColumn = columns.find((col) => col.id === "phones");
      expect(phonesColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        phone: "6015551234",
        movil: "",
        email: null,
      });
      const mockRow = { original: doctor };
      const cellResult = (phonesColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Tel: 6015551234")).toBeInTheDocument();
    });

    it("columna phones renderiza '-' cuando todos los contactos están vacíos", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const phonesColumn = columns.find((col) => col.id === "phones");
      expect(phonesColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        phone: "",
        movil: "",
        email: null,
      });
      const mockRow = { original: doctor };
      const cellResult = (phonesColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("accessorFn de phones retorna concatenación de phone, movil y email", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const phonesColumn = columns.find((col) => col.id === "phones");
      expect((phonesColumn as any).accessorFn).toBeDefined();

      const doctor = createMockDoctor({
        phone: "6011111111",
        movil: "3022222222",
        email: "test@example.com",
      });
      const result = (phonesColumn as any).accessorFn(doctor);
      expect(result).toContain("6011111111");
      expect(result).toContain("3022222222");
      expect(result).toContain("test@example.com");
    });

    it("retorna columna secretary_name con accessorKey correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const secretaryColumn = columns.find(
        (col) => (col as any).accessorKey === "secretary_name"
      );
      expect(secretaryColumn).toBeDefined();
      expect(secretaryColumn?.header).toBe("Secretaria");
    });

    it("columna secretary_name renderiza el nombre cuando está presente", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const secretaryColumn = columns.find(
        (col) => (col as any).accessorKey === "secretary_name"
      );
      expect(secretaryColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ secretary_name: "Gloria" });
      const mockRow = { original: doctor };
      const cellResult = (secretaryColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Gloria")).toBeInTheDocument();
    });

    it("columna secretary_name renderiza '-' cuando está vacío", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const secretaryColumn = columns.find(
        (col) => (col as any).accessorKey === "secretary_name"
      );
      expect(secretaryColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ secretary_name: "" });
      const mockRow = { original: doctor };
      const cellResult = (secretaryColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna city con id correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn).toBeDefined();
      expect(cityColumn?.header).toBe("Ciudad");
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({
        city: { id: 2, name: "Medellín" },
      });
      const mockRow = { original: doctor };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Medellín")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es undefined", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect(cityColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ city: undefined });
      const mockRow = { original: doctor };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("accessorFn de city retorna el nombre de la ciudad", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const cityColumn = columns.find((col) => col.id === "city");
      expect((cityColumn as any).accessorFn).toBeDefined();

      const doctor = createMockDoctor({
        city: { id: 3, name: "Cali" },
      });
      expect((cityColumn as any).accessorFn(doctor)).toBe("Cali");
    });
  });

  // ──── Step 2: Test state column and actions gate ────
  describe("Columna state y gate de acciones (hasAccess)", () => {
    it("retorna columna state con id correcto", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeDefined();
      expect(stateColumn?.header).toBeDefined();
    });

    it("accessorFn de state retorna el valor numérico de state", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect((stateColumn as any).accessorFn).toBeDefined();

      const doctorActive = createMockDoctor({ state: 1 });
      const doctorInactive = createMockDoctor({ state: 2 });

      expect((stateColumn as any).accessorFn(doctorActive)).toBe(1);
      expect((stateColumn as any).accessorFn(doctorInactive)).toBe(2);
    });

    it("columna state renderiza badge 'Activo' con clases verdes para state=1", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ state: 1 });
      const mockRow = { original: doctor };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      const { container } = render(cellResult);
      expect(screen.getByText("Activo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-green-100");
    });

    it("columna state renderiza badge 'Inactivo' con clases rojas para state=2", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ state: 2 });
      const mockRow = { original: doctor };
      const cellResult = (stateColumn!.cell as any)({ row: mockRow });

      const { container } = render(cellResult);
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
      const badge = container.querySelector("span");
      expect(badge?.className).toContain("bg-red-100");
    });

    it("NO incluye columna actions cuando hasAccess=false", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: false,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeUndefined();
    });

    it("incluye columna actions cuando hasAccess=true", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeDefined();
    });

    it("columna actions renderiza link Ver cuando hasAccess=true", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ id: 5 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      expect(viewLink).toBeInTheDocument();
      expect(viewLink).toHaveAttribute("href", "/4dnn1n/doctors/5");
    });

    it("columna actions renderiza link Modificar cuando hasAccess=true", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.cell).toBeDefined();

      const doctor = createMockDoctor({ id: 5 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const editLink = screen.getByRole("link", { name: /modificar/i });
      expect(editLink).toBeInTheDocument();
      expect(editLink).toHaveAttribute("href", "/4dnn1n/doctors/5/edit");
    });

    it("columna actions renderiza botón toggle con título 'Inactivar' cuando state=1", () => {
      const onToggleMock = vi.fn();
      const columns = buildDoctorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      const doctor = createMockDoctor({ state: 1 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions renderiza botón toggle con título 'Activar' cuando state=2", () => {
      const onToggleMock = vi.fn();
      const columns = buildDoctorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      const doctor = createMockDoctor({ state: 2 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /activar/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it("toggle button invoca onToggleState con el doctor al hacer click", async () => {
      const onToggleMock = vi.fn();
      const columns = buildDoctorColumns({
        onToggleState: onToggleMock,
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      const doctor = createMockDoctor({ state: 1, id: 42 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });
      await userEvent.click(toggleButton);

      expect(onToggleMock).toHaveBeenCalledWith(doctor);
      expect(onToggleMock).toHaveBeenCalledTimes(1);
    });

    it("todos los botones (Eye, Pencil, Power) están presentes cuando hasAccess=true", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      const doctor = createMockDoctor({ id: 10, state: 1 });
      const mockRow = { original: doctor };
      const cellResult = (actionsColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      const viewLink = screen.getByRole("link", { name: /ver/i });
      const editLink = screen.getByRole("link", { name: /modificar/i });
      const toggleButton = screen.getByRole("button", { name: /inactivar/i });

      expect(viewLink).toBeInTheDocument();
      expect(editLink).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
    });

    it("columna actions tiene propiedades meta correctas cuando hasAccess=true", () => {
      const columns = buildDoctorColumns({
        onToggleState: vi.fn(),
        hasAccess: true,
      });

      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn?.meta).toEqual({ stickyRight: true });
    });
  });
});

describe("buildSpecialtyDoctorColumns", () => {
  // ──── Step 3: Test buildSpecialtyDoctorColumns (5 columns, no state, no actions) ────
  describe("Estructura sin estado ni acciones (read-only specialty view)", () => {
    it("retorna exactamente 5 columnas", () => {
      const columns = buildSpecialtyDoctorColumns();
      expect(columns).toHaveLength(5);
    });

    it("NO incluye columna state", () => {
      const columns = buildSpecialtyDoctorColumns();
      const stateColumn = columns.find((col) => col.id === "state");
      expect(stateColumn).toBeUndefined();
    });

    it("NO incluye columna actions", () => {
      const columns = buildSpecialtyDoctorColumns();
      const actionsColumn = columns.find((col) => col.id === "actions");
      expect(actionsColumn).toBeUndefined();
    });

    it("columnas son: full_name, secretary_name, phones, city, tarifa", () => {
      const columns = buildSpecialtyDoctorColumns();
      const columnIds = columns.map((col) => col.id || (col as any).accessorKey);

      expect(columnIds).toContain("full_name");
      expect(columnIds).toContain("secretary_name");
      expect(columnIds).toContain("phones");
      expect(columnIds).toContain("city");
      expect(columnIds).toContain("tarifa");
    });

    it("retorna columna full_name con id correcto", () => {
      const columns = buildSpecialtyDoctorColumns();
      const fullNameColumn = columns.find((col) => col.id === "full_name");

      expect(fullNameColumn).toBeDefined();
      expect(fullNameColumn?.header).toBe("Nombres");
    });

    it("columna full_name renderiza nombre y apellido concatenados", () => {
      const columns = buildSpecialtyDoctorColumns();
      const fullNameColumn = columns.find((col) => col.id === "full_name");

      const doctor = createMockDoctor({
        name: "Roberto",
        lastname: "Sánchez",
      });
      const mockRow = { original: doctor };
      const cellResult = (fullNameColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Roberto Sánchez")).toBeInTheDocument();
    });

    it("columna secretary_name renderiza el nombre cuando está presente", () => {
      const columns = buildSpecialtyDoctorColumns();
      const secretaryColumn = columns.find(
        (col) => (col as any).accessorKey === "secretary_name"
      );

      const doctor = createMockDoctor({ secretary_name: "Cecilia" });
      const mockRow = { original: doctor };
      const cellResult = (secretaryColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Cecilia")).toBeInTheDocument();
    });

    it("columna secretary_name renderiza '-' cuando está vacío", () => {
      const columns = buildSpecialtyDoctorColumns();
      const secretaryColumn = columns.find(
        (col) => (col as any).accessorKey === "secretary_name"
      );

      const doctor = createMockDoctor({ secretary_name: "" });
      const mockRow = { original: doctor };
      const cellResult = (secretaryColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("columna phones renderiza teléfono, celular y email cuando todos están presentes", () => {
      const columns = buildSpecialtyDoctorColumns();
      const phonesColumn = columns.find((col) => col.id === "phones");

      const doctor = createMockDoctor({
        phone: "6015551234",
        movil: "3019876543",
        email: "spec@example.com",
      });
      const mockRow = { original: doctor };
      const cellResult = (phonesColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Tel: 6015551234")).toBeInTheDocument();
      expect(screen.getByText("Cel: 3019876543")).toBeInTheDocument();
      expect(screen.getByText("spec@example.com")).toBeInTheDocument();
    });

    it("columna phones renderiza '-' cuando todos los contactos están vacíos", () => {
      const columns = buildSpecialtyDoctorColumns();
      const phonesColumn = columns.find((col) => col.id === "phones");

      const doctor = createMockDoctor({
        phone: "",
        movil: "",
        email: null,
      });
      const mockRow = { original: doctor };
      const cellResult = (phonesColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("columna city renderiza el nombre de la ciudad cuando existe", () => {
      const columns = buildSpecialtyDoctorColumns();
      const cityColumn = columns.find((col) => col.id === "city");

      const doctor = createMockDoctor({
        city: { id: 2, name: "Barranquilla" },
      });
      const mockRow = { original: doctor };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("Barranquilla")).toBeInTheDocument();
    });

    it("columna city renderiza '-' cuando city es undefined", () => {
      const columns = buildSpecialtyDoctorColumns();
      const cityColumn = columns.find((col) => col.id === "city");

      const doctor = createMockDoctor({ city: undefined });
      const mockRow = { original: doctor };
      const cellResult = (cityColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("-")).toBeInTheDocument();
    });

    it("retorna columna tarifa con id correcto", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      expect(tarifaColumn).toBeDefined();
      expect(tarifaColumn?.header).toBe("Tarifa");
    });

    it("columna tarifa renderiza formato moneda con toLocaleString cuando value_agreement=150000", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      const doctor = createMockDoctor({ value_agreement: 150000 });
      const mockRow = { original: doctor };
      const cellResult = (tarifaColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      // toLocaleString("es-CO") para 150000 produce "150.000"
      expect(screen.getByText("$150.000")).toBeInTheDocument();
    });

    it("columna tarifa renderiza '$0' cuando value_agreement=0", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      const doctor = createMockDoctor({ value_agreement: 0 });
      const mockRow = { original: doctor };
      const cellResult = (tarifaColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("$0")).toBeInTheDocument();
    });

    it("columna tarifa renderiza '$0' cuando value_agreement es undefined", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      const doctor = createMockDoctor({ value_agreement: 0 });
      doctor.value_agreement = undefined as any;
      const mockRow = { original: doctor };
      const cellResult = (tarifaColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("$0")).toBeInTheDocument();
    });

    it("accessorFn de tarifa retorna value_agreement del doctor", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      const doctor = createMockDoctor({ value_agreement: 250000 });
      expect((tarifaColumn as any).accessorFn(doctor)).toBe(250000);
    });

    it("columna tarifa renderiza '$250.000' cuando value_agreement=250000", () => {
      const columns = buildSpecialtyDoctorColumns();
      const tarifaColumn = columns.find((col) => col.id === "tarifa");

      const doctor = createMockDoctor({ value_agreement: 250000 });
      const mockRow = { original: doctor };
      const cellResult = (tarifaColumn!.cell as any)({ row: mockRow });

      render(cellResult);
      expect(screen.getByText("$250.000")).toBeInTheDocument();
    });
  });

  // ──---- Type checking ────
  describe("Seguridad de tipos en buildSpecialtyDoctorColumns", () => {
    it("retorna array de ColumnDef<ApiDoctor>[]", () => {
      const columns = buildSpecialtyDoctorColumns();

      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      const hasAccessorKeyOrId =
        (columns[0] as any).accessorKey !== undefined ||
        (columns[0] as any).id !== undefined;
      expect(hasAccessorKeyOrId).toBe(true);
    });
  });
});
