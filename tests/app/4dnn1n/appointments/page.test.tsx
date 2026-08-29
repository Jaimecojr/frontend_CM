import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AppointmentsPage from "@/app/4dnn1n/appointments/page";
import { useAuth } from "@/context/AuthContext";
import { useServerTable } from "@/hooks/useServerTable";
import { getAppointments, deleteAppointment } from "@/app/4dnn1n/appointments/fetch";
import { alert } from "@/lib/alert";
import type { ApiAppointment } from "@/app/4dnn1n/appointments/types";

// `useServerTable` already has dedicated coverage — it is mocked here so this
// test focuses on what actually belongs to the page: the date/period filter
// mutual-exclusion logic and the `onDelete` wiring.
vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/lib/alert", () => ({
  alert: { confirm: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/appointments/fetch", () => ({
  getAppointments: vi.fn(),
  deleteAppointment: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Flatpickr-based date picker replaced with a plain controlled input so the
// mutual-exclusion logic can be exercised without dealing with flatpickr's
// internal DOM lifecycle.
vi.mock("@/components/FormElements/DatePicker/DatePickerWithToday", () => ({
  default: ({ value, onChange, placeholder, disabled }: any) => (
    <input
      data-testid="date-input-stub"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// `DataTable` is a shared component tested on its own — it is stubbed here so
// this test can isolate the page's own responsibilities: permission gating,
// extra filters wiring, and the `onDelete` callback. The stub still invokes
// the real "actions" column's `cell()` (built by the already-tested
// `buildAppointmentColumns`) since that is the only way to reach `onDelete`,
// which is wired as a closure over the page's own state, not exposed as a
// page prop.
vi.mock("@/components/data-table/DataTable", () => ({
  DataTable: (props: any) => (
    <div data-testid="data-table">
      <div data-testid="toolbar-actions">{props.toolbarActions}</div>
      <div data-testid="extra-filters">{props.extraFilters}</div>
      {props.data?.map((item: any) => {
        const actionsColumn = props.columns?.find((col: any) => col.id === "actions");
        return (
          <div key={item.id} data-testid={`row-${item.id}`}>
            {actionsColumn?.cell?.({ row: { original: item } })}
          </div>
        );
      })}
    </div>
  ),
}));

function createMockAppointment(overrides: Partial<ApiAppointment> = {}): ApiAppointment {
  return {
    id: 1,
    afi_code: 123,
    doctor_id: 1,
    // Fixed far-future date so the "past" check in the actions column never
    // hides the edit/delete buttons regardless of when this test runs.
    date: "2099-01-01",
    hour: "10:00",
    address: "Carrera 7 #45-67",
    city_id: 1,
    phone: "3001234567",
    value: 150000,
    type: 1,
    name: "Juan García",
    user_id: 1,
    doctor: { id: 1, name: "Carlos", lastname: "Pérez" },
    city: { id: 1, name: "Bogotá" },
    owner: null,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({
    user: { id: 1, name: "Ana", email: "ana@test.com", user: "ana", type },
    loading: false,
    isLoggingOut: false,
  });
}

function mockServerTable(data: ApiAppointment[] = []) {
  const setData = vi.fn();
  const setMeta = vi.fn();
  (useServerTable as any).mockReturnValue({
    setData,
    setMeta,
    tableProps: { data, loading: false },
    isInitialLoad: false,
  });
  return { setData, setMeta };
}

function lastServerTableOptions() {
  const calls = (useServerTable as any).mock.calls;
  return calls[calls.length - 1][1];
}

describe("AppointmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ──── Step 1: mutua exclusión de filtros fecha/período ────
  describe("filtros de fecha/período", () => {
    it("estado inicial: defaultStade='all' y extraParams={date: undefined, period: 'pending'}", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);

      // Act
      render(<AppointmentsPage />);

      // Assert
      const calls = (useServerTable as any).mock.calls;
      const [fetchFnArg, options] = calls[calls.length - 1];
      expect(fetchFnArg).toBe(getAppointments);
      expect(options).toEqual({
        defaultStade: "all",
        extraParams: { date: undefined, period: "pending" },
      });
    });

    it("al seleccionar una fecha, extraParams pasa a {date, period: undefined}", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);
      render(<AppointmentsPage />);

      // Act
      fireEvent.change(screen.getByTestId("date-input-stub"), {
        target: { value: "2026-06-01" },
      });

      // Assert
      const options = lastServerTableOptions();
      expect(options.extraParams).toEqual({ date: "2026-06-01", period: undefined });
    });

    it("al limpiar la fecha, extraParams vuelve a {date: undefined, period: filterPeriod}", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);
      render(<AppointmentsPage />);
      fireEvent.change(screen.getByTestId("date-input-stub"), {
        target: { value: "2026-06-01" },
      });

      // Act
      fireEvent.click(screen.getByTitle("Limpiar fecha"));

      // Assert
      const options = lastServerTableOptions();
      expect(options.extraParams).toEqual({ date: undefined, period: "pending" });
    });

    it("el select de período queda deshabilitado mientras hay una fecha activa", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);
      render(<AppointmentsPage />);

      // Act
      fireEvent.change(screen.getByTestId("date-input-stub"), {
        target: { value: "2026-06-01" },
      });

      // Assert
      expect(screen.getByTitle("Filtrar por período")).toBeDisabled();
    });

    it("sin fecha activa, el select de período NO está deshabilitado y cambia filterPeriod", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);
      render(<AppointmentsPage />);
      const select = screen.getByTitle("Filtrar por período");
      expect(select).not.toBeDisabled();

      // Act
      fireEvent.change(select, { target: { value: "past" } });

      // Assert
      const options = lastServerTableOptions();
      expect(options.extraParams).toEqual({ date: undefined, period: "past" });
    });
  });

  // ──── Step 1 (cont.): onDelete ────
  describe("flujo de onDelete", () => {
    it("confirma, elimina la cita, filtra data y decrementa el total en 1", async () => {
      // Arrange
      const appointment = createMockAppointment({ id: 42, name: "Carlos" });
      mockAuth(1);
      const { setData, setMeta } = mockServerTable([appointment]);
      (deleteAppointment as any).mockResolvedValue(undefined);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<AppointmentsPage />);

      // Act
      const deleteButton = screen.getByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButton);

      // Assert
      await waitFor(() => expect(deleteAppointment).toHaveBeenCalledWith(42));
      await waitFor(() => expect(alert.success).toHaveBeenCalled());

      expect(setData).toHaveBeenCalled();
      const dataUpdater = (setData as any).mock.calls[0][0];
      expect(dataUpdater([appointment])).toEqual([]);

      expect(setMeta).toHaveBeenCalled();
      const metaUpdater = (setMeta as any).mock.calls[0][0];
      expect(metaUpdater({ current_page: 1, last_page: 1, per_page: 20, total: 5 })).toEqual({
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 4,
      });
    });

    it("si el usuario cancela la confirmación, no elimina ni actualiza datos", async () => {
      // Arrange
      const appointment = createMockAppointment({ id: 43 });
      mockAuth(1);
      const { setData, setMeta } = mockServerTable([appointment]);
      (alert.confirm as any).mockResolvedValue(false);

      render(<AppointmentsPage />);

      // Act
      const deleteButton = screen.getByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButton);

      // Assert
      await waitFor(() => expect(alert.confirm).toHaveBeenCalled());
      expect(deleteAppointment).not.toHaveBeenCalled();
      expect(setData).not.toHaveBeenCalled();
      expect(setMeta).not.toHaveBeenCalled();
      expect(alert.success).not.toHaveBeenCalled();
    });

    it("si deleteAppointment rechaza, llama alert.error y no actualiza datos", async () => {
      // Arrange
      const appointment = createMockAppointment({ id: 44 });
      mockAuth(1);
      const { setData } = mockServerTable([appointment]);
      const apiError = { data: { message: "No se pudo eliminar" } };
      (deleteAppointment as any).mockRejectedValue(apiError);
      (alert.confirm as any).mockImplementation(async ({ onConfirm }: any) => {
        if (onConfirm) await onConfirm();
        return true;
      });

      render(<AppointmentsPage />);

      // Act
      const deleteButton = screen.getByRole("button", { name: /eliminar/i });
      await userEvent.click(deleteButton);

      // Assert
      await waitFor(() =>
        expect(alert.error).toHaveBeenCalledWith("Error", "No se pudo eliminar"),
      );
      expect(setData).not.toHaveBeenCalled();
    });
  });

  // ──── Toolbar: gate de permisos para "Crear Cita" ────
  describe("Toolbar: gate de permisos", () => {
    it("no renderiza el botón 'Crear Cita' cuando el usuario no tiene acceso (type: 3)", () => {
      // Arrange
      mockAuth(3);
      mockServerTable([]);

      // Act
      render(<AppointmentsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear cita/i })).not.toBeInTheDocument();
    });

    it("renderiza el botón 'Crear Cita' con el href correcto cuando el usuario tiene acceso (type: 1)", () => {
      // Arrange
      mockAuth(1);
      mockServerTable([]);

      // Act
      render(<AppointmentsPage />);

      // Assert
      const createLink = screen.getByRole("link", { name: /crear cita/i });
      expect(createLink).toHaveAttribute("href", "/4dnn1n/appointments/new");
    });
  });
});
