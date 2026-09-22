import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DoctorsPage from "@/app/4dnn1n/doctors/page";
import { useAuth } from "@/context/AuthContext";
import { useServerTable } from "@/hooks/useServerTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import { getDoctors } from "@/app/4dnn1n/doctors/fetch";
import { getDepartments, getCitiesByDepartment } from "@/lib/geo";
import { getSpecialties } from "@/app/4dnn1n/doctors/specialties/fetch";
import type { ApiDoctor } from "@/app/4dnn1n/doctors/fetch";

// `useServerTable` already has dedicated coverage — it is mocked here so this
// test focuses on what actually belongs to the page: the advanced filters
// (department/city/specialty) and the LoadingOverlay gating.
vi.mock("@/hooks/useServerTable", () => ({ useServerTable: vi.fn() }));

// Mocked so we can assert the exact `ApiDoctor` row object handed to the
// toggle function returned by the hook, without exercising its real
// confirm/optimistic-update logic (already covered by the hook's own tests).
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/doctors/fetch", () => ({
  getDoctors: vi.fn(),
  updateDoctorState: vi.fn(),
}));

// Reused catalogs — same modules `DoctorForm` relies on.
vi.mock("@/lib/geo", () => ({
  getDepartments: vi.fn(),
  getCitiesByDepartment: vi.fn(),
}));

vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  getSpecialties: vi.fn(),
}));

// Stub that surfaces `isLoading` as a data attribute so the combined
// `tableProps.loading && isInitialLoad` condition can be asserted directly.
vi.mock("@/components/LoadingOverlay", () => ({
  LoadingOverlay: (props: any) => (
    <div data-testid="loading-overlay" data-loading={String(!!props.isLoading)} />
  ),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildDoctorColumns`)
// for each row, and separately surfaces `toolbarActions`/`extraFilters` for
// the assertions below.
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

function createMockDoctor(overrides: Partial<ApiDoctor> = {}): ApiDoctor {
  return {
    id: 5,
    name: "Carlos",
    lastname: "Pérez",
    specialty_id: 1,
    city_id: 1,
    phone: "6011234567",
    movil: "3001234567",
    email: "carlos@test.com",
    address: "Calle 1",
    secretary_name: "Ana",
    value_agreement: 100000,
    state: 1,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockServerTable({
  data = [] as ApiDoctor[],
  loading = false,
  isInitialLoad = false,
}: { data?: ApiDoctor[]; loading?: boolean; isInitialLoad?: boolean } = {}) {
  const setData = vi.fn();
  const setMeta = vi.fn();
  (useServerTable as any).mockReturnValue({
    data,
    setData,
    setMeta,
    stadeFilter: "1",
    tableProps: { data, loading },
    isInitialLoad,
  });
  return { setData, setMeta };
}

function lastServerTableOptions() {
  const calls = (useServerTable as any).mock.calls;
  return calls[calls.length - 1][1];
}

describe("DoctorsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOptimisticToggle as any).mockReturnValue(vi.fn());
    (getDepartments as any).mockResolvedValue([]);
    (getCitiesByDepartment as any).mockResolvedValue([]);
    (getSpecialties as any).mockResolvedValue([]);
  });

  // ──── Step 1: initial catalog loading ────
  describe("carga inicial de departamentos y especialidades", () => {
    it("llama getDepartments() y getSpecialties() al montar", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(getDepartments).toHaveBeenCalled();
      expect(getSpecialties).toHaveBeenCalled();
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("el datalist de especialidades sólo incluye las que tienen state === 1", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();
      (getSpecialties as any).mockResolvedValue([
        { id: 1, name: "Cardiología", state: 1 },
        { id: 2, name: "Dermatología", state: 0 },
        { id: 3, name: "Pediatría", state: 1 },
      ]);

      // Act
      const { container } = render(<DoctorsPage />);

      // Assert
      await waitFor(() => {
        const datalist = container.querySelector("#specialties-filter-list");
        expect(datalist?.querySelectorAll("option").length).toBe(2);
      });
      const optionValues = Array.from(
        container.querySelectorAll("#specialties-filter-list option"),
      ).map((o) => o.getAttribute("value"));
      expect(optionValues).toEqual(["Cardiología", "Pediatría"]);
    });
  });

  // ──── Step 1 (cont.): department → city cascade ────
  describe("filtro de departamento/ciudad", () => {
    it("sin departamento seleccionado, el select de ciudad está disabled", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.getByTitle("Filtrar por Ciudad")).toBeDisabled();
      expect(getCitiesByDepartment).not.toHaveBeenCalled();
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("al seleccionar un departamento, invoca getCitiesByDepartment(id) y habilita el select de ciudad", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();
      (getDepartments as any).mockResolvedValue([{ id: 7, name: "Antioquia" }]);
      (getCitiesByDepartment as any).mockResolvedValue([{ id: 1, name: "Medellín", department_id: 7 }]);

      render(<DoctorsPage />);
      await screen.findByRole("option", { name: "Antioquia" });

      // Act
      fireEvent.change(screen.getByTitle("Filtrar por Departamento"), { target: { value: "7" } });

      // Assert
      await waitFor(() => expect(getCitiesByDepartment).toHaveBeenCalledWith(7));
      await waitFor(() => expect(screen.getByTitle("Filtrar por Ciudad")).not.toBeDisabled());
    });
  });

  // ──── Step 1 (cont.): specialty filter by name (datalist) ────
  describe("filtro de especialidad (input + datalist)", () => {
    it("nombre que coincide (case-insensitive) fija filterSpecialtyId → pasado como extraParams.specialty_id", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();
      (getSpecialties as any).mockResolvedValue([{ id: 9, name: "Cardiología", state: 1 }]);

      render(<DoctorsPage />);
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());

      // Act
      fireEvent.change(screen.getByPlaceholderText("Especialidad (Todas)"), {
        target: { value: "cardiología" },
      });

      // Assert
      await waitFor(() => expect(lastServerTableOptions().extraParams.specialty_id).toBe(9));
    });

    it("nombre que no coincide con ninguna especialidad deja filterSpecialtyId en ''", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();
      (getSpecialties as any).mockResolvedValue([{ id: 9, name: "Cardiología", state: 1 }]);

      render(<DoctorsPage />);
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());

      // Act
      fireEvent.change(screen.getByPlaceholderText("Especialidad (Todas)"), {
        target: { value: "Neurología" },
      });

      // Assert
      await waitFor(() => expect(lastServerTableOptions().extraParams.specialty_id).toBeUndefined());
    });
  });

  // ──── Step 1 (cont.): isSuperAdmin gate for the "Gestionar Especialidades" button ────
  // Only the super admin (type 1) manages specialties — unlike most other doctor actions,
  // which type 2 also has access to.
  describe("gate isSuperAdmin para el botón 'Gestionar Especialidades'", () => {
    it("isSuperAdmin: true (type 1) → botón visible con el href correcto", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable();

      // Act
      render(<DoctorsPage />);

      // Assert
      const link = screen.getByRole("link", { name: /gestionar especialidades/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/doctors/specialties");
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("isSuperAdmin: false (type 2) → botón no renderizado", async () => {
      // Arrange
      mockAuth(2);
      mockServerTable();

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /gestionar especialidades/i })).not.toBeInTheDocument();
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("isSuperAdmin: false (type 3) → botón no renderizado", async () => {
      // Arrange
      mockAuth(3);
      mockServerTable();

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /gestionar especialidades/i })).not.toBeInTheDocument();
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });
  });

  // ──── Step 1 (cont.): state toggle from the actions column ────
  describe("toggle de estado desde la columna de acciones", () => {
    it("al hacer click en el botón de estado, invoca la función de useOptimisticToggle con el ApiDoctor de la fila", async () => {
      // Arrange
      mockAuth(1);
      const doctor = createMockDoctor({ id: 5 });
      mockServerTable({ data: [doctor] });
      const toggleFn = vi.fn();
      (useOptimisticToggle as any).mockReturnValue(toggleFn);

      // Act
      render(<DoctorsPage />);
      const row = screen.getByTestId("row-5");
      const toggleButton = row.querySelector("button") as HTMLButtonElement;
      toggleButton.click();

      // Assert
      expect(toggleFn).toHaveBeenCalledWith(doctor);
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });
  });

  // ──── Step 1 (cont.): LoadingOverlay = tableProps.loading && isInitialLoad ────
  describe("LoadingOverlay gating (loading && isInitialLoad combinados)", () => {
    it("loading: true, isInitialLoad: true → isLoading: true", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable({ loading: true, isInitialLoad: true });

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.getByTestId("loading-overlay")).toHaveAttribute("data-loading", "true");
      // Flush the pending catalog-fetch promises (and the state updates their
      // `.then` callbacks trigger) inside `act()` before the test ends.
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("loading: true, isInitialLoad: false → isLoading: false (no basta con loading solo)", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable({ loading: true, isInitialLoad: false });

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.getByTestId("loading-overlay")).toHaveAttribute("data-loading", "false");
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });

    it("loading: false, isInitialLoad: true → isLoading: false", async () => {
      // Arrange
      mockAuth(1);
      mockServerTable({ loading: false, isInitialLoad: true });

      // Act
      render(<DoctorsPage />);

      // Assert
      expect(screen.getByTestId("loading-overlay")).toHaveAttribute("data-loading", "false");
      await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
    });
  });

  // ──── fetchFn used with useServerTable ────
  it("pasa getDoctors como la función de fetch a useServerTable", async () => {
    // Arrange
    mockAuth(1);
    mockServerTable();

    // Act
    render(<DoctorsPage />);

    // Assert
    const calls = (useServerTable as any).mock.calls;
    expect(calls[calls.length - 1][0]).toBe(getDoctors);
    // Flush the pending catalog-fetch promises (and the state updates their
    // `.then` callbacks trigger) inside `act()` before the test ends.
    await waitFor(() => expect(getSpecialties).toHaveBeenCalled());
  });
});
