import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import SpecialtiesPage from "@/app/4dnn1n/doctors/specialties/page";
import { useAuth } from "@/context/AuthContext";
import { useClientTable } from "@/hooks/useClientTable";
import { useOptimisticToggle } from "@/hooks/useOptimisticToggle";
import type { ApiSpecialty } from "@/app/4dnn1n/doctors/specialties/fetch";

// NOTE (finding, verified against the real page): unlike every other list page
// in this phase, this page does NOT use `LoadingOverlay` — while `loading` is
// true it returns a bare "Cargando especialidades..." div with no DataTable at
// all. The "Volver a Médicos" link is always rendered regardless of
// `hasAccess`; only the "Crear Especialidad" toolbar button is gated.

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));

vi.mock("@/hooks/useClientTable", () => ({ useClientTable: vi.fn() }));

// Mocked so we can assert the exact `ApiSpecialty` row object handed to the
// toggle function returned by the hook, without exercising its real
// confirm/optimistic-update logic (already covered by the hook's own tests).
vi.mock("@/hooks/useOptimisticToggle", () => ({ useOptimisticToggle: vi.fn() }));

// Full `fetch.ts` module is mocked so no real `apiFetch` call ever fires from
// this page-level test.
vi.mock("@/app/4dnn1n/doctors/specialties/fetch", () => ({
  getSpecialties: vi.fn(),
  updateSpecialtyState: vi.fn(),
}));

// `DataTable` renders no real columns, so the stub below actually invokes the
// "actions" column's `cell()` (built by the already-tested `buildSpecialtyColumns`)
// for each row, and separately surfaces `toolbarActions` for the create-button
// assertions.
vi.mock("@/components/data-table/DataTable", () => ({
  DataTable: (props: any) => (
    <div data-testid="data-table">
      <div data-testid="toolbar-actions">{props.toolbarActions}</div>
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

function createMockSpecialty(overrides: Partial<ApiSpecialty> = {}): ApiSpecialty {
  return {
    id: 5,
    name: "Cardiología",
    state: 1,
    ...overrides,
  };
}

function mockAuth(type: number) {
  (useAuth as any).mockReturnValue({ user: { id: 1, type }, loading: false, isLoggingOut: false });
}

function mockClientTable(data: ApiSpecialty[] = [], loading = false) {
  const setData = vi.fn();
  (useClientTable as any).mockReturnValue({ data, setData, loading });
  return { setData };
}

describe("SpecialtiesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useOptimisticToggle as any).mockReturnValue(vi.fn());
  });

  // ──── Step 1: loading gate without LoadingOverlay ────
  describe("estado loading (sin LoadingOverlay)", () => {
    it("loading: true → sólo muestra 'Cargando especialidades...', sin DataTable", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([], true);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      expect(screen.getByText("Cargando especialidades...")).toBeInTheDocument();
      expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /volver a médicos/i })).not.toBeInTheDocument();
    });

    it("loading: false → DataTable visible", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      expect(screen.getByTestId("data-table")).toBeInTheDocument();
      expect(screen.queryByText("Cargando especialidades...")).not.toBeInTheDocument();
    });
  });

  // ──── Step 1 (cont.): "Volver a Médicos" always present regardless of hasAccess ────
  describe("link 'Volver a Médicos' independiente de hasAccess", () => {
    it("hasAccess: false (type 3) → el link sigue presente", () => {
      // Arrange
      mockAuth(3);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      const link = screen.getByRole("link", { name: /volver a médicos/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/doctors");
    });

    it("hasAccess: true (type 1) → el link también está presente", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      const link = screen.getByRole("link", { name: /volver a médicos/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/doctors");
    });
  });

  // ──── Step 1 (cont.): gate hasAccess for the "Crear Especialidad" button ────
  describe("gate hasAccess para el botón 'Crear Especialidad'", () => {
    it("hasAccess: true (type 1) → botón visible con el href correcto", () => {
      // Arrange
      mockAuth(1);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      const link = screen.getByRole("link", { name: /crear especialidad/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/doctors/specialties/new");
    });

    it("hasAccess: true (type 2) → botón también visible", () => {
      // Arrange
      mockAuth(2);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      const link = screen.getByRole("link", { name: /crear especialidad/i });
      expect(link).toHaveAttribute("href", "/4dnn1n/doctors/specialties/new");
    });

    it("hasAccess: false (type 3) → botón no renderizado", () => {
      // Arrange
      mockAuth(3);
      mockClientTable([]);

      // Act
      render(<SpecialtiesPage />);

      // Assert
      expect(screen.queryByRole("link", { name: /crear especialidad/i })).not.toBeInTheDocument();
    });
  });

  // ──── Step 1 (cont.): state toggle from the actions column ────
  describe("toggle de estado desde la columna de acciones", () => {
    it("al hacer click en el botón de estado, invoca la función de useOptimisticToggle con el ApiSpecialty de la fila", () => {
      // Arrange
      mockAuth(1);
      const specialty = createMockSpecialty({ id: 5 });
      mockClientTable([specialty]);
      const toggleFn = vi.fn();
      (useOptimisticToggle as any).mockReturnValue(toggleFn);

      // Act
      render(<SpecialtiesPage />);
      const row = screen.getByTestId("row-5");
      const toggleButton = row.querySelector("button") as HTMLButtonElement;
      toggleButton.click();

      // Assert
      expect(toggleFn).toHaveBeenCalledWith(specialty);
    });
  });
});
